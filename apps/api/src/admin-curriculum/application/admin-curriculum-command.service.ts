import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AdminLearningPathItemDto,
  AdminLevelItemDto,
  AdminMissionItemDto,
  ArchiveLearningPathInput,
  ArchiveLevelInput,
  ArchiveMissionInput,
  CreateLearningPathInput,
  CreateLevelInput,
  CreateMissionInput,
  PublishLearningPathInput,
  PublishLevelInput,
  PublishMissionInput,
  ReorderCurriculumInput,
  ReplaceMissionLessonsInput,
  UpdateLearningPathInput,
  UpdateLevelInput,
  UpdateMissionInput,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import {
  assertMutableIdentity,
  assertPlayableMissionLessons,
  CurriculumMutationPolicyError,
  findArchiveBlockers,
} from '../domain/curriculum-mutation-policy.js';
import {
  CurriculumReorderPolicyError,
  validateCompleteOrder,
} from '../domain/curriculum-reorder-policy.js';
import { sanitizeAuditState } from '../../audit/domain/audit-metadata-policy.js';
import { INTERMEDIATE_PROGRAM_ID } from '../../learning-programs/domain/program-catalog.js';

const PROGRAM_OPTION_SELECT = {
  availabilityStatus: true,
  id: true,
  name: true,
  slug: true,
} as const;

