import { createHash } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  onboardingStateSchema,
  type ConfirmPlacementInput,
  type CreatePlacementAttemptInput,
  type OnboardingStateDto,
  type PlacementAttemptDto,
  type PlacementSkillResults,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { PilotMetricsService } from '../../analytics/application/pilot-metrics.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { SessionCreationService } from '../../learning-sessions/application/session-creation.service.js';
import { OnboardingService } from './onboarding.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { toPlacementAttemptDto } from './placement-attempt.mapper.js';

const PLACEMENT_CONFIRMATION_OPERATION = 'onboarding:placement-confirmation';

const initialSkillResults: PlacementSkillResults = {
  listening: { evidenceCount: 0, score: null, status: 'pending' },
  reading: { evidenceCount: 0, score: null, status: 'pending' },
  speaking: { evidenceCount: 0, score: null, status: 'pending' },
  writing: { evidenceCount: 0, score: null, status: 'pending' },
};

@Injectable()
export class PlacementAttemptsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(SessionCreationService) private readonly sessionCreation: SessionCreationService,
    @Inject(OnboardingService) private readonly onboarding: OnboardingService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
    @Optional() @Inject(PilotMetricsService) private readonly pilotMetrics?: PilotMetricsService,
  ) {}

  async create(
    learnerId: string,
    input: CreatePlacementAttemptInput,
  ): Promise<PlacementAttemptDto> {
    const replay = await this.database.placementAttempt.findUnique({
      where: {
        learnerId_clientAttemptId: {
          clientAttemptId: input.clientAttemptId,
          learnerId,
        },
      },
    });
    if (replay) return toPlacementAttemptDto(replay);

    const response = await this.database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "userId"
        FROM "LearnerProfile"
        WHERE "userId" = ${learnerId}::uuid
        FOR UPDATE
      `;
      const profile = await transaction.learnerProfile.findUnique({
        where: { userId: learnerId },
        include: { user: true },
      });
      if (!profile) throw new NotFoundException('Learner profile not found');
      if (profile.user.role !== 'LEARNER') throw new ForbiddenException('Learner onboarding is required');

      const lockedReplay = await transaction.placementAttempt.findUnique({
        where: {
          learnerId_clientAttemptId: {
            clientAttemptId: input.clientAttemptId,
            learnerId,
          },
        },
      });
      if (lockedReplay) return toPlacementAttemptDto(lockedReplay);
      if (profile.onboardingStatus === 'COMPLETE') {
        throw new ConflictException({
          code: 'ONBOARDING_ALREADY_COMPLETE',
          message: 'Learner onboarding is already complete',
          statusCode: 409,
        });
      }

      const active = await transaction.placementAttempt.findFirst({
        where: { learnerId, status: { not: 'CONFIRMED' } },
        orderBy: { updatedAt: 'desc' },
      });
      if (active) {
        throw new ConflictException({
          attemptId: active.id,
          code: 'PLACEMENT_ATTEMPT_ACTIVE',
          message: 'Resume the existing placement attempt',
          statusCode: 409,
        });
      }

      const mission = await this.curriculum.getPublishedPlacementMission(transaction);
      const session = await this.sessionCreation.create(transaction, {
        clientSessionId: input.clientAttemptId,
        durationMinutes: 45,
        learnerId,
        mission,
        reviewItems: [],
      });
      const attempt = await transaction.placementAttempt.create({
        data: {
          clientAttemptId: input.clientAttemptId,
          learnerId,
          learningSessionId: session.id,
          lessonVersionId: session.lessonVersionId,
          policyVersion: 'workplace-placement-v1',
          skillResults: initialSkillResults as unknown as Prisma.InputJsonValue,
        },
      });
      return toPlacementAttemptDto(attempt);
    }, { timeout: 15_000 });
    return response;
  }

  async getOwned(learnerId: string, id: string): Promise<PlacementAttemptDto> {
    const attempt = await this.database.placementAttempt.findFirst({ where: { id, learnerId } });
    if (!attempt) throw new NotFoundException('Placement attempt not found');
    const retryableAttemptIds = attempt.status === 'ACTION_REQUIRED'
      ? await this.findRetryableAttemptIds(learnerId, attempt.learningSessionId)
      : [];
    return toPlacementAttemptDto(attempt, retryableAttemptIds);
  }

  async confirm(
    learnerId: string,
    attemptId: string,
    input: ConfirmPlacementInput,
  ): Promise<OnboardingStateDto> {
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ attemptId }))
      .digest('hex');
    const replay = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId: learnerId,
          idempotencyKey: input.clientConfirmationId,
          operation: PLACEMENT_CONFIRMATION_OPERATION,
        },
      },
    });
    if (replay) return this.replayConfirmation(replay.requestHash, requestHash, replay.responseBody);

    const response = await this.database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "userId"
        FROM "LearnerProfile"
        WHERE "userId" = ${learnerId}::uuid
        FOR UPDATE
      `;
      const profile = await transaction.learnerProfile.findUnique({
        where: { userId: learnerId },
        include: { user: true },
      });
      if (!profile) throw new NotFoundException('Learner profile not found');
      if (profile.user.role !== 'LEARNER') throw new ForbiddenException('Learner onboarding is required');

      const lockedReplay = await transaction.mutationReceipt.findUnique({
        where: {
          actorId_operation_idempotencyKey: {
            actorId: learnerId,
            idempotencyKey: input.clientConfirmationId,
            operation: PLACEMENT_CONFIRMATION_OPERATION,
          },
        },
      });
      if (lockedReplay) {
        return this.replayConfirmation(
          lockedReplay.requestHash,
          requestHash,
          lockedReplay.responseBody,
        );
      }

      await transaction.$queryRaw`
        SELECT "id"
        FROM "PlacementAttempt"
        WHERE "id" = ${attemptId}::uuid AND "learnerId" = ${learnerId}::uuid
        FOR UPDATE
      `;
      const attempt = await transaction.placementAttempt.findFirst({
        where: { id: attemptId, learnerId },
      });
      if (!attempt) throw new NotFoundException('Placement attempt not found');
      if (profile.onboardingStatus === 'COMPLETE') {
        throw new ConflictException({
          code: 'ONBOARDING_ALREADY_COMPLETE',
          message: 'Learner onboarding is already complete',
          statusCode: 409,
        });
      }
      if (attempt.status !== 'RECOMMENDED' || !attempt.recommendedLevelCode) {
        throw new ConflictException({
          code: 'PLACEMENT_NOT_READY',
          message: 'Placement recommendation is not ready for confirmation',
          statusCode: 409,
        });
      }

      const levels = await this.onboarding.findPlayableLevels(transaction);
      const recommended = levels.find((level) => level.code === attempt.recommendedLevelCode);
      if (!recommended?.available) {
        throw new ConflictException({
          code: 'LEVEL_NO_LONGER_AVAILABLE',
          message: recommended?.reason ?? 'Recommended level is no longer available',
          statusCode: 409,
        });
      }

      const confirmedAt = new Date();
      await this.programContext.initializeIntermediate(transaction, learnerId, attempt.recommendedLevelCode);
      await transaction.placementAttempt.update({
        where: { id: attempt.id },
        data: { confirmedAt, status: 'CONFIRMED' },
      });
      const updatedProfile = await transaction.learnerProfile.update({
        where: { userId: learnerId },
        data: {
          currentLevelCode: attempt.recommendedLevelCode,
          onboardedAt: confirmedAt,
          onboardingMethod: 'PLACEMENT',
          onboardingStatus: 'COMPLETE',
        },
      });
      const response = this.onboarding.buildState(updatedProfile, levels);
      await transaction.auditLog.create({
        data: {
          action: 'onboarding.placement.confirmed',
          actorId: learnerId,
          metadata: {
            lessonVersionId: attempt.lessonVersionId,
            method: 'PLACEMENT',
            policyVersion: attempt.policyVersion,
          },
          newState: { levelCode: attempt.recommendedLevelCode },
          oldState: { levelCode: profile.currentLevelCode },
          resourceId: attempt.id,
          resourceType: 'PlacementAttempt',
        },
      });
      await transaction.mutationReceipt.create({
        data: {
          actorId: learnerId,
          idempotencyKey: input.clientConfirmationId,
          operation: PLACEMENT_CONFIRMATION_OPERATION,
          requestHash,
          responseBody: response as Prisma.InputJsonValue,
          responseStatus: 200,
        },
      });
      return response;
    }, { timeout: 15_000 });
    await this.pilotMetrics?.recordBestEffort({
      dimensions: {
        ...(response.currentLevelCode ? { levelCode: response.currentLevelCode } : {}),
        outcome: 'test_placement',
      },
      eventType: 'ONBOARDING_CONFIRMED',
      sourceKey: `placement:${attemptId}:onboarding-confirmed`,
    });
    await this.pilotMetrics?.recordBestEffort({
      dimensions: {
        ...(response.currentLevelCode ? { levelCode: response.currentLevelCode } : {}),
        outcome: 'passed',
      },
      eventType: 'PLACEMENT_CONFIRMED',
      sourceKey: `placement:${attemptId}:confirmed`,
    });
    return response;
  }

  private async findRetryableAttemptIds(
    learnerId: string,
    learningSessionId: string,
  ): Promise<string[]> {
    const attempts = await this.database.activityAttempt.findMany({
      where: {
        evaluationStatus: 'EVALUATION_FAILED',
        learnerId,
        sessionId: learningSessionId,
      },
      include: { recording: true },
    });
    if (attempts.length === 0) return [];
    const jobs = await this.database.job.findMany({
      where: {
        createdById: learnerId,
        resourceId: { in: attempts.map((attempt) => attempt.id) },
        resourceType: 'ActivityAttempt',
        status: 'FAILED',
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: { resourceId: true, retryable: true, type: true },
    });
    const attemptsById = new Map(attempts.map((attempt) => [attempt.id, attempt]));
    const retryable = new Set<string>();
    const inspected = new Set<string>();
    for (const job of jobs) {
      if (!job.resourceId || inspected.has(job.resourceId)) continue;
      inspected.add(job.resourceId);
      if (!job.retryable) continue;
      const attempt = attemptsById.get(job.resourceId);
      if (!attempt) continue;
      const sourceAvailable = job.type !== 'TRANSCRIBE_SPEECH'
        || Boolean(attempt.recording
          && !attempt.recording.deletedAt
          && !attempt.recording.deletionRequestedAt);
      if (sourceAvailable) retryable.add(job.resourceId);
    }
    return [...retryable];
  }

  private replayConfirmation(
    existingHash: string,
    requestHash: string,
    responseBody: Prisma.JsonValue,
  ): OnboardingStateDto {
    if (existingHash !== requestHash) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Confirmation UUID is already associated with another target',
        statusCode: 409,
      });
    }
    return onboardingStateSchema.parse(responseBody);
  }
}
