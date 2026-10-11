import { ConflictException, Injectable } from '@nestjs/common';
import type { ActivityAttempt, Prisma } from '@prisma/client';
import { sessionPlanSchema } from '@worklingo/contracts';

import type { PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import type { ScheduledReviewItemReference } from '../domain/session-plan.types.js';
import { planFoundationSession } from '../domain/session-planner.js';
import type { ActivityAttemptDto, LearningSessionDto } from './learning-session.types.js';

export const learningSessionInclude = {
  attempts: { orderBy: { createdAt: 'asc' as const } },
  blocks: { orderBy: { order: 'asc' as const } },
  mission: true,
} satisfies Prisma.LearningSessionInclude;

export type LearningSessionRecord = Prisma.LearningSessionGetPayload<{
  include: typeof learningSessionInclude;
}>;

export interface CreateMissionSessionInput {
  readonly clientSessionId: string;
  readonly durationMinutes: number;
  readonly learnerId: string;
  readonly mission: PublishedMission;
  readonly reviewItems: readonly ScheduledReviewItemReference[];
}

@Injectable()
export class SessionCreationService {
  async create(
    transaction: Prisma.TransactionClient,
    input: CreateMissionSessionInput,
  ): Promise<LearningSessionDto> {
    const existing = await transaction.learningSession.findUnique({
      where: {
        learnerId_clientSessionId: {
          clientSessionId: input.clientSessionId,
          learnerId: input.learnerId,
        },
      },
      include: learningSessionInclude,
    });
    if (existing) {
      if (
        existing.durationMinutes !== input.durationMinutes ||
        existing.lessonVersionId !== input.mission.lessonVersion.id ||
        existing.missionId !== input.mission.id
      ) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Session UUID is already associated with another target',
          statusCode: 409,
        });
      }
      return toLearningSessionDto(existing);
    }

    const plan = planFoundationSession({
      durationMinutes: input.durationMinutes,
      mission: input.mission,
      reviewItems: input.reviewItems,
    });
    const created = await transaction.learningSession.create({
      data: {
        blocks: {
          create: plan.blocks.map((block) => ({
            activityIds: [...block.activityIds],
            order: block.order,
            targetMinutes: block.targetMinutes,
            type: block.type,
          })),
        },
        clientSessionId: input.clientSessionId,
        durationMinutes: input.durationMinutes,
        learnerId: input.learnerId,
        lessonVersionId: input.mission.lessonVersion.id,
        missionId: input.mission.id,
        planSnapshot: plan as unknown as Prisma.InputJsonValue,
      },
      include: learningSessionInclude,
    });
    return toLearningSessionDto(created);
  }
}

export function toLearningSessionDto(session: LearningSessionRecord): LearningSessionDto {
  const plan = sessionPlanSchema.parse(session.planSnapshot);
  return {
    attempts: session.attempts.map(toActivityAttemptDto),
    blocks: session.blocks.map((block) => ({
      activityIds: block.activityIds,
      id: block.id,
      order: block.order,
      status: block.status.toLowerCase() as 'available' | 'completed',
      targetMinutes: 15,
      type: block.type,
    })),
    clientSessionId: session.clientSessionId,
    currentCheckpoint: session.currentCheckpoint,
    durationMinutes: session.durationMinutes as LearningSessionDto['durationMinutes'],
    id: session.id,
    lessonVersionId: session.lessonVersionId,
    mission: { id: session.mission.id, title: session.mission.title },
    plan,
    purpose: session.mission.purpose === 'PLACEMENT' ? 'placement' : 'learning',
    status: session.status.toLowerCase() as LearningSessionDto['status'],
  };
}

function toActivityAttemptDto(attempt: ActivityAttempt): ActivityAttemptDto {
  return {
    activityId: attempt.activityId,
    clientAttemptId: attempt.clientAttemptId,
    createdAt: attempt.createdAt.toISOString(),
    evaluationStatus: attempt.evaluationStatus.toLowerCase() as ActivityAttemptDto['evaluationStatus'],
    feedback: attempt.feedback,
    id: attempt.id,
    learnerId: attempt.learnerId,
    normalizedResponse: attempt.normalizedResponse,
    rawResponse: attempt.rawResponse,
    score: attempt.score,
    sessionId: attempt.sessionId,
  };
}