@Injectable()
export class AdminCurriculumCommandService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  computeRequestHash(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private async checkReceipt<T>(
    actorId: string,
    operation: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<T | null> {
    const existing = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId,
          idempotencyKey,
          operation,
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key reused with different request payload',
        statusCode: 409,
      });
    }

    return existing.responseBody as unknown as T;
  }

  private async recordReceiptAndAudit(
    tx: Prisma.TransactionClient,
    actorId: string,
    operation: string,
    idempotencyKey: string,
    requestHash: string,
    auditAction: string,
    resourceType: string,
    resourceId: string,
    oldState: unknown,
    newState: unknown,
    metadata: unknown,
    responseBody: unknown,
    responseStatus = 200,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        action: auditAction,
        actorId,
        metadata: (sanitizeAuditState(metadata) as Prisma.InputJsonValue) ?? undefined,
        newState: (sanitizeAuditState(newState) as Prisma.InputJsonValue) ?? undefined,
        oldState: (sanitizeAuditState(oldState) as Prisma.InputJsonValue) ?? undefined,
        resourceId,
        resourceType,
      },
    });

    await tx.mutationReceipt.create({
      data: {
        actorId,
        idempotencyKey,
        operation,
        requestHash,
        responseBody: responseBody as Prisma.InputJsonValue,
        responseStatus,
      },
    });
  }

  // ---------------- LEARNING PATH COMMANDS ----------------

  async createPath(
    actorId: string,
    input: CreateLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    const programId = input.programId ?? INTERMEDIATE_PROGRAM_ID;
    const requestHash = this.computeRequestHash({
      name: input.name,
      programId,
      slug: input.slug,
    });

    const cached = await this.checkReceipt<AdminLearningPathItemDto>(
      actorId,
      'createPath',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const program = await tx.learningProgram.findUnique({
        select: PROGRAM_OPTION_SELECT,
        where: { id: programId },
      });
      if (!program || program.availabilityStatus === 'DISABLED') {
        throw new UnprocessableEntityException({
          code: 'INVALID_CURRICULUM_RELATIONSHIP',
          message: 'Selected learning program is unavailable',
          statusCode: 422,
        });
      }

      const existingSlug = await tx.learningPath.findUnique({
        where: { slug: input.slug },
      });
      if (existingSlug) {
        throw new ConflictException({
          code: 'SLUG_ALREADY_EXISTS',
          message: `Path with slug '${input.slug}' already exists`,
          statusCode: 409,
        });
      }

      const path = await tx.learningPath.create({
        data: {
          name: input.name,
          programId,
          revision: 1,
          slug: input.slug,
          status: 'DRAFT',
        },
        include: { program: { select: PROGRAM_OPTION_SELECT } },
      });

      const response: AdminLearningPathItemDto = {
        archiveBlockers: [],
        id: path.id,
        levels: [],
        name: path.name,
        program: path.program,
        revision: path.revision,
        slug: path.slug,
        status: path.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'createPath',
        input.idempotencyKey,
        requestHash,
        'CREATE_PATH',
        'LearningPath',
        path.id,
        null,
        response,
        { programId: program.id, programSlug: program.slug },
        response,
        201,
      );

      return response;
    });
  }

  async updatePath(
    pathId: string,
    actorId: string,
    input: UpdateLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      name: input.name,
      pathId,
    });

    const cached = await this.checkReceipt<AdminLearningPathItemDto>(
      actorId,
      'updatePath',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.learningPath.findUnique({
        include: { program: { select: PROGRAM_OPTION_SELECT } },
        where: { id: pathId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Path ${pathId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      try {
        assertMutableIdentity({
          current: {
            isPublished: current.status === 'PUBLISHED',
            slug: current.slug,
            status: current.status,
          },
          proposed: {},
          resourceType: 'PATH',
        });
      } catch (err) {
        if (err instanceof CurriculumMutationPolicyError) {
          throw new ConflictException({
            code: err.code,
            message: err.message,
            statusCode: 409,
          });
        }
        throw err;
      }

      const updated = await tx.learningPath.update({
        data: {
          name: input.name ?? current.name,
          revision: current.revision + 1,
        },
        include: { program: { select: PROGRAM_OPTION_SELECT } },
        where: { id: pathId },
      });

      const response: AdminLearningPathItemDto = {
        archiveBlockers: [],
        id: updated.id,
        levels: [],
        name: updated.name,
        program: updated.program,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'updatePath',
        input.idempotencyKey,
        requestHash,
        'UPDATE_PATH',
        'LearningPath',
        pathId,
        current,
        response,
        { pathId },
        response,
        200,
      );

      return response;
    });
  }

  async publishPath(
    pathId: string,
    actorId: string,
    input: PublishLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      pathId,
    });

    const cached = await this.checkReceipt<AdminLearningPathItemDto>(
      actorId,
      'publishPath',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.learningPath.findUnique({
        include: { program: { select: PROGRAM_OPTION_SELECT } },
        where: { id: pathId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Path ${pathId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const updated = await tx.learningPath.update({
        data: {
          revision: current.revision + 1,
          status: 'PUBLISHED',
        },
        include: { program: { select: PROGRAM_OPTION_SELECT } },
        where: { id: pathId },
      });

      const response: AdminLearningPathItemDto = {
        archiveBlockers: [],
        id: updated.id,
        levels: [],
        name: updated.name,
        program: updated.program,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'publishPath',
        input.idempotencyKey,
        requestHash,
        'PUBLISH_PATH',
        'LearningPath',
        pathId,
        current,
        response,
        { pathId },
        response,
        200,
      );

      return response;
    });
  }

  async archivePath(
    pathId: string,
    actorId: string,
    input: ArchiveLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      pathId,
    });

    const cached = await this.checkReceipt<AdminLearningPathItemDto>(
      actorId,
      'archivePath',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.learningPath.findUnique({
        include: {
          levels: { where: { status: 'PUBLISHED' } },
          program: { select: PROGRAM_OPTION_SELECT },
        },
        where: { id: pathId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Path ${pathId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const blockers = findArchiveBlockers({
        publishedChildCount: current.levels.length,
        resourceType: 'PATH',
        status: current.status,
      });

      if (blockers.length > 0) {
        throw new ConflictException({
          blockers: blockers.map((b) => b.code),
          code: 'CURRICULUM_ARCHIVE_BLOCKED',
          message: 'Path cannot be archived because it has published levels',
          statusCode: 409,
        });
      }

      const updated = await tx.learningPath.update({
        data: {
          revision: current.revision + 1,
          status: 'ARCHIVED',
        },
        include: { program: { select: PROGRAM_OPTION_SELECT } },
        where: { id: pathId },
      });

      const response: AdminLearningPathItemDto = {
        archiveBlockers: [],
        id: updated.id,
        levels: [],
        name: updated.name,
        program: updated.program,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'archivePath',
        input.idempotencyKey,
        requestHash,
        'ARCHIVE_PATH',
        'LearningPath',
        pathId,
        current,
        response,
        { pathId },
        response,
        200,
      );

      return response;
    });
  }

  // ---------------- LEVEL COMMANDS ----------------

  async createLevel(
    actorId: string,
    input: CreateLevelInput,
  ): Promise<AdminLevelItemDto> {
    const requestHash = this.computeRequestHash({
      cefrReference: input.cefrReference,
      code: input.code,
      name: input.name,
      order: input.order,
      pathId: input.pathId,
    });

    const cached = await this.checkReceipt<AdminLevelItemDto>(
      actorId,
      'createLevel',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const path = await tx.learningPath.findUnique({
        where: { id: input.pathId },
      });
      if (!path) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Path ${input.pathId} not found`,
          statusCode: 404,
        });
      }

      const existingCode = await tx.level.findUnique({
        where: { code: input.code },
      });
      if (existingCode) {
        throw new ConflictException({
          code: 'CODE_ALREADY_EXISTS',
          message: `Level with code '${input.code}' already exists`,
          statusCode: 409,
        });
      }

      let order = input.order;
      if (order === undefined) {
        const maxOrder = await tx.level.aggregate({
          _max: { order: true },
          where: { pathId: input.pathId },
        });
        order = (maxOrder._max.order ?? 0) + 1;
      }

      const level = await tx.level.create({
        data: {
          cefrReference: input.cefrReference,
          code: input.code,
          name: input.name,
          order,
          pathId: input.pathId,
          revision: 1,
          status: 'DRAFT',
        },
      });

      const response: AdminLevelItemDto = {
        archiveBlockers: [],
        cefrReference: level.cefrReference,
        code: level.code,
        id: level.id,
        isPlayable: false,
        missions: [],
        name: level.name,
        order: level.order,
        pathId: level.pathId,
        playabilityReasons: ['Level is in DRAFT status'],
        revision: level.revision,
        status: level.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'createLevel',
        input.idempotencyKey,
        requestHash,
        'CREATE_LEVEL',
        'Level',
        level.id,
        null,
        response,
        { code: level.code, pathId: input.pathId },
        response,
        201,
      );

      return response;
    });
  }

  async updateLevel(
    levelId: string,
    actorId: string,
    input: UpdateLevelInput,
  ): Promise<AdminLevelItemDto> {
    const requestHash = this.computeRequestHash({
      cefrReference: input.cefrReference,
      expectedRevision: input.expectedRevision,
      levelId,
      name: input.name,
    });

    const cached = await this.checkReceipt<AdminLevelItemDto>(
      actorId,
      'updateLevel',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.level.findUnique({
        where: { id: levelId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Level ${levelId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      try {
        assertMutableIdentity({
          current: {
            code: current.code,
            isPublished: current.status === 'PUBLISHED',
            status: current.status,
          },
          proposed: {},
          resourceType: 'LEVEL',
        });
      } catch (err) {
        if (err instanceof CurriculumMutationPolicyError) {
          throw new ConflictException({
            code: err.code,
            message: err.message,
            statusCode: 409,
          });
        }
        throw err;
      }

      const updated = await tx.level.update({
        data: {
          cefrReference: input.cefrReference ?? current.cefrReference,
          name: input.name ?? current.name,
          revision: current.revision + 1,
        },
        where: { id: levelId },
      });

      const response: AdminLevelItemDto = {
        archiveBlockers: [],
        cefrReference: updated.cefrReference,
        code: updated.code,
        id: updated.id,
        isPlayable: false,
        missions: [],
        name: updated.name,
        order: updated.order,
        pathId: updated.pathId,
        playabilityReasons: [],
        revision: updated.revision,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'updateLevel',
        input.idempotencyKey,
        requestHash,
        'UPDATE_LEVEL',
        'Level',
        levelId,
        current,
        response,
        { levelId },
        response,
        200,
      );

      return response;
    });
  }

  async publishLevel(
    levelId: string,
    actorId: string,
    input: PublishLevelInput,
  ): Promise<AdminLevelItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      levelId,
    });

    const cached = await this.checkReceipt<AdminLevelItemDto>(
      actorId,
      'publishLevel',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.level.findUnique({
        where: { id: levelId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Level ${levelId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const updated = await tx.level.update({
        data: {
          revision: current.revision + 1,
          status: 'PUBLISHED',
        },
        where: { id: levelId },
      });

      const response: AdminLevelItemDto = {
        archiveBlockers: [],
        cefrReference: updated.cefrReference,
        code: updated.code,
        id: updated.id,
        isPlayable: true,
        missions: [],
        name: updated.name,
        order: updated.order,
        pathId: updated.pathId,
        playabilityReasons: [],
        revision: updated.revision,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'publishLevel',
        input.idempotencyKey,
        requestHash,
        'PUBLISH_LEVEL',
        'Level',
        levelId,
        current,
        response,
        { levelId },
        response,
        200,
      );

      return response;
    });
  }

  async archiveLevel(
    levelId: string,
    actorId: string,
    input: ArchiveLevelInput,
  ): Promise<AdminLevelItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      levelId,
    });

    const cached = await this.checkReceipt<AdminLevelItemDto>(
      actorId,
      'archiveLevel',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.level.findUnique({
        include: {
          missions: { where: { status: 'PUBLISHED' } },
        },
        where: { id: levelId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Level ${levelId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const blockers = findArchiveBlockers({
        publishedChildCount: current.missions.length,
        resourceType: 'LEVEL',
        status: current.status,
      });

      if (blockers.length > 0) {
        throw new ConflictException({
          blockers: blockers.map((b) => b.code),
          code: 'CURRICULUM_ARCHIVE_BLOCKED',
          message: 'Level cannot be archived because it has published missions',
          statusCode: 409,
        });
      }

      const updated = await tx.level.update({
        data: {
          revision: current.revision + 1,
          status: 'ARCHIVED',
        },
        where: { id: levelId },
      });

      const response: AdminLevelItemDto = {
        archiveBlockers: [],
        cefrReference: updated.cefrReference,
        code: updated.code,
        id: updated.id,
        isPlayable: false,
        missions: [],
        name: updated.name,
        order: updated.order,
        pathId: updated.pathId,
        playabilityReasons: [],
        revision: updated.revision,
        status: updated.status,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'archiveLevel',
        input.idempotencyKey,
        requestHash,
        'ARCHIVE_LEVEL',
        'Level',
        levelId,
        current,
        response,
        { levelId },
        response,
        200,
      );

      return response;
    });
  }

  async reorderLevels(
    pathId: string,
    actorId: string,
    input: ReorderCurriculumInput,
  ): Promise<AdminLevelItemDto[]> {
    const requestHash = this.computeRequestHash({
      orderedIds: input.orderedIds,
      pathId,
    });

    const cached = await this.checkReceipt<AdminLevelItemDto[]>(
      actorId,
      'reorderLevels',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const levels = await tx.level.findMany({
        where: { pathId },
      });

      let ordered;
      try {
        ordered = validateCompleteOrder({
          existingSiblings: levels,
          orderedIds: input.orderedIds,
        });
      } catch (err) {
        if (err instanceof CurriculumReorderPolicyError) {
          throw new UnprocessableEntityException({
            code: err.code,
            message: err.message,
            statusCode: 422,
          });
        }
        throw err;
      }

      // Step 1: Temporarily assign negative orders to avoid @@unique([pathId, order]) collision
      for (let i = 0; i < ordered.length; i++) {
        await tx.level.update({
          data: { order: -(i + 1000) },
          where: { id: ordered[i]!.id },
        });
      }

      // Step 2: Assign target 1-based contiguous order
      const results: AdminLevelItemDto[] = [];
      for (const item of ordered) {
        const updated = await tx.level.update({
          data: {
            order: item.order,
            revision: { increment: 1 },
          },
          where: { id: item.id },
        });

        results.push({
          archiveBlockers: [],
          cefrReference: updated.cefrReference,
          code: updated.code,
          id: updated.id,
          isPlayable: updated.status === 'PUBLISHED',
          missions: [],
          name: updated.name,
          order: updated.order,
          pathId: updated.pathId,
          playabilityReasons: [],
          revision: updated.revision,
          status: updated.status,
        });
      }

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'reorderLevels',
        input.idempotencyKey,
        requestHash,
        'REORDER_LEVELS',
        'LearningPath',
        pathId,
        levels.map((l) => ({ id: l.id, order: l.order })),
        ordered,
        { pathId },
        results,
        200,
      );

      return results;
    });
  }

  // ---------------- MISSION COMMANDS ----------------

  async createMission(
    actorId: string,
    input: CreateMissionInput,
  ): Promise<AdminMissionItemDto> {
    const requestHash = this.computeRequestHash({
      levelId: input.levelId,
      objective: input.objective,
      order: input.order,
      purpose: input.purpose ?? 'LEARNING',
      slug: input.slug,
      title: input.title,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto>(
      actorId,
      'createMission',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const level = await tx.level.findUnique({
        where: { id: input.levelId },
      });
      if (!level) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Level ${input.levelId} not found`,
          statusCode: 404,
        });
      }

      const existingSlug = await tx.mission.findUnique({
        where: { slug: input.slug },
      });
      if (existingSlug) {
        throw new ConflictException({
          code: 'SLUG_ALREADY_EXISTS',
          message: `Mission with slug '${input.slug}' already exists`,
          statusCode: 409,
        });
      }

      let order = input.order;
      if (order === undefined) {
        const maxOrder = await tx.mission.aggregate({
          _max: { order: true },
          where: { levelId: input.levelId },
        });
        order = (maxOrder._max.order ?? 0) + 1;
      }

      const mission = await tx.mission.create({
        data: {
          levelId: input.levelId,
          objective: input.objective,
          order,
          purpose: input.purpose ?? 'LEARNING',
          revision: 1,
          slug: input.slug,
          status: 'DRAFT',
          title: input.title,
        },
      });

      const response: AdminMissionItemDto = {
        archiveBlockers: [],
        id: mission.id,
        isPlayable: false,
        lessons: [],
        levelId: mission.levelId,
        objective: mission.objective,
        order: mission.order,
        playabilityReasons: ['Mission is in DRAFT status'],
        purpose: mission.purpose,
        revision: mission.revision,
        slug: mission.slug,
        status: mission.status,
        title: mission.title,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'createMission',
        input.idempotencyKey,
        requestHash,
        'CREATE_MISSION',
        'Mission',
        mission.id,
        null,
        response,
        { levelId: input.levelId, slug: mission.slug },
        response,
        201,
      );

      return response;
    });
  }

  async updateMission(
    missionId: string,
    actorId: string,
    input: UpdateMissionInput,
  ): Promise<AdminMissionItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      missionId,
      objective: input.objective,
      title: input.title,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto>(
      actorId,
      'updateMission',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.mission.findUnique({
        where: { id: missionId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Mission ${missionId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      try {
        assertMutableIdentity({
          current: {
            isPublished: current.status === 'PUBLISHED',
            purpose: current.purpose,
            slug: current.slug,
            status: current.status,
          },
          proposed: {},
          resourceType: 'MISSION',
        });
      } catch (err) {
        if (err instanceof CurriculumMutationPolicyError) {
          throw new ConflictException({
            code: err.code,
            message: err.message,
            statusCode: 409,
          });
        }
        throw err;
      }

      const updated = await tx.mission.update({
        data: {
          objective: input.objective ?? current.objective,
          revision: current.revision + 1,
          title: input.title ?? current.title,
        },
        where: { id: missionId },
      });

      const response: AdminMissionItemDto = {
        archiveBlockers: [],
        id: updated.id,
        isPlayable: updated.status === 'PUBLISHED',
        lessons: [],
        levelId: updated.levelId,
        objective: updated.objective,
        order: updated.order,
        playabilityReasons: [],
        purpose: updated.purpose,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
        title: updated.title,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'updateMission',
        input.idempotencyKey,
        requestHash,
        'UPDATE_MISSION',
        'Mission',
        missionId,
        current,
        response,
        { missionId },
        response,
        200,
      );

      return response;
    });
  }

  async publishMission(
    missionId: string,
    actorId: string,
    input: PublishMissionInput,
  ): Promise<AdminMissionItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      missionId,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto>(
      actorId,
      'publishMission',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.mission.findUnique({
        include: {
          lessons: {
            include: {
              lesson: {
                include: {
                  currentPublishedVersion: {
                    include: { activities: true },
                  },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        where: { id: missionId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Mission ${missionId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const lessonItems = current.lessons.map((ml) => ({
        currentPublishedVersion: ml.lesson.currentPublishedVersion
          ? {
              activities: ml.lesson.currentPublishedVersion.activities.map((a) => ({
                id: a.id,
                learningBlock: a.learningBlock,
                skills: a.skills,
              })),
            }
          : null,
        id: ml.lessonId,
        status: (ml.lesson.currentPublishedVersion ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
      }));

      try {
        assertPlayableMissionLessons({
          lessons: lessonItems,
          missionPurpose: current.purpose,
          missionStatus: 'PUBLISHED',
        });
      } catch (err) {
        if (err instanceof CurriculumMutationPolicyError) {
          throw new ConflictException({
            code: err.code,
            message: err.message,
            statusCode: 409,
          });
        }
        throw err;
      }

      const updated = await tx.mission.update({
        data: {
          revision: current.revision + 1,
          status: 'PUBLISHED',
        },
        where: { id: missionId },
      });

      const response: AdminMissionItemDto = {
        archiveBlockers: [],
        id: updated.id,
        isPlayable: true,
        lessons: current.lessons.map((ml) => ({
          currentPublishedVersionId: ml.lesson.currentPublishedVersionId,
          currentPublishedVersionNumber: ml.lesson.currentPublishedVersion?.version ?? null,
          hasAudio: false,
          id: ml.lessonId,
          order: ml.order,
          slug: ml.lesson.slug,
          title: ml.lesson.currentPublishedVersion?.title ?? null,
        })),
        levelId: updated.levelId,
        objective: updated.objective,
        order: updated.order,
        playabilityReasons: [],
        purpose: updated.purpose,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
        title: updated.title,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'publishMission',
        input.idempotencyKey,
        requestHash,
        'PUBLISH_MISSION',
        'Mission',
        missionId,
        current,
        response,
        { missionId },
        response,
        200,
      );

      return response;
    });
  }

  async archiveMission(
    missionId: string,
    actorId: string,
    input: ArchiveMissionInput,
  ): Promise<AdminMissionItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      missionId,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto>(
      actorId,
      'archiveMission',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const current = await tx.mission.findUnique({
        where: { id: missionId },
      });
      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Mission ${missionId} not found`,
          statusCode: 404,
        });
      }

      if (current.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${current.revision}`,
          statusCode: 409,
        });
      }

      const blockers = findArchiveBlockers({
        publishedChildCount: 0,
        resourceType: 'MISSION',
        status: current.status,
      });

      if (blockers.length > 0) {
        throw new ConflictException({
          blockers: blockers.map((b) => b.code),
          code: 'CURRICULUM_ARCHIVE_BLOCKED',
          message: 'Mission cannot be archived',
          statusCode: 409,
        });
      }

      const updated = await tx.mission.update({
        data: {
          revision: current.revision + 1,
          status: 'ARCHIVED',
        },
        where: { id: missionId },
      });

      const response: AdminMissionItemDto = {
        archiveBlockers: [],
        id: updated.id,
        isPlayable: false,
        lessons: [],
        levelId: updated.levelId,
        objective: updated.objective,
        order: updated.order,
        playabilityReasons: [],
        purpose: updated.purpose,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
        title: updated.title,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'archiveMission',
        input.idempotencyKey,
        requestHash,
        'ARCHIVE_MISSION',
        'Mission',
        missionId,
        current,
        response,
        { missionId },
        response,
        200,
      );

      return response;
    });
  }

  async reorderMissions(
    levelId: string,
    actorId: string,
    input: ReorderCurriculumInput,
  ): Promise<AdminMissionItemDto[]> {
    const requestHash = this.computeRequestHash({
      levelId,
      orderedIds: input.orderedIds,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto[]>(
      actorId,
      'reorderMissions',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const missions = await tx.mission.findMany({
        where: { levelId },
      });

      let ordered;
      try {
        ordered = validateCompleteOrder({
          existingSiblings: missions,
          orderedIds: input.orderedIds,
        });
      } catch (err) {
        if (err instanceof CurriculumReorderPolicyError) {
          throw new UnprocessableEntityException({
            code: err.code,
            message: err.message,
            statusCode: 422,
          });
        }
        throw err;
      }

      // Step 1: Temporarily assign negative orders to avoid @@unique([levelId, order]) collision
      for (let i = 0; i < ordered.length; i++) {
        await tx.mission.update({
          data: { order: -(i + 1000) },
          where: { id: ordered[i]!.id },
        });
      }

      // Step 2: Assign target 1-based contiguous order
      const results: AdminMissionItemDto[] = [];
      for (const item of ordered) {
        const updated = await tx.mission.update({
          data: {
            order: item.order,
            revision: { increment: 1 },
          },
          where: { id: item.id },
        });

        results.push({
          archiveBlockers: [],
          id: updated.id,
          isPlayable: updated.status === 'PUBLISHED',
          lessons: [],
          levelId: updated.levelId,
          objective: updated.objective,
          order: updated.order,
          playabilityReasons: [],
          purpose: updated.purpose,
          revision: updated.revision,
          slug: updated.slug,
          status: updated.status,
          title: updated.title,
        });
      }

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'reorderMissions',
        input.idempotencyKey,
        requestHash,
        'REORDER_MISSIONS',
        'Level',
        levelId,
        missions.map((m) => ({ id: m.id, order: m.order })),
        ordered,
        { levelId },
        results,
        200,
      );

      return results;
    });
  }

  async replaceMissionLessons(
    missionId: string,
    actorId: string,
    input: ReplaceMissionLessonsInput,
  ): Promise<AdminMissionItemDto> {
    const requestHash = this.computeRequestHash({
      expectedRevision: input.expectedRevision,
      lessonIds: input.lessonIds,
      missionId,
    });

    const cached = await this.checkReceipt<AdminMissionItemDto>(
      actorId,
      'replaceMissionLessons',
      input.idempotencyKey,
      requestHash,
    );
    if (cached) return cached;

    return this.database.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id: missionId },
      });
      if (!mission) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Mission ${missionId} not found`,
          statusCode: 404,
        });
      }

      if (mission.revision !== input.expectedRevision) {
        throw new ConflictException({
          code: 'CURRICULUM_REVISION_CONFLICT',
          message: `Revision conflict. Expected ${input.expectedRevision}, current is ${mission.revision}`,
          statusCode: 409,
        });
      }

      // Fetch lessons and published versions
      const lessons = await tx.lesson.findMany({
        include: {
          currentPublishedVersion: {
            include: { activities: true },
          },
        },
        where: { id: { in: input.lessonIds } },
      });

      if (lessons.length !== input.lessonIds.length) {
        throw new UnprocessableEntityException({
          code: 'INVALID_CURRICULUM_RELATIONSHIP',
          message: 'One or more lesson IDs do not exist',
          statusCode: 422,
        });
      }

      // Check playability policy
      const lessonItems = lessons.map((l) => ({
        currentPublishedVersion: l.currentPublishedVersion
          ? {
              activities: l.currentPublishedVersion.activities.map((a) => ({
                id: a.id,
                learningBlock: a.learningBlock,
                skills: a.skills,
              })),
            }
          : null,
        id: l.id,
        status: (l.currentPublishedVersion ? 'PUBLISHED' : 'DRAFT') as 'PUBLISHED' | 'DRAFT',
      }));

      try {
        assertPlayableMissionLessons({
          lessons: lessonItems,
          missionPurpose: mission.purpose,
          missionStatus: mission.status,
        });
      } catch (err) {
        if (err instanceof CurriculumMutationPolicyError) {
          if (err.code === 'CURRICULUM_NOT_PLAYABLE') {
            throw new ConflictException({
              code: err.code,
              message: err.message,
              statusCode: 409,
            });
          }
          throw new UnprocessableEntityException({
            code: err.code,
            message: err.message,
            statusCode: 422,
          });
        }
        throw err;
      }

      // Delete existing relationships
      await tx.missionLesson.deleteMany({
        where: { missionId },
      });

      // Insert new ordered relationships
      for (let i = 0; i < input.lessonIds.length; i++) {
        await tx.missionLesson.create({
          data: {
            lessonId: input.lessonIds[i]!,
            missionId,
            order: i + 1,
            revision: 1,
          },
        });
      }

      const updated = await tx.mission.update({
        data: {
          revision: mission.revision + 1,
        },
        where: { id: missionId },
      });

      const lessonMap = new Map(lessons.map((l) => [l.id, l]));
      const response: AdminMissionItemDto = {
        archiveBlockers: [],
        id: updated.id,
        isPlayable: updated.status === 'PUBLISHED',
        lessons: input.lessonIds.map((lid, idx) => {
          const l = lessonMap.get(lid)!;
          return {
            currentPublishedVersionId: l.currentPublishedVersionId,
            currentPublishedVersionNumber: l.currentPublishedVersion?.version ?? null,
            hasAudio: false,
            id: l.id,
            order: idx + 1,
            slug: l.slug,
            title: l.currentPublishedVersion?.title ?? null,
          };
        }),
        levelId: updated.levelId,
        objective: updated.objective,
        order: updated.order,
        playabilityReasons: [],
        purpose: updated.purpose,
        revision: updated.revision,
        slug: updated.slug,
        status: updated.status,
        title: updated.title,
      };

      await this.recordReceiptAndAudit(
        tx,
        actorId,
        'replaceMissionLessons',
        input.idempotencyKey,
        requestHash,
        'REPLACE_MISSION_LESSONS',
        'Mission',
        missionId,
        { missionId },
        response,
        { lessonIds: input.lessonIds, missionId },
        response,
        200,
      );

      return response;
    });
  }
}
