import { createHash } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { LearnerProfile, Prisma } from '@prisma/client';
import {
  onboardingStateSchema,
  type OnboardingStateDto,
  type PlacementAttemptDto,
  type SelfPlacementInput,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import {
  findPlayableLevels,
  type PlayableLevel,
  type PlayableLevelCandidate,
} from '../../curriculum/domain/playable-level-policy.js';
import { toPlacementAttemptDto } from './placement-attempt.mapper.js';

const SELF_PLACEMENT_OPERATION = 'onboarding:self-placement';

@Injectable()
export class OnboardingService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getState(learnerId: string): Promise<OnboardingStateDto> {
    const profile = await this.database.learnerProfile.findUnique({
      where: { userId: learnerId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Learner profile not found');
    if (profile.user.role !== 'LEARNER') throw new ForbiddenException('Learner onboarding is required');

    const [levels, activeAttempt] = await Promise.all([
      this.findPlayableLevels(this.database),
      profile.onboardingStatus === 'PENDING'
        ? this.database.placementAttempt.findFirst({
            where: { learnerId, status: { not: 'CONFIRMED' } },
            orderBy: { updatedAt: 'desc' },
          })
        : null,
    ]);
    return this.buildState(
      profile,
      levels,
      activeAttempt ? toPlacementAttemptDto(activeAttempt) : null,
    );
  }

  async confirmSelfPlacement(
    learnerId: string,
    input: SelfPlacementInput,
  ): Promise<OnboardingStateDto> {
    const selectedLevelCode = input.selectedLevelCode.trim();
    const requestHash = this.requestHash({ selectedLevelCode });
    const replay = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId: learnerId,
          idempotencyKey: input.clientConfirmationId,
          operation: SELF_PLACEMENT_OPERATION,
        },
      },
    });
    if (replay) return this.replayOrThrow(replay.requestHash, requestHash, replay.responseBody);

    return this.database.$transaction(async (transaction) => {
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
            operation: SELF_PLACEMENT_OPERATION,
          },
        },
      });
      if (lockedReplay) {
        return this.replayOrThrow(
          lockedReplay.requestHash,
          requestHash,
          lockedReplay.responseBody,
        );
      }
      if (profile.onboardingStatus === 'COMPLETE') {
        throw new ConflictException({
          code: 'ONBOARDING_ALREADY_COMPLETE',
          message: 'Learner onboarding is already complete',
          statusCode: 409,
        });
      }

      const levels = await this.findPlayableLevels(transaction);
      const selected = levels.find((level) => level.code === selectedLevelCode);
      if (!selected?.available) {
        throw new UnprocessableEntityException({
          code: 'LEVEL_NOT_PLAYABLE',
          message: selected?.reason ?? 'Selected level is not available',
          statusCode: 422,
        });
      }

      const onboardedAt = new Date();
      const updated = await transaction.learnerProfile.update({
        where: { userId: learnerId },
        data: {
          currentLevelCode: selected.code,
          onboardedAt,
          onboardingMethod: 'SELF_SELECTED',
          onboardingStatus: 'COMPLETE',
        },
      });
      const response = this.buildState(updated, levels);
      await transaction.auditLog.create({
        data: {
          action: 'onboarding.self_placement.confirmed',
          actorId: learnerId,
          metadata: { method: 'SELF_SELECTED' },
          newState: { levelCode: selected.code },
          oldState: { levelCode: profile.currentLevelCode },
          resourceId: learnerId,
          resourceType: 'LearnerProfile',
        },
      });
      await transaction.mutationReceipt.create({
        data: {
          actorId: learnerId,
          idempotencyKey: input.clientConfirmationId,
          operation: SELF_PLACEMENT_OPERATION,
          requestHash,
          responseBody: response as Prisma.InputJsonValue,
          responseStatus: 200,
        },
      });
      return response;
    }, { timeout: 15_000 });
  }

  buildState(
    profile: LearnerProfile,
    eligibleLevels: readonly PlayableLevel[],
    activePlacementAttempt: PlacementAttemptDto | null = null,
  ): OnboardingStateDto {
    const nextAction = profile.onboardingStatus === 'COMPLETE'
      ? 'open_dashboard'
      : activePlacementAttempt?.nextAction === 'continue_assessment'
        ? 'resume_placement'
        : activePlacementAttempt?.nextAction ?? 'choose_method';
    return onboardingStateSchema.parse({
      activePlacementAttempt: profile.onboardingStatus === 'COMPLETE' ? null : activePlacementAttempt,
      currentLevelCode: profile.onboardingStatus === 'COMPLETE'
        ? profile.currentLevelCode
        : null,
      eligibleLevels,
      nextAction,
      onboardingMethod: profile.onboardingMethod,
      onboardingStatus: profile.onboardingStatus,
    });
  }

  async findPlayableLevels(
    database: Prisma.TransactionClient,
  ): Promise<PlayableLevel[]> {
    const levels = await database.level.findMany({
      where: { path: { status: 'PUBLISHED' } },
      orderBy: [{ order: 'asc' }, { code: 'asc' }],
      include: {
        missions: {
          where: { purpose: 'LEARNING', status: 'PUBLISHED' },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                lesson: {
                  include: {
                    currentPublishedVersion: true,
                    versions: {
                      where: { status: 'PUBLISHED' },
                      orderBy: { version: 'desc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const candidates: PlayableLevelCandidate[] = levels.map((level) => ({
      cefrReference: level.cefrReference,
      code: level.code,
      missions: level.missions.flatMap((mission) => {
        const lesson = mission.lessons[0]?.lesson;
        const version = lesson?.currentPublishedVersion?.status === 'PUBLISHED'
          ? lesson.currentPublishedVersion
          : lesson?.versions[0];
        if (!version || version.status !== 'PUBLISHED') return [];
        const snapshot = lessonSnapshotSchema.safeParse(version.parsedContent);
        if (!snapshot.success) return [];
        return [{
          purpose: 'learning' as const,
          lessonVersion: { activities: snapshot.data.activities },
        }];
      }),
      name: level.name,
    }));
    return findPlayableLevels({ levels: candidates });
  }

  private requestHash(input: { selectedLevelCode: string }): string {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  private replayOrThrow(
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
