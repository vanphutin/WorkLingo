import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import { PrismaService } from '../common/database/prisma.service.js';
import type { AdminContentKind, RemoveAdminContentDto, RemoveAdminContentResultDto } from './dto/remove-admin-content.dto.js';

const operation = 'remove-admin-content';
const includeHistory = { versions: { select: { id: true }, take: 1 } } as const;
const includeLesson = { select: { id: true, slug: true, currentPublishedVersionId: true, ...includeHistory } } as const;
const includeImport = { lesson: includeLesson, publishedVersion: { select: { lesson: includeLesson } } } as const;
const lockPrefixes = { topic: 'ielts-topic:', bridge: 'worklingo:ielts-bridge:', mock: 'ielts-mock:' } as const;

interface VersionedRecord {
  draftRevision: number;
  status: string;
  currentPublishedVersionId: string | null;
  versions: { id: string }[];
}
interface VersionedStore {
  resourceType: string;
  read(): Promise<VersionedRecord | null>;
  deleteDraft(revision: number): Promise<{ count: number }>;
  archive(revision: number): Promise<{ count: number }>;
  archiveVersion(id: string): Promise<unknown>;
}

@Injectable()
export class AdminContentLifecycleService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async remove(actorId: string, kind: AdminContentKind, id: string, input: RemoveAdminContentDto): Promise<RemoveAdminContentResultDto> {
    const requestHash = createHash('sha256').update(JSON.stringify({ kind, id, expectedRevision: input.expectedRevision, expectedAction: input.expectedAction })).digest('hex');
    try {
      return await this.database.$transaction(async tx => {
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, status: true } });
        if (!actor || actor.status !== 'ACTIVE' || !['CONTENT_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) {
          throw new ForbiddenException('Active content administrator required.');
        }
        // Serialize this receipt across targets as well as serializing each resource mutation.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${operation + ':' + actorId + ':' + input.idempotencyKey}))`;
        const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
        if (receipt) {
          if (receipt.requestHash !== requestHash) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency key reused.' });
          return receipt.responseBody as unknown as RemoveAdminContentResultDto;
        }
        const result = kind === 'lesson'
          ? await this.removeImport(tx, actorId, id, input)
          : await this.removeVersioned(tx, kind, id, input);
        await tx.auditLog.create({ data: {
          actorId, action: result.action === 'deleted' ? 'DELETE_ADMIN_CONTENT' : 'ARCHIVE_ADMIN_CONTENT',
          resourceType: result.resourceType, resourceId: id,
          oldState: { draftRevision: input.expectedRevision },
          newState: result.action === 'deleted' ? { deleted: true } : { status: 'ARCHIVED', draftRevision: input.expectedRevision + 1 },
          metadata: { kind, action: result.action },
        } });
        const response = { id, action: result.action };
        await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 200, responseBody: response } });
        return response;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2003', 'P2014'].includes(error.code)) {
        throw new ConflictException({ code: 'CONTENT_REFERENCED', message: 'Content is referenced and cannot be removed.' });
      }
      throw error;
    }
  }

  private async removeVersioned(tx: Prisma.TransactionClient, kind: Exclude<AdminContentKind, 'lesson'>, id: string, input: RemoveAdminContentDto) {
    const revision = input.expectedRevision;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockPrefixes[kind] + id}))`;
    const store = this.store(tx, kind, id);
    const record = await store.read();
    this.requireRevision(record, revision);
    const hasHistory = record.versions.length > 0 || record.currentPublishedVersionId !== null || ['PUBLISHED', 'ARCHIVED'].includes(record.status);
    const action = hasHistory ? 'archived' as const : 'deleted' as const;
    this.requireAction(action, input.expectedAction);
    if (hasHistory) {
      if (record.currentPublishedVersionId) await store.archiveVersion(record.currentPublishedVersionId);
      this.requireChanged(await store.archive(revision));
    } else {
      this.requireChanged(await store.deleteDraft(revision));
    }
    return { action, resourceType: store.resourceType };
  }

  private store(tx: Prisma.TransactionClient, kind: Exclude<AdminContentKind, 'lesson'>, id: string): VersionedStore {
    const draftWhere = (draftRevision: number) => ({ id, draftRevision, status: { in: ['DRAFT', 'VALIDATED'] as Array<'DRAFT' | 'VALIDATED'> }, currentPublishedVersionId: null, versions: { none: {} } });
    const archiveData = { status: 'ARCHIVED' as const, currentPublishedVersionId: null, draftRevision: { increment: 1 } };
    const versionData = () => ({ status: 'ARCHIVED' as const, archivedAt: new Date() });
    switch (kind) {
      case 'topic': return {
        resourceType: 'IeltsTopic',
        read: () => tx.ieltsTopic.findUnique({ where: { id }, include: includeHistory }),
        deleteDraft: revision => tx.ieltsTopic.deleteMany({ where: draftWhere(revision) }),
        archive: draftRevision => tx.ieltsTopic.updateMany({ where: { id, draftRevision }, data: archiveData }),
        archiveVersion: versionId => tx.ieltsTopicVersion.update({ where: { id: versionId }, data: versionData() }),
      };
      case 'bridge': return {
        resourceType: 'IeltsBridgeModule',
        read: () => tx.ieltsBridgeModule.findUnique({ where: { id }, include: includeHistory }),
        deleteDraft: revision => tx.ieltsBridgeModule.deleteMany({ where: draftWhere(revision) }),
        archive: draftRevision => tx.ieltsBridgeModule.updateMany({ where: { id, draftRevision }, data: archiveData }),
        archiveVersion: versionId => tx.ieltsBridgeModuleVersion.update({ where: { id: versionId }, data: versionData() }),
      };
      case 'mock': return {
        resourceType: 'IeltsMockTest',
        read: () => tx.ieltsMockTest.findUnique({ where: { id }, include: includeHistory }),
        deleteDraft: revision => tx.ieltsMockTest.deleteMany({ where: draftWhere(revision) }),
        archive: draftRevision => tx.ieltsMockTest.updateMany({ where: { id, draftRevision }, data: archiveData }),
        archiveVersion: versionId => tx.ieltsMockTestVersion.update({ where: { id: versionId }, data: versionData() }),
      };
    }
  }

  private async removeImport(tx: Prisma.TransactionClient, actorId: string, id: string, input: RemoveAdminContentDto) {
    const revision = input.expectedRevision;
    const initial = await tx.contentImport.findUnique({ where: { id }, include: includeImport });
    if (!initial) throw new NotFoundException('Content import not found.');
    const slug = this.importSlug(initial);
    // Publisher acquires the slug lock before the import row lock. Keep the same order.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slug}))`;
    await tx.$queryRaw`SELECT "id" FROM "ContentImport" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const record = await tx.contentImport.findUnique({ where: { id }, include: includeImport });
    this.requireRevision(record, revision);
    if (this.importSlug(record) !== slug) throw new ConflictException({ code: 'CONTENT_REVISION_STALE', message: 'Content changed during removal.' });
    const lesson = record.lesson ?? record.publishedVersion?.lesson;
    const hasHistory = record.lessonVersionId !== null || !!lesson?.versions.length || !!lesson?.currentPublishedVersionId || ['PUBLISHED', 'ARCHIVED'].includes(record.status);
    this.requireAction(hasHistory ? 'archived' : 'deleted', input.expectedAction);
    if (!hasHistory) {
      this.requireChanged(await tx.contentImport.deleteMany({ where: { id, draftRevision: revision, status: { in: ['DRAFT', 'VALIDATED'] }, lessonVersionId: null } }));
      return { action: 'deleted' as const, resourceType: 'ContentImport' };
    }
    // An older import is not authority to revoke a newer publication of the same lesson.
    if (lesson?.currentPublishedVersionId && (!record.lessonVersionId || record.lessonVersionId === lesson.currentPublishedVersionId)) {
      await tx.lessonVersion.update({ where: { id: lesson.currentPublishedVersionId }, data: { status: 'ARCHIVED' } });
      await tx.lesson.updateMany({ where: { id: lesson.id, currentPublishedVersionId: lesson.currentPublishedVersionId }, data: { currentPublishedVersionId: null } });
    }
    this.requireChanged(await tx.contentImport.updateMany({ where: { id, draftRevision: revision }, data: { status: 'ARCHIVED', draftRevision: { increment: 1 }, updatedById: actorId } }));
    return { action: 'archived' as const, resourceType: 'ContentImport' };
  }

  private importSlug(record: Prisma.ContentImportGetPayload<{ include: typeof includeImport }>): string {
    return record.lesson?.slug ?? record.publishedVersion?.lesson.slug ?? parseLessonSource(record.rawSource).document.lesson?.slug ?? 'content-import:' + record.id;
  }

  private requireRevision<T extends { draftRevision: number }>(record: T | null, expected: number): asserts record is T {
    if (!record) throw new NotFoundException('Content not found.');
    if (record.draftRevision !== expected) throw new ConflictException({ code: 'CONTENT_REVISION_STALE', message: 'Content revision is stale.' });
  }

  private requireChanged(result: { count: number }): void {
    if (result.count !== 1) throw new ConflictException({ code: 'CONTENT_REVISION_STALE', message: 'Content changed during removal.' });
  }

  private requireAction(actual: RemoveAdminContentDto['expectedAction'], expected: RemoveAdminContentDto['expectedAction']): void {
    if (actual !== expected) throw new ConflictException({ code: 'CONTENT_LIFECYCLE_CHANGED', message: 'Content lifecycle changed. Refresh and confirm removal again.' });
  }
}
