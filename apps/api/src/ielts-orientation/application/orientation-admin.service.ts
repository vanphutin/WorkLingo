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
  adminOrientationSchema,
  orientationContentSchema,
  orientationValidationResultSchema,
  type AdminOrientationDto,
  type OrientationContent,
  type OrientationValidationResult,
  type PublishOrientationInput,
  type PublishOrientationResult,
  type ValidateOrientationDraftInput,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { validateOrientationContent } from '../domain/orientation-validation.js';

const ORIENTATION_SLUG = 'ielts-orientation';
const PUBLISH_OPERATION = 'publish-ielts-orientation';

@Injectable()
export class OrientationAdminService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async get(): Promise<AdminOrientationDto> {
    const orientation = await this.database.ieltsOrientation.findUnique({
      where: { slug: ORIENTATION_SLUG },
      include: {
        currentPublishedVersion: true,
        versions: { orderBy: [{ version: 'desc' }, { id: 'asc' }] },
      },
    });
    if (!orientation) throw new NotFoundException('IELTS orientation has not been configured.');
    return this.toAdminDto(orientation);
  }

  async updateDraft(input: { expectedRevision: number; content: unknown }): Promise<AdminOrientationDto> {
    const parsed = orientationContentSchema.safeParse(input.content);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_ORIENTATION_CONTENT',
        message: 'IELTS orientation content is invalid.',
        details: parsed.error.issues,
      });
    }
    await this.database.$transaction(async (transaction) => {
      await this.lock(transaction);
      const orientation = await this.requireOrientation(transaction);
      this.requireRevision(orientation.draftRevision, input.expectedRevision);
      await transaction.ieltsOrientation.update({
        where: { id: orientation.id },
        data: {
          draftContent: parsed.data as Prisma.InputJsonValue,
          draftRevision: { increment: 1 },
          status: 'DRAFT',
        },
      });
    });
    return this.get();
  }

  async validate(input: ValidateOrientationDraftInput): Promise<OrientationValidationResult> {
    return this.database.$transaction(async (transaction) => {
      await this.lock(transaction);
      const orientation = await this.requireOrientation(transaction);
      this.requireRevision(orientation.draftRevision, input.expectedRevision);
      const assets = await transaction.orientationMediaAsset.findMany({
        where: { orientationId: orientation.id }, select: { id: true },
      });
      const issues = validateOrientationContent(
        orientation.draftContent,
        new Set(assets.map((asset) => asset.id)),
      );
      const status = issues.length === 0 ? 'VALIDATED' : 'DRAFT';
      await transaction.ieltsOrientation.update({
        where: { id: orientation.id }, data: { status },
      });
      return orientationValidationResultSchema.parse({
        draftRevision: orientation.draftRevision,
        status,
        canPublish: issues.length === 0,
        issues,
      });
    });
  }

  async publish(actorId: string, input: PublishOrientationInput): Promise<PublishOrientationResult> {
    const requestHash = this.hash(input);
    const replay = await this.readReceipt(actorId, input.idempotencyKey, requestHash);
    if (replay) return replay;

    return this.database.$transaction(async (transaction) => {
      await this.lock(transaction);
      const receipt = await transaction.mutationReceipt.findUnique({
        where: { actorId_operation_idempotencyKey: {
          actorId, operation: PUBLISH_OPERATION, idempotencyKey: input.idempotencyKey,
        } },
      });
      if (receipt) return this.parseReceipt(receipt.requestHash, requestHash, receipt.responseBody);

      const orientation = await this.requireOrientation(transaction);
      this.requireRevision(orientation.draftRevision, input.expectedRevision);
      const assets = await transaction.orientationMediaAsset.findMany({
        where: { orientationId: orientation.id }, select: { id: true },
      });
      const issues = validateOrientationContent(
        orientation.draftContent,
        new Set(assets.map((asset) => asset.id)),
      );
      if (issues.length > 0) {
        throw new UnprocessableEntityException({
          code: 'ORIENTATION_VALIDATION_FAILED',
          message: 'Fix IELTS orientation validation issues before publishing.',
          details: issues,
        });
      }
      const content = orientationContentSchema.parse(orientation.draftContent);
      const latest = await transaction.ieltsOrientationVersion.findFirst({
        where: { orientationId: orientation.id }, orderBy: { version: 'desc' },
      });
      const publishedAt = new Date();
      const version = await transaction.ieltsOrientationVersion.create({
        data: {
          orientationId: orientation.id,
          version: (latest?.version ?? 0) + 1,
          title: content.title,
          sourceHash: this.hash(content),
          content: content as Prisma.InputJsonValue,
          publishedAt,
        },
      });
      if (orientation.currentPublishedVersionId) {
        await transaction.ieltsOrientationVersion.update({
          where: { id: orientation.currentPublishedVersionId },
          data: { status: 'ARCHIVED', archivedAt: publishedAt },
        });
      }
      await transaction.ieltsOrientation.update({
        where: { id: orientation.id },
        data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' },
      });
      const response: PublishOrientationResult = {
        orientationId: orientation.id,
        orientationVersionId: version.id,
        version: version.version,
        publishedAt: publishedAt.toISOString(),
      };
      await transaction.auditLog.create({ data: {
        actorId, action: 'PUBLISH_IELTS_ORIENTATION', resourceType: 'IeltsOrientationVersion',
        resourceId: version.id,
        oldState: { currentPublishedVersionId: orientation.currentPublishedVersionId },
        newState: { currentPublishedVersionId: version.id, version: version.version },
        metadata: { orientationId: orientation.id },
      } });
      await transaction.mutationReceipt.create({ data: {
        actorId, operation: PUBLISH_OPERATION, idempotencyKey: input.idempotencyKey,
        requestHash, responseStatus: 201,
        responseBody: response as unknown as Prisma.InputJsonValue,
      } });
      return response;
    }, { timeout: 15_000 });
  }

  async archive(actorId: string): Promise<AdminOrientationDto> {
    await this.database.$transaction(async (transaction) => {
      await this.lock(transaction);
      const orientation = await this.requireOrientation(transaction);
      if (orientation.currentPublishedVersionId) {
        await transaction.ieltsOrientationVersion.update({
          where: { id: orientation.currentPublishedVersionId },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
      }
      await transaction.ieltsOrientation.update({
        where: { id: orientation.id },
        data: { currentPublishedVersionId: null, status: 'ARCHIVED' },
      });
      await transaction.auditLog.create({ data: {
        actorId, action: 'ARCHIVE_IELTS_ORIENTATION', resourceType: 'IeltsOrientation',
        resourceId: orientation.id,
        oldState: { currentPublishedVersionId: orientation.currentPublishedVersionId },
        newState: { currentPublishedVersionId: null },
      } });
    });
    return this.get();
  }

  private async lock(transaction: Prisma.TransactionClient): Promise<void> {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:ielts-orientation'))`;
  }

  private async requireOrientation(transaction: Prisma.TransactionClient) {
    const orientation = await transaction.ieltsOrientation.findUnique({ where: { slug: ORIENTATION_SLUG } });
    if (!orientation) throw new NotFoundException('IELTS orientation has not been configured.');
    return orientation;
  }

  private requireRevision(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new ConflictException({
        code: 'ORIENTATION_REVISION_STALE',
        message: 'IELTS orientation draft changed. Refresh before retrying.',
      });
    }
  }

  private hash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async readReceipt(actorId: string, idempotencyKey: string, requestHash: string) {
    const receipt = await this.database.mutationReceipt.findUnique({
      where: { actorId_operation_idempotencyKey: { actorId, operation: PUBLISH_OPERATION, idempotencyKey } },
    });
    return receipt ? this.parseReceipt(receipt.requestHash, requestHash, receipt.responseBody) : null;
  }

  private parseReceipt(storedHash: string, requestHash: string, body: Prisma.JsonValue) {
    if (storedHash !== requestHash) {
      throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key reused with different input.' });
    }
    return body as unknown as PublishOrientationResult;
  }

  private toAdminDto(orientation: {
    id: string; slug: string; status: string; draftRevision: number; draftContent: Prisma.JsonValue;
    updatedAt: Date; currentPublishedVersion: { id: string; version: number; publishedAt: Date; status: string } | null;
    versions: Array<{ id: string; version: number; publishedAt: Date; status: string }>;
  }): AdminOrientationDto {
    const summarize = (version: NonNullable<typeof orientation.currentPublishedVersion>) => ({
      id: version.id, version: version.version, publishedAt: version.publishedAt.toISOString(), status: version.status,
    });
    return adminOrientationSchema.parse({
      id: orientation.id,
      slug: orientation.slug,
      status: orientation.status,
      draftRevision: orientation.draftRevision,
      draft: orientation.draftContent as unknown as OrientationContent,
      currentPublishedVersion: orientation.currentPublishedVersion ? summarize(orientation.currentPublishedVersion) : null,
      versions: orientation.versions.map(summarize),
      updatedAt: orientation.updatedAt.toISOString(),
    });
  }
}
