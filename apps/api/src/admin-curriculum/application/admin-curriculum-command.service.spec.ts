import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminCurriculumCommandService } from './admin-curriculum-command.service.js';
import type { PrismaService } from '../../common/database/prisma.service.js';
import { INTERMEDIATE_PROGRAM_ID } from '../../learning-programs/domain/program-catalog.js';

interface MockPrisma {
  $queryRaw: ReturnType<typeof vi.fn>;
  $transaction: (cb: (tx: MockPrisma) => Promise<unknown>) => Promise<unknown>;
  auditLog: { create: ReturnType<typeof vi.fn> };
  learningPath: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  learningProgram: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  level: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  mission: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  missionLesson: {
    createMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  mutationReceipt: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
}

describe('AdminCurriculumCommandService Unit Tests', () => {
  let service: AdminCurriculumCommandService;
  let mockPrisma: MockPrisma;

  const actorId = '11111111-1111-4111-8111-111111111111';
  const idempotencyKey = '22222222-2222-4222-8222-222222222222';
  const pathId = '33333333-3333-4333-8333-333333333333';
  const ieltsProgram = {
    availabilityStatus: 'IN_DEVELOPMENT',
    id: '10000000-0000-4000-8000-000000000004',
    name: 'IELTS',
    slug: 'ielts',
  } as const;
  const intermediateProgram = {
    availabilityStatus: 'AVAILABLE',
    id: INTERMEDIATE_PROGRAM_ID,
    name: 'Intermediate',
    slug: 'intermediate',
  } as const;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (cb: (tx: MockPrisma) => Promise<unknown>) => cb(mockPrisma)),
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      learningPath: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      learningProgram: {
        findUnique: vi.fn().mockResolvedValue(intermediateProgram),
      },
      level: {
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      mission: {
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      missionLesson: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      mutationReceipt: {
        create: vi.fn().mockResolvedValue({ id: 'receipt-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    service = new AdminCurriculumCommandService(mockPrisma as unknown as PrismaService);
  });

  describe('createPath', () => {
    it('creates a learning path with revision 1 and status DRAFT, records audit log and receipt', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.learningPath.create.mockResolvedValue({
        id: pathId,
        levels: [],
        name: 'Business English',
        program: intermediateProgram,
        revision: 1,
        slug: 'business-english',
        status: 'DRAFT',
      });

      const result = await service.createPath(actorId, {
        idempotencyKey,
        name: 'Business English',
        slug: 'business-english',
      });

      expect(result.id).toBe(pathId);
      expect(result.revision).toBe(1);
      expect(result.status).toBe('DRAFT');
      expect(result.program).toEqual(intermediateProgram);
      expect(mockPrisma.learningPath.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ programId: INTERMEDIATE_PROGRAM_ID }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE_PATH',
            actorId,
            resourceId: pathId,
            resourceType: 'LearningPath',
            metadata: {
              programId: INTERMEDIATE_PROGRAM_ID,
              programSlug: 'intermediate',
            },
          }),
        }),
      );
      expect(mockPrisma.mutationReceipt.create).toHaveBeenCalled();
    });

    it('returns existing cached receipt on idempotent replay', async () => {
      const cached = {
        archiveBlockers: [],
        id: pathId,
        levels: [],
        name: 'Business English',
        program: intermediateProgram,
        revision: 1,
        slug: 'business-english',
        status: 'DRAFT',
      };

      mockPrisma.mutationReceipt.findUnique.mockResolvedValue({
        idempotencyKey,
        requestHash: service.computeRequestHash({
          name: 'Business English',
          programId: INTERMEDIATE_PROGRAM_ID,
          slug: 'business-english',
        }),
        responseBody: cached,
      });

      const result = await service.createPath(actorId, {
        idempotencyKey,
        name: 'Business English',
        slug: 'business-english',
      });

      expect(result).toEqual(cached);
      expect(mockPrisma.learningPath.create).not.toHaveBeenCalled();
    });

