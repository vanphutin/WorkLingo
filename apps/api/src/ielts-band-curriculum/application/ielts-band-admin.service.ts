import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  adminIeltsBandCurriculumSchema, ieltsBandCurriculumContentSchema, ieltsBandCurriculumValidationSchema,
  publishIeltsBandCurriculumResultSchema, type AdminIeltsBandCurriculumDto, type IeltsBandCurriculumCommandInput,
  type IeltsBandCurriculumValidation, type PublishIeltsBandCurriculumResult,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';

type CurriculumRecord = Prisma.IeltsBandCurriculumGetPayload<{ include: { currentPublishedVersion: true; versions: true } }>;
type VersionRecord = Prisma.IeltsBandCurriculumVersionGetPayload<Record<string, never>>;
interface SaveRequest { expectedRevision: number; idempotencyKey: string; content: unknown }

@Injectable()
export class IeltsBandAdminService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async get(): Promise<AdminIeltsBandCurriculumDto> {
    const curriculum = await this.database.ieltsBandCurriculum.findFirst({ include: { currentPublishedVersion: true, versions: { orderBy: { version: 'desc' } } } });
    if (!curriculum) throw new NotFoundException('IELTS band curriculum was not found.');
    return this.toDto(curriculum);
  }

  async save(actorId: string, input: SaveRequest): Promise<AdminIeltsBandCurriculumDto> {
    const content = ieltsBandCurriculumContentSchema.parse(input.content);
    await this.database.$transaction(async (transaction) => {
      const operation = 'save-ielts-band-curriculum'; const requestHash = this.hash(input);
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-band-curriculum'}))`;
      const replay = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key was reused with another request.'); return; }
      const curriculum = await transaction.ieltsBandCurriculum.findUnique({ where: { slug: 'ielts-band-pathway' } });
      if (!curriculum) throw new NotFoundException('IELTS band curriculum was not found.');
      if (curriculum.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS band curriculum revision is stale.');
      const updated = await transaction.ieltsBandCurriculum.updateMany({ where: { id: curriculum.id, draftRevision: input.expectedRevision }, data: { draftContent: content as Prisma.InputJsonValue, draftRevision: { increment: 1 }, status: 'DRAFT' } });
      if (updated.count !== 1) throw new ConflictException('IELTS band curriculum revision is stale.');
      await transaction.auditLog.create({ data: { actorId, action: 'UPDATE_IELTS_BAND_CURRICULUM', resourceType: 'IeltsBandCurriculum', resourceId: curriculum.id, metadata: { stageCount: content.stages.length } } });
      await transaction.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 200, responseBody: { curriculumId: curriculum.id } } });
    });
    return this.get();
  }

  async validate(input: IeltsBandCurriculumCommandInput): Promise<IeltsBandCurriculumValidation> {
    const curriculum = await this.database.ieltsBandCurriculum.findFirst();
    if (!curriculum) throw new NotFoundException('IELTS band curriculum was not found.');
    if (curriculum.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS band curriculum revision is stale.');
    const parsed = ieltsBandCurriculumContentSchema.safeParse(curriculum.draftContent);
    const issues = parsed.success ? [] : parsed.error.issues.map((issue) => ({ code: 'INVALID_BAND_CURRICULUM', path: issue.path.join('.'), message: issue.message }));
    const status = issues.length ? 'DRAFT' as const : 'VALIDATED' as const;
    await this.database.ieltsBandCurriculum.update({ where: { id: curriculum.id }, data: { status } });
    return ieltsBandCurriculumValidationSchema.parse({ curriculumId: curriculum.id, draftRevision: curriculum.draftRevision, status, canPublish: !issues.length, issues });
  }

  async publish(actorId: string, input: IeltsBandCurriculumCommandInput): Promise<PublishIeltsBandCurriculumResult> {
    const operation = 'publish-ielts-band-curriculum'; const requestHash = this.hash(input);
    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-band-curriculum'}))`;
      const replay = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (replay) {
        if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key was reused with another request.');
        return publishIeltsBandCurriculumResultSchema.parse(replay.responseBody);
      }
      const curriculum = await transaction.ieltsBandCurriculum.findUnique({ where: { slug: 'ielts-band-pathway' }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
      if (!curriculum) throw new NotFoundException('IELTS band curriculum was not found.');
      if (curriculum.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS band curriculum revision is stale.');
      const content = ieltsBandCurriculumContentSchema.parse(curriculum.draftContent); const publishedAt = new Date();
      const version = await transaction.ieltsBandCurriculumVersion.create({ data: { curriculumId: curriculum.id, version: (curriculum.versions[0]?.version ?? 0) + 1, sourceHash: this.hash(content), content: content as Prisma.InputJsonValue, publishedAt } });
      if (curriculum.currentPublishedVersionId) await transaction.ieltsBandCurriculumVersion.update({ where: { id: curriculum.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: publishedAt } });
      await transaction.ieltsBandCurriculum.update({ where: { id: curriculum.id }, data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' } });
      await transaction.auditLog.create({ data: { actorId, action: 'PUBLISH_IELTS_BAND_CURRICULUM', resourceType: 'IeltsBandCurriculumVersion', resourceId: version.id, metadata: { curriculumId: curriculum.id, stageCount: content.stages.length } } });
      const response = publishIeltsBandCurriculumResultSchema.parse({ curriculumId: curriculum.id, curriculumVersionId: version.id, version: version.version, publishedAt: publishedAt.toISOString() });
      await transaction.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 201, responseBody: response } });
      return response;
    });
  }

  private hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private toDto(curriculum: CurriculumRecord): AdminIeltsBandCurriculumDto {
    return adminIeltsBandCurriculumSchema.parse({ id: curriculum.id, status: curriculum.status, draftRevision: curriculum.draftRevision, draft: curriculum.draftContent, currentPublishedVersion: curriculum.currentPublishedVersion ? this.version(curriculum.currentPublishedVersion) : null, versions: curriculum.versions.map((version) => this.version(version)), updatedAt: curriculum.updatedAt.toISOString() });
  }
  private version(version: VersionRecord) { return { id: version.id, version: version.version, status: version.status, publishedAt: version.publishedAt.toISOString(), archivedAt: version.archivedAt?.toISOString() ?? null }; }
}
