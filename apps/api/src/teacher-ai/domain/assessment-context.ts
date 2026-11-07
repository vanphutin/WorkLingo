import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { AssessmentSkill } from '@worklingo/contracts';
import {
  activitySchema,
  lessonSnapshotSchema,
} from '../../curriculum/domain/curriculum.types.js';
import { resolveAssessmentRubric } from './assessment-rubrics.js';
import type { AssessmentEvidenceSources } from './assessment-scoring.js';
export const ASSESSMENT_POLICY_VERSION = 'r22-evidence/1';
export const ASSESSMENT_PROMPT_VERSION = 'r22-independent/1';
export const assessmentHash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface AssessmentContextInput {
  readonly id: string;
  readonly learnerId: string;
  readonly activityId: string;
  readonly rawResponse: unknown;
  readonly activity: unknown;
  readonly session: {
    readonly lessonVersionId: string;
    readonly lessonVersion: {
      readonly id: string;
      readonly parsedContent: unknown;
    };
    readonly mission: { readonly level: { readonly code: string } };
  };
}
export function resolveAssessmentContext(
  attempt: AssessmentContextInput,
  programVersionId: string | null,
) {
  if (attempt.session.lessonVersion.id !== attempt.session.lessonVersionId)
    throw new Error('LESSON_SNAPSHOT_MISMATCH');
  const snapshot = lessonSnapshotSchema.parse(
    attempt.session.lessonVersion.parsedContent,
  );
  const activity = activitySchema.parse(attempt.activity);
  const bound = snapshot.activities.find((x) => x.id === attempt.activityId);
  if (
    !bound ||
    activity.id !== attempt.activityId ||
    !isDeepStrictEqual(bound, activity)
  )
    throw new Error('ACTIVITY_SNAPSHOT_MISMATCH');
  const referenced = snapshot.contentBlocks.filter((x) =>
    activity.contentReferences.includes(x.slug),
  );
  if (referenced.length !== new Set(activity.contentReferences).size)
    throw new Error('CONTENT_REFERENCE_MISMATCH');
  const response = attempt.rawResponse as Record<string, unknown>;
  const submission =
    typeof response.text === 'string'
      ? response.text.trim()
      : JSON.stringify(response);
  if (!submission || submission.length > 20000)
    throw new Error('SUBMISSION_INVALID');
  const rubric = resolveAssessmentRubric(
    activity.activityType as AssessmentSkill,
  );
  const passage = referenced.map((x) => x.text).join('\n');
  const sources: AssessmentEvidenceSources = {
    submission,
    passage,
    ...(activity.activityType === 'listening'
      ? { transcript: activity.payload.audioText ?? passage }
      : {}),
  };
  const privateContext = {
    prompt: activity.payload.prompt,
    levelCode: attempt.session.mission.level.code,
    content: referenced.map((x) => ({ slug: x.slug, text: x.text })),
    taskCriteria: snapshot.foundation?.responseRubrics[activity.slug] ?? null,
    payload: activity.payload,
    objectives:
      snapshot.foundation?.objectives.filter((x) =>
        snapshot.foundation!.activityObjectives[activity.slug]?.includes(
          x.slug,
        ),
      ) ?? [],
    audioIdentity: null as unknown,
  };
  const contextHash = assessmentHash({
    programVersionId,
    lessonVersionId: attempt.session.lessonVersionId,
    activityId: activity.id,
    rubric,
    privateContext,
    policy: ASSESSMENT_POLICY_VERSION,
    prompt: ASSESSMENT_PROMPT_VERSION,
  });
  return {
    submissionId: attempt.id,
    learnerId: attempt.learnerId,
    programVersionId,
    lessonVersionId: attempt.session.lessonVersionId,
    activityId: activity.id,
    skill: activity.activityType,
    rubric,
    privateContext,
    sources,
    contextHash,
    inputHash: assessmentHash({ submission, contextHash }),
    objective:
      activity.activityType === 'reading' ||
      activity.activityType === 'listening'
        ? {
            questions: activity.payload.questions,
            answerIndexes: response.answerIndexes,
            answers: response.answers,
          }
        : null,
  };
}
export type AssessmentContext = ReturnType<typeof resolveAssessmentContext>;