    it('assigns a path to an explicitly selected program', async () => {
      mockPrisma.learningProgram.findUnique.mockResolvedValue(ieltsProgram);
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);
      mockPrisma.learningPath.create.mockResolvedValue({
        id: pathId,
        name: 'IELTS Preparation',
        program: ieltsProgram,
        revision: 1,
        slug: 'ielts-preparation',
        status: 'DRAFT',
      });

      const result = await service.createPath(actorId, {
        idempotencyKey,
        name: 'IELTS Preparation',
        programId: ieltsProgram.id,
        slug: 'ielts-preparation',
      });

      expect(result.program).toEqual(ieltsProgram);
      expect(mockPrisma.learningPath.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ programId: ieltsProgram.id }),
        }),
      );
    });

    it.each([
      ['missing', null],
      ['disabled', { ...ieltsProgram, availabilityStatus: 'DISABLED' }],
    ])('rejects a %s learning program', async (_label, program) => {
      mockPrisma.learningProgram.findUnique.mockResolvedValue(program);

      await expect(
        service.createPath(actorId, {
          idempotencyKey,
          name: 'Invalid Program Path',
          programId: ieltsProgram.id,
          slug: 'invalid-program-path',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'INVALID_CURRICULUM_RELATIONSHIP',
          statusCode: 422,
        }),
      });
      expect(mockPrisma.learningPath.create).not.toHaveBeenCalled();
    });

    it('throws 409 IDEMPOTENCY_CONFLICT when idempotencyKey is reused with different payload', async () => {
      mockPrisma.mutationReceipt.findUnique.mockResolvedValue({
        idempotencyKey,
        requestHash: 'different-hash',
        responseBody: {},
      });

      await expect(
        service.createPath(actorId, {
          idempotencyKey,
          name: 'Different Name',
          slug: 'business-english',
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('updatePath', () => {
    it('throws 409 CURRICULUM_REVISION_CONFLICT when expectedRevision does not match current revision', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({
        id: pathId,
        name: 'Old Name',
        revision: 3,
        slug: 'path-slug',
        status: 'DRAFT',
      });

      await expect(
        service.updatePath(pathId, actorId, {
          expectedRevision: 2, // mismatch!
          idempotencyKey,
          name: 'New Name',
        }),
      ).rejects.toThrowError(ConflictException);
    });

    it('updates name and increments revision when expectedRevision matches', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({
        id: pathId,
        levels: [],
        name: 'Old Name',
        revision: 2,
        slug: 'path-slug',
        status: 'DRAFT',
      });

      mockPrisma.learningPath.update.mockResolvedValue({
        id: pathId,
        levels: [],
        name: 'New Name',
        revision: 3,
        slug: 'path-slug',
        status: 'DRAFT',
      });

      const result = await service.updatePath(pathId, actorId, {
        expectedRevision: 2,
        idempotencyKey,
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(result.revision).toBe(3);
      expect(mockPrisma.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Name',
            revision: 3,
          }),
        }),
      );
    });
  });

  describe('archivePath', () => {
    it('throws 409 CURRICULUM_ARCHIVE_BLOCKED when path has active published levels', async () => {
      mockPrisma.learningPath.findUnique.mockResolvedValue({
        id: pathId,
        levels: [{ id: 'lvl-1', status: 'PUBLISHED' }],
        name: 'Path',
        revision: 1,
        slug: 'path',
        status: 'PUBLISHED',
      });

      await expect(
        service.archivePath(pathId, actorId, {
          expectedRevision: 1,
          idempotencyKey,
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('reorderLevels', () => {
    it('throws 422 INVALID_CURRICULUM_RELATIONSHIP when foreign ID is provided', async () => {
      mockPrisma.level.findMany.mockResolvedValue([
        { id: 'lvl-1', order: 1, status: 'PUBLISHED' },
        { id: 'lvl-2', order: 2, status: 'PUBLISHED' },
      ]);

      await expect(
        service.reorderLevels(pathId, actorId, {
          idempotencyKey,
          orderedIds: ['lvl-1', 'lvl-foreign'],
        }),
      ).rejects.toThrowError(UnprocessableEntityException);
    });
  });
});
