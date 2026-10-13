import { createHash } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  adminIeltsBridgeModuleSchema,
  ieltsBridgeModuleContentSchema,
  ieltsBridgeValidationResultSchema,
  type AdminIeltsBridgeModuleDto,
  type IeltsBridgeCommandInput,
  type IeltsBridgeModuleContent,
  type IeltsBridgeValidationResult,
  type PublishIeltsBridgeResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';

const PUBLISH_OPERATION = 'publish-ielts-bridge';

interface SaveDraftRequest {
  readonly expectedRevision: number | null;
  readonly idempotencyKey: string;
  readonly content: unknown;
}

@Injectable()
export class IeltsBridgeAdminService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async list(): Promise<AdminIeltsBridgeModuleDto[]> {
    const modules = await this.database.ieltsBridgeModule.findMany({
      include: { currentPublishedVersion: true, versions: { orderBy: [{ version: 'desc' }, { id: 'asc' }] } },
      orderBy: { slug: 'asc' },
    });
    return modules.map((module) => this.toAdminDto(module));
  }

  async get(moduleId: string): Promise<AdminIeltsBridgeModuleDto> {
    const module = await this.database.ieltsBridgeModule.findUnique({
      where: { id: moduleId },
      include: { currentPublishedVersion: true, versions: { orderBy: [{ version: 'desc' }, { id: 'asc' }] } },
    });
    if (!module) throw new NotFoundException('IELTS Bridge module was not found.');
    return this.toAdminDto(module);
  }

  async saveDraft(actorId: string, moduleId: string | null, input: SaveDraftRequest): Promise<AdminIeltsBridgeModuleDto> {
    const parsed = ieltsBridgeModuleContentSchema.safeParse(input.content);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_IELTS_BRIDGE_CONTENT', message: 'IELTS Bridge module content is invalid.', details: parsed.error.issues,
      });
    }
    const content = parsed.data;
    const operation = `save-ielts-bridge:${moduleId ?? content.questionType}`;
    const requestHash = this.hash(input);
    const replay = await this.database.mutationReceipt.findUnique({
      where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } },
    });
    if (replay) {
      const body = this.parseReceipt<{ moduleId: string }>(replay.requestHash, requestHash, replay.responseBody);
      return this.get(body.moduleId);
    }
    const savedId = await this.database.$transaction(async (transaction) => {
      await this.lock(transaction, moduleId ?? content.questionType);
      const receipt = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: {
        actorId, operation, idempotencyKey: input.idempotencyKey,
      } } });
      if (receipt) return this.parseReceipt<{ moduleId: string }>(receipt.requestHash, requestHash, receipt.responseBody).moduleId;
      let savedId: string;
      if (moduleId === null) {
        if (input.expectedRevision !== null) {
          throw new BadRequestException('New IELTS Bridge modules must not provide an expected revision.');
        }
        const created = await transaction.ieltsBridgeModule.create({ data: {
          slug: content.questionType.replaceAll('_', '-'), draftContent: content as Prisma.InputJsonValue,
        } });
        await transaction.auditLog.create({ data: {
          actorId, action: 'CREATE_IELTS_BRIDGE_MODULE', resourceType: 'IeltsBridgeModule', resourceId: created.id,
          newState: { draftRevision: created.draftRevision, questionType: content.questionType },
        } });
        savedId = created.id;
      } else {
        if (input.expectedRevision === null) {
          throw new BadRequestException('Existing IELTS Bridge modules require an expected revision.');
        }
        const module = await this.requireModule(transaction, moduleId);
        this.requireRevision(module.draftRevision, input.expectedRevision);
        await transaction.ieltsBridgeModule.update({ where: { id: module.id }, data: {
          draftContent: content as Prisma.InputJsonValue, draftRevision: { increment: 1 }, status: 'DRAFT',
        } });
        await transaction.auditLog.create({ data: {
          actorId, action: 'UPDATE_IELTS_BRIDGE_DRAFT', resourceType: 'IeltsBridgeModule', resourceId: module.id,
          oldState: { draftRevision: module.draftRevision }, newState: { draftRevision: module.draftRevision + 1 },
        } });
        savedId = module.id;
      }
      await transaction.mutationReceipt.create({ data: {
        actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: moduleId === null ? 201 : 200,
        responseBody: { moduleId: savedId },
      } });
      return savedId;
    });
    return this.get(savedId);
  }

  async validate(moduleId: string, input: IeltsBridgeCommandInput): Promise<IeltsBridgeValidationResult> {
    return this.database.$transaction(async (transaction) => {
      await this.lock(transaction, moduleId);
      const module = await this.requireModule(transaction, moduleId);
      this.requireRevision(module.draftRevision, input.expectedRevision);
      const parsed = ieltsBridgeModuleContentSchema.safeParse(module.draftContent);
      const issues = parsed.success ? [] : parsed.error.issues.map((issue) => ({
        code: 'INVALID_CONTENT', path: issue.path.join('.') || 'content', message: issue.message,
      }));
      const status = issues.length === 0 ? 'VALIDATED' : 'DRAFT';
      await transaction.ieltsBridgeModule.update({ where: { id: module.id }, data: { status } });
      return ieltsBridgeValidationResultSchema.parse({
        moduleId: module.id, draftRevision: module.draftRevision, status, canPublish: issues.length === 0, issues,
      });
    });
  }

  async publish(actorId: string, moduleId: string, input: IeltsBridgeCommandInput): Promise<PublishIeltsBridgeResult> {
    const operation = `${PUBLISH_OPERATION}:${moduleId}`;
    const requestHash = this.hash(input);
    const replay = await this.readReceipt(actorId, operation, input.idempotencyKey, requestHash);
    if (replay) return replay;

    return this.database.$transaction(async (transaction) => {
      await this.lock(transaction, moduleId);
      const receipt = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: {
        actorId, operation, idempotencyKey: input.idempotencyKey,
      } } });
      if (receipt) return this.parseReceipt<PublishIeltsBridgeResult>(receipt.requestHash, requestHash, receipt.responseBody);

      const module = await this.requireModule(transaction, moduleId);
      this.requireRevision(module.draftRevision, input.expectedRevision);
      const parsed = ieltsBridgeModuleContentSchema.safeParse(module.draftContent);
      if (!parsed.success) {
        throw new UnprocessableEntityException({
          code: 'IELTS_BRIDGE_VALIDATION_FAILED', message: 'Fix IELTS Bridge validation issues before publishing.',
          details: parsed.error.issues,
        });
      }
      const content = parsed.data;
      const latest = await transaction.ieltsBridgeModuleVersion.findFirst({
        where: { moduleId }, orderBy: { version: 'desc' },
      });
      const publishedAt = new Date();
      const version = await transaction.ieltsBridgeModuleVersion.create({ data: {
        moduleId, version: (latest?.version ?? 0) + 1, title: content.title, skill: content.skill.toUpperCase(),
        questionType: content.questionType, required: content.required, sourceHash: this.hash(content),
        content: content as Prisma.InputJsonValue, publishedAt,
      } });
      if (module.currentPublishedVersionId) {
        await transaction.ieltsBridgeModuleVersion.update({
          where: { id: module.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: publishedAt },
        });
      }
      await transaction.ieltsBridgeModule.update({
        where: { id: moduleId }, data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' },
      });
      const response: PublishIeltsBridgeResult = {
        moduleId, moduleVersionId: version.id, version: version.version, publishedAt: publishedAt.toISOString(),
      };
      await transaction.auditLog.create({ data: {
        actorId, action: 'PUBLISH_IELTS_BRIDGE_MODULE', resourceType: 'IeltsBridgeModuleVersion', resourceId: version.id,
        oldState: { currentPublishedVersionId: module.currentPublishedVersionId },
        newState: { currentPublishedVersionId: version.id, version: version.version }, metadata: { moduleId },
      } });
      await transaction.mutationReceipt.create({ data: {
        actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 201,
        responseBody: response as unknown as Prisma.InputJsonValue,
      } });
      return response;
    }, { timeout: 15_000 });
  }

  async archive(actorId: string, moduleId: string): Promise<AdminIeltsBridgeModuleDto> {
    await this.database.$transaction(async (transaction) => {
      await this.lock(transaction, moduleId);
      const module = await this.requireModule(transaction, moduleId);
      if (module.currentPublishedVersionId) {
        await transaction.ieltsBridgeModuleVersion.update({
          where: { id: module.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
      }
      await transaction.ieltsBridgeModule.update({
        where: { id: module.id }, data: { currentPublishedVersionId: null, status: 'ARCHIVED' },
      });
      await transaction.auditLog.create({ data: {
        actorId, action: 'ARCHIVE_IELTS_BRIDGE_MODULE', resourceType: 'IeltsBridgeModule', resourceId: module.id,
        oldState: { currentPublishedVersionId: module.currentPublishedVersionId }, newState: { currentPublishedVersionId: null },
      } });
    });
    return this.get(moduleId);
  }

  private async lock(transaction: Prisma.TransactionClient, key: string): Promise<void> {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'worklingo:ielts-bridge:' + key}))`;
  }

  private async requireModule(transaction: Prisma.TransactionClient, moduleId: string) {
    const module = await transaction.ieltsBridgeModule.findUnique({ where: { id: moduleId } });
    if (!module) throw new NotFoundException('IELTS Bridge module was not found.');
    return module;
  }

  private requireRevision(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new ConflictException({ code: 'IELTS_BRIDGE_REVISION_STALE', message: 'IELTS Bridge draft changed. Refresh before retrying.' });
    }
  }

  private hash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async readReceipt(actorId: string, operation: string, idempotencyKey: string, requestHash: string): Promise<PublishIeltsBridgeResult | null> {
    const receipt = await this.database.mutationReceipt.findUnique({
      where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey } },
    });
    return receipt ? this.parseReceipt<PublishIeltsBridgeResult>(receipt.requestHash, requestHash, receipt.responseBody) : null;
  }

  private parseReceipt<T>(storedHash: string, requestHash: string, body: Prisma.JsonValue): T {
    if (storedHash !== requestHash) {
      throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key reused with different input.' });
    }
    return body as unknown as T;
  }

  private toAdminDto(module: {
    id: string; slug: string; status: string; draftRevision: number; draftContent: Prisma.JsonValue; updatedAt: Date;
    currentPublishedVersion: { id: string; version: number; publishedAt: Date; status: string } | null;
    versions: Array<{ id: string; version: number; publishedAt: Date; status: string }>;
  }): AdminIeltsBridgeModuleDto {
    const summarize = (version: NonNullable<typeof module.currentPublishedVersion>) => ({
      id: version.id, version: version.version, publishedAt: version.publishedAt.toISOString(), status: version.status,
    });
    return adminIeltsBridgeModuleSchema.parse({
      id: module.id, slug: module.slug, status: module.status, draftRevision: module.draftRevision,
      draft: module.draftContent as unknown as IeltsBridgeModuleContent,
      currentPublishedVersion: module.currentPublishedVersion ? summarize(module.currentPublishedVersion) : null,
      versions: module.versions.map(summarize), updatedAt: module.updatedAt.toISOString(),
    });
  }
}
