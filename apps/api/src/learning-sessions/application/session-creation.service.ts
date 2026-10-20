import { ConflictException, Injectable } from '@nestjs/common';
import type { ActivityAttempt, Prisma } from '@prisma/client';
import { sessionPlanSchema, type SessionDuration } from '@worklingo/contracts';
import { parseIeltsTopicManifest } from '@worklingo/content-format';

import type { PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import type { ScheduledReviewItemReference } from '../domain/session-plan.types.js';
import { planFoundationSession } from '../domain/session-planner.js';
import type { ActivityAttemptDto, LearningSessionDto } from './learning-session.types.js';

export const learningSessionInclude = {
  ieltsTopicSession: { include: { topicVersion: true } },
  attempts: { orderBy: { createdAt: 'asc' as const } },
  blocks: { orderBy: { order: 'asc' as const } },
  mission: { include: { level: { select: { code: true } } } },
} satisfies Prisma.LearningSessionInclude;

export type LearningSessionRecord = Prisma.LearningSessionGetPayload<{
  include: typeof learningSessionInclude;
}>;

export interface CreateMissionSessionInput {
  readonly topicSelection?: 'chosen' | 'random';
  readonly topicDurationFilter?: SessionDuration;
  readonly productivePairPerRespondBlock?: boolean;
  readonly clientSessionId: string;
  readonly curriculumRevisionId?: string | null;
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
      const existingPlan = sessionPlanSchema.parse(existing.planSnapshot);
      if (
        existing.durationMinutes !== input.durationMinutes ||
        (existing.curriculumRevisionId ?? null) !== (input.curriculumRevisionId ?? null) ||
        existing.lessonVersionId !== input.mission.lessonVersion.id ||
        existing.missionId !== input.mission.id
        || existingPlan.topicSelection !== input.topicSelection
        || existingPlan.topicDurationFilter !== input.topicDurationFilter
      ) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Session UUID is already associated with another target',
          statusCode: 409,
        });
      }
      return toLearningSessionDto(existing);
    }

    const basePlan = planFoundationSession({
      durationMinutes: input.durationMinutes,
      mission: input.mission,
      reviewItems: input.reviewItems,
      productivePairPerRespondBlock: input.productivePairPerRespondBlock ?? false,
    });
    const plan = input.topicSelection ? sessionPlanSchema.parse({ ...basePlan, topicSelection: input.topicSelection,
      ...(input.topicDurationFilter !== undefined ? { topicDurationFilter: input.topicDurationFilter } : {}) }) : basePlan;
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
        curriculumRevisionId: input.curriculumRevisionId ?? null,
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
    ...(session.ieltsTopicSession ? { ieltsTopic: { topicVersionId: session.ieltsTopicSession.topicVersionId, packSlug: session.ieltsTopicSession.packSlug, title: parseIeltsTopicManifest(session.ieltsTopicSession.topicVersion.content).title } } : {}),
    attempts: session.attempts.map(toActivityAttemptDto),
    blocks: session.blocks.map((block) => ({
      activityIds: block.activityIds,
      id: block.id,
      order: block.order,
      status: block.status.toLowerCase() as 'available' | 'completed',
      targetMinutes: block.targetMinutes,
      type: block.type,
    })),
    clientSessionId: session.clientSessionId,
    curriculumRevisionId: session.curriculumRevisionId,
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
