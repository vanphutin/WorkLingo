import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { adminIeltsMockSchema, ieltsMockContentSchema, ieltsMockValidationSchema, publishIeltsMockResultSchema } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
const includeMock = { currentPublishedVersion: true, versions: { orderBy: { version: 'desc' as const } } } as const;
type MockRecord = Prisma.IeltsMockTestGetPayload<{ include: typeof includeMock }>;
type VersionRecord = Prisma.IeltsMockTestVersionGetPayload<Record<string, never>>;

@Injectable()
export class IeltsMockAdminService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async list() { return Promise.all((await this.database.ieltsMockTest.findMany({ include: includeMock, orderBy: { updatedAt: 'desc' }, take: 100 })).map((row) => this.dto(row))); }
  async save(actorId: string, id: string, input: { expectedRevision: number; idempotencyKey: string; content: unknown }) {
    const content = ieltsMockContentSchema.parse(input.content);
    await this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock:' + id}))`;
      const operation = 'save-ielts-mock'; const requestHash = this.hash(input); const replay = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key reused.'); return; }
      const updated = await tx.ieltsMockTest.updateMany({ where: { id, draftRevision: input.expectedRevision }, data: { draftContent: content as Prisma.InputJsonValue, draftRevision: { increment: 1 }, status: 'DRAFT' } });
      if (updated.count !== 1) throw new ConflictException('IELTS mock revision is stale.');
      await tx.auditLog.create({ data: { actorId, action: 'UPDATE_IELTS_MOCK', resourceType: 'IeltsMockTest', resourceId: id, metadata: { variant: content.variant } } });
      await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 200, responseBody: { mockTestId: id } } });
    });
    return this.get(id);
  }
  async validate(id: string, input: { expectedRevision: number }) {
    const mock = await this.database.ieltsMockTest.findUnique({ where: { id } }); if (!mock) throw new NotFoundException('IELTS mock not found.'); if (mock.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS mock revision is stale.');
    const parsed = ieltsMockContentSchema.safeParse(mock.draftContent); const issues = parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })); const status = issues.length ? 'DRAFT' as const : 'VALIDATED' as const;
    await this.database.ieltsMockTest.update({ where: { id }, data: { status } }); return ieltsMockValidationSchema.parse({ mockTestId: id, draftRevision: mock.draftRevision, status, canPublish: !issues.length, issues });
  }
  async publish(actorId: string, id: string, input: { expectedRevision: number; idempotencyKey: string }) {
    return this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock:' + id}))`; const operation = 'publish-ielts-mock'; const requestHash = this.hash(input);
      const replay = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } }); if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key reused.'); return publishIeltsMockResultSchema.parse(replay.responseBody); }
      const mock = await tx.ieltsMockTest.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } }); if (!mock) throw new NotFoundException('IELTS mock not found.'); if (mock.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS mock revision is stale.');
      if (mock.status !== 'VALIDATED') throw new ConflictException('IELTS mock must be validated before publication.');
      const content = ieltsMockContentSchema.parse(mock.draftContent); const audioIds = content.listening.parts.map((part) => part.audioAssetId);
      if (audioIds.some((assetId) => assetId === null)) throw new UnprocessableEntityException('Every Listening part requires release-ready audio.');
      const readyAudio = await tx.audioArtifact.count({ where: { id: { in: audioIds as string[] }, status: 'READY', adapterName: { not: 'fake-tts' } } });
      if (readyAudio !== new Set(audioIds).size) throw new UnprocessableEntityException('Every Listening part requires release-ready audio.');
      const publishedAt = new Date(); const version = await tx.ieltsMockTestVersion.create({ data: { mockTestId: id, version: (mock.versions[0]?.version ?? 0) + 1, sourceHash: this.hash(content), content: content as Prisma.InputJsonValue, publishedAt } });
      if (mock.currentPublishedVersionId) await tx.ieltsMockTestVersion.update({ where: { id: mock.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: publishedAt } });
      await tx.ieltsMockTest.update({ where: { id }, data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' } }); await tx.auditLog.create({ data: { actorId, action: 'PUBLISH_IELTS_MOCK', resourceType: 'IeltsMockTestVersion', resourceId: version.id } });
      const response = publishIeltsMockResultSchema.parse({ mockTestId: id, mockTestVersionId: version.id, version: version.version, publishedAt: publishedAt.toISOString() }); await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 201, responseBody: response } }); return response;
    });
  }
  private async get(id: string) { const row = await this.database.ieltsMockTest.findUnique({ where: { id }, include: includeMock }); if (!row) throw new NotFoundException('IELTS mock not found.'); return this.dto(row); }
  private dto(row: MockRecord) { const version = (item: VersionRecord) => ({ id: item.id, version: item.version, status: item.status, publishedAt: item.publishedAt.toISOString(), archivedAt: item.archivedAt?.toISOString() ?? null }); return adminIeltsMockSchema.parse({ id: row.id, slug: row.slug, status: row.status, draftRevision: row.draftRevision, draft: row.draftContent, currentPublishedVersion: row.currentPublishedVersion ? version(row.currentPublishedVersion) : null, versions: row.versions.map(version), updatedAt: row.updatedAt.toISOString() }); }
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
}
