import type { PlacementAttempt } from '@prisma/client';
import { placementAttemptSchema, type PlacementAttemptDto } from '@worklingo/contracts';

export function toPlacementAttemptDto(
  attempt: PlacementAttempt,
  retryableAttemptIds: readonly string[] = [],
): PlacementAttemptDto {
  const nextAction = attempt.status === 'IN_PROGRESS'
    ? 'continue_assessment'
    : attempt.status === 'PROCESSING'
      ? 'wait_for_evaluation'
      : attempt.status === 'ACTION_REQUIRED'
        ? 'retry_evaluation'
        : attempt.status === 'RECOMMENDED'
          ? 'review_recommendation'
          : 'open_dashboard';

  return placementAttemptSchema.parse({
    clientAttemptId: attempt.clientAttemptId,
    confirmedAt: attempt.confirmedAt?.toISOString() ?? null,
    createdAt: attempt.createdAt.toISOString(),
    explanation: attempt.explanation,
    id: attempt.id,
    learningSessionId: attempt.learningSessionId,
    lessonVersionId: attempt.lessonVersionId,
    nextAction,
    policyVersion: attempt.policyVersion,
    recommendedLevelCode: attempt.recommendedLevelCode,
    retryableAttemptIds,
    skillResults: attempt.skillResults,
    status: attempt.status,
    updatedAt: attempt.updatedAt.toISOString(),
  });
}
