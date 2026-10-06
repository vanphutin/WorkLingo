import { createHash, randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ContentAuthoringErrorCode } from '@worklingo/contracts';
import { canonicalLessonSource, invalidLessonSources } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import { ContentImportsService } from './content-imports.service.js';

describe('ContentImportsService', () => {
  const actorId = randomUUID();

  describe('exact-source persistence and revision checks', () => {
    it('creates an import and persists invalid raw source exactly', async () => {
      const invalidSource = 'INVALID NOT REAL LESSON';
      const importId = randomUUID();
      const expectedHash = createHash('sha256').update(invalidSource).digest('hex');

      const create = vi.fn().mockImplementation(async ({ data }) => ({
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: data.rawSource,
        sourceHash: data.sourceHash,
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        validationHash: null,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      }));

      const database = {
        contentImport: { create },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      const result = await service.create(actorId, invalidSource);

      expect(create).toHaveBeenCalledTimes(1);
      expect(result.rawSource).toBe(invalidSource);
      expect(result.sourceHash).toBe(expectedHash);
      expect(result.draftRevision).toBe(1);
      expect(result.status).toBe('DRAFT');
    });

    it('requires expectedDraftRevision on update and increments revision once on success', async () => {
      const importId = randomUUID();
      const originalSource = 'ORIGINAL SOURCE';
      const updatedSource = 'UPDATED SOURCE';
      const originalHash = createHash('sha256').update(originalSource).digest('hex');
      const updatedHash = createHash('sha256').update(updatedSource).digest('hex');

      const existingRecord = {
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: originalSource,
        sourceHash: originalHash,
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        validationHash: null,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const findUniqueOrThrow = vi.fn().mockResolvedValue({
        ...existingRecord,
        rawSource: updatedSource,
        sourceHash: updatedHash,
        draftRevision: 2,
        updatedAt: new Date('2026-10-04T00:01:00Z'),
      });

      const database = {
        contentImport: { findUnique, updateMany, findUniqueOrThrow },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      const result = await service.updateSource(importId, actorId, {
        rawSource: updatedSource,
        expectedDraftRevision: 1,
      });

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: importId,
          draftRevision: 1,
          status: { in: ['DRAFT', 'VALIDATED'] },
        },
        data: expect.objectContaining({
          rawSource: updatedSource,
          sourceHash: updatedHash,
          draftRevision: 2,
          status: 'DRAFT',
          validationHash: null,
          updatedById: actorId,
        }),
      });
      expect(result.draftRevision).toBe(2);
      expect(result.rawSource).toBe(updatedSource);
      expect(result.sourceHash).toBe(updatedHash);
    });

    it('rejects update with 409 conflict when expectedDraftRevision does not match', async () => {
      const importId = randomUUID();
      const existingRecord = {
        id: importId,
        draftRevision: 2,
        rawSource: 'EXISTING SOURCE',
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const updateMany = vi.fn();

      const database = {
        contentImport: { findUnique, updateMany },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);

      await expect(
        service.updateSource(importId, actorId, {
          rawSource: 'NEW SOURCE',
          expectedDraftRevision: 1,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
          statusCode: 409,
        }),
      });

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('rejects update with 409 conflict if concurrent update occurred between read and write', async () => {
      const importId = randomUUID();
      const existingRecord = {
        id: importId,
        draftRevision: 1,
        rawSource: 'EXISTING SOURCE',
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const updateMany = vi.fn().mockResolvedValue({ count: 0 }); // Concurrent write modified revision

      const database = {
        contentImport: { findUnique, updateMany },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);

      await expect(
        service.updateSource(importId, actorId, {
          rawSource: 'NEW SOURCE',
          expectedDraftRevision: 1,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
          statusCode: 409,
        }),
      });
    });
  });

  describe('validation race condition compare-and-set', () => {
    it('refuses to mark revision 4 VALIDATED when validation completes for stale revision 3', async () => {
      const importId = randomUUID();
      const sourceRev3 = canonicalLessonSource;
      const hashRev3 = createHash('sha256').update(sourceRev3).digest('hex');

      // Draft was at revision 3 when validate was initiated
      const existingRecordRev3 = {
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: sourceRev3,
        sourceHash: hashRev3,
        status: 'DRAFT',
        draftRevision: 3,
        parserVersion: '1.0.0',
        validationHash: null,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecordRev3);
      // While analysis ran, user saved revision 4!
      // Therefore, compare-and-set where: { id: importId, draftRevision: 3, sourceHash: hashRev3 } matches 0 rows!
      const updateMany = vi.fn().mockResolvedValue({ count: 0 });

      const database = {
        contentImport: { findUnique, updateMany },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);

      await expect(
        service.validate(importId, actorId, 3),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
          statusCode: 409,
        }),
      });

      // Verify compare-and-set query targeted revision 3
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: importId,
          draftRevision: 3,
          sourceHash: hashRev3,
          status: { in: ['DRAFT', 'VALIDATED'] },
        },
        data: expect.objectContaining({
          status: 'VALIDATED',
          validationHash: hashRev3,
        }),
      });
    });

    it('marks VALIDATED when compare-and-set matches current revision and source hash', async () => {
      const importId = randomUUID();
      const source = canonicalLessonSource;
      const hash = createHash('sha256').update(source).digest('hex');

      const existingRecord = {
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: source,
        sourceHash: hash,
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        validationHash: null,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });

      const database = {
        contentImport: { findUnique, updateMany },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      const result = await service.validate(importId, actorId, 1);

      expect(result.canPublish).toBe(true);
      expect(result.status).toBe('VALIDATED');
      expect(result.draftRevision).toBe(1);
      expect(result.sourceHash).toBe(hash);
      expect(result.issues).toEqual([]);
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: importId,
          draftRevision: 1,
          sourceHash: hash,
          status: { in: ['DRAFT', 'VALIDATED'] },
        },
        data: expect.objectContaining({
          status: 'VALIDATED',
          validationHash: hash,
          parsedAst: expect.any(Object),
          normalizedPreview: expect.any(Object),
          validationReport: expect.any(Object),
        }),
      });
    });

    it('records validation failure issues without marking VALIDATED', async () => {
      const importId = randomUUID();
      const source = invalidLessonSources.unclosedSection;
      const hash = createHash('sha256').update(source).digest('hex');

      const existingRecord = {
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: source,
        sourceHash: hash,
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        validationHash: null,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });

      const database = {
        contentImport: { findUnique, updateMany },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      const result = await service.validate(importId, actorId, 1);

      expect(result.canPublish).toBe(false);
      expect(result.status).toBe('DRAFT');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: importId,
          draftRevision: 1,
          sourceHash: hash,
          status: { in: ['DRAFT', 'VALIDATED'] },
        },
        data: expect.objectContaining({
          status: 'DRAFT',
          validationHash: null,
          normalizedPreview: null,
        }),
      });
    });
  });

  describe('preview and retrieval', () => {
    it('returns preview with normalized draft for valid source', async () => {
      const importId = randomUUID();
      const source = canonicalLessonSource;
      const hash = createHash('sha256').update(source).digest('hex');

      const existingRecord = {
        id: importId,
        lessonId: null,
        lessonVersionId: null,
        rawSource: source,
        sourceHash: hash,
        status: 'VALIDATED',
        draftRevision: 1,
        parserVersion: '1.0.0',
        validationHash: hash,
        parsedAst: null,
        normalizedPreview: null,
        validationReport: null,
        createdById: actorId,
        updatedById: actorId,
        createdAt: new Date('2026-10-04T00:00:00Z'),
        updatedAt: new Date('2026-10-04T00:00:00Z'),
      };

      const findUnique = vi.fn().mockResolvedValue(existingRecord);
      const database = {
        contentImport: { findUnique },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      const preview = await service.getPreview(importId, actorId);

      expect(preview.importId).toBe(importId);
      expect(preview.canPublish).toBe(true);
      expect(preview.normalizedDraft).not.toBeNull();
      expect(preview.normalizedDraft?.title).toBe('Handling Customer Complaints');
    });

    it('throws NotFoundException when content import does not exist', async () => {
      const importId = randomUUID();
      const findUnique = vi.fn().mockResolvedValue(null);
      const database = {
        contentImport: { findUnique },
      } as unknown as PrismaService;

      const service = new ContentImportsService(database);
      await expect(service.get(importId, actorId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
