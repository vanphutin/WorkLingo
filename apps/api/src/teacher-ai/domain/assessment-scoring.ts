import {
  assessmentProviderVerdictSchema,
  type AssessmentCriterion,
  type AssessmentEvidence,
  type AssessmentProviderVerdict,
} from '@worklingo/contracts';
import type { AssessmentRubric } from './assessment-rubrics.js';
export interface AssessmentEvidenceSources {
  readonly submission: string;
  readonly passage?: string;
  readonly transcript?: string;
  readonly acoustic?: {
    readonly checksum: string;
    readonly durationMs: number;
    readonly verified: boolean;
    readonly dimensions: readonly string[];
  };
}
export function validateAssessmentEvidence(
  evidence: readonly AssessmentEvidence[],
  sources: AssessmentEvidenceSources,
): void {
  if (new Set(evidence.map((x) => x.id)).size !== evidence.length)
    throw new Error('EVIDENCE_INVALID');
  for (const item of evidence) {
    if (item.source === 'audio') {
      if (
        !sources.acoustic?.verified ||
        item.startMs === null ||
        item.endMs === null ||
        item.startMs >= item.endMs ||
        item.endMs > sources.acoustic.durationMs ||
        item.start !== null ||
        item.end !== null
      )
        throw new Error('EVIDENCE_INVALID');
    } else {
      const source = sources[item.source];
      if (
        typeof source !== 'string' ||
        item.start === null ||
        item.end === null ||
        item.start >= item.end ||
        source.slice(item.start, item.end) !== item.quote ||
        item.startMs !== null ||
        item.endMs !== null
      )
        throw new Error('EVIDENCE_INVALID');
    }
  }
}
export function aggregateAssessment(
  rubric: AssessmentRubric,
  input: unknown,
  evidence: readonly AssessmentEvidence[],
  sources: AssessmentEvidenceSources,
) {
  const verdict = assessmentProviderVerdictSchema.parse(input);
  const ids = verdict.criteria.map((x) => x.id);
  if (
    ids.length !== rubric.criteria.length ||
    new Set(ids).size !== ids.length ||
    rubric.criteria.some((x) => !ids.includes(x.id))
  )
    throw new Error('CRITERION_SET_INVALID');
  validateAssessmentEvidence(evidence, sources);
  const byEvidence = new Map(evidence.map((x) => [x.id, x]));
  for (const correction of verdict.corrections) {
    if (
      correction.start >= correction.end ||
      correction.end > sources.submission.length
    )
      throw new Error('CORRECTION_INVALID');
  }
  let missingAcoustic = false;
  const criteria: AssessmentCriterion[] = rubric.criteria.map((spec) => {
    const item = verdict.criteria.find((x) => x.id === spec.id)!;
    if (item.evidenceIds.some((id) => !byEvidence.has(id)))
      throw new Error('EVIDENCE_INVALID');
    const acousticAvailable =
      !spec.acoustic ||
      (sources.acoustic?.verified &&
        sources.acoustic.dimensions.includes(spec.id) &&
        item.evidenceIds.some((id) => byEvidence.get(id)?.source === 'audio'));
    if (!acousticAvailable) missingAcoustic = true;
    const scored =
      acousticAvailable &&
      item.status === 'SCORED' &&
      item.evidenceIds.length > 0;
    return {
      ...item,
      description: spec.description,
      required: spec.required,
      weight: spec.weight,
      maximumScore: 3,
      rawScore: scored ? item.level : null,
      level: scored ? item.level : null,
      status: scored ? 'SCORED' : 'NOT_SCORED',
    };
  });
  const complete =
    criteria.every((x) => !x.required || x.status === 'SCORED') &&
    verdict.confidence === 'HIGH';
  const totalScore = complete
    ? Math.round(
        (criteria.reduce((n, x) => n + x.rawScore! * x.weight, 0) /
          criteria.reduce((n, x) => n + x.weight, 0) /
          3) *
          10000,
      ) / 100
    : null;
  return {
    status: complete
      ? ('SCORED' as const)
      : missingAcoustic
        ? ('NOT_SCORABLE' as const)
        : ('NEEDS_REVIEW' as const),
    totalScore,
    criteria,
    evidence: [...evidence],
    feedback: verdict.summary,
    confidence: verdict.confidence,
    corrections: verdict.corrections,
  };
}
/** Whitelist learner evidence. Provider rationales can quote private sources and stay in admin audit only. */
export function projectLearnerAssessment<
  T extends {
    evidence: readonly AssessmentEvidence[];
    criteria: readonly { evidenceIds: readonly string[]; rationale: string }[];
    providers?: readonly { role: string }[];
  },
>(result: T, privatePhrases: readonly string[] = []) {
  const isolatedFeedback =
    result.providers?.some((p) => p.role === 'feedback') === true;
  const evidence = result.evidence
    .filter((x) => x.source === 'submission' || x.source === 'audio')
    .map((x) => (x.source === 'audio' ? { ...x, quote: '' } : x));
  const ids = new Set(evidence.map((x) => x.id));
  const keys = [
    'schemaVersion',
    'id',
    'submissionId',
    'learnerId',
    'programVersionId',
    'lessonVersionId',
    'activityId',
    'skill',
    'rubricId',
    'rubricVersion',
    'policyVersion',
    'promptVersion',
    'inputHash',
    'contextHash',
    'status',
    'totalScore',
    'maximumScore',
    'feedback',
    'confidence',
    'corrections',
    'providers',
    'previousEvaluationId',
    'createdAt',
    'completedAt',
  ] as const;
  const safe: Record<string, unknown> = Object.fromEntries(
    keys
      .filter((key) => Object.hasOwn(result, key))
      .map((key) => [key, result[key as keyof T]]),
  );
  const containsPrivate = (text: unknown) =>
    typeof text === 'string' &&
    privatePhrases.some(
      (phrase) =>
        phrase.length >= 3 && text.toLowerCase().includes(phrase.toLowerCase()),
    );
  if (!isolatedFeedback || containsPrivate(safe.feedback))
    safe.feedback =
      'Review the criterion results and the evidence from your submitted response.';
  if (!isolatedFeedback) safe.corrections = [];
  else if (Array.isArray(safe.corrections))
    safe.corrections = safe.corrections.filter(
      (c) => !containsPrivate(c.replacement) && !containsPrivate(c.explanation),
    );
  return {
    ...safe,
    evidence,
    criteria: result.criteria.map((x) => ({
      ...x,
      ...(!isolatedFeedback ||
      containsPrivate((x as { feedback?: string }).feedback)
        ? {
            feedback:
              'Use the criterion result and your submitted evidence to guide your next practice.',
          }
        : {}),
      rationale: 'Refer to your submitted response and the linked evidence.',
      evidenceIds: x.evidenceIds.filter((id) => ids.has(id)),
    })),
  };
}
export function sameAssessmentDecision(
  a: AssessmentProviderVerdict,
  b: AssessmentProviderVerdict,
): boolean {
  return (
    a.confidence === 'HIGH' &&
    b.confidence === 'HIGH' &&
    a.criteria.length === b.criteria.length &&
    a.criteria.every((x) =>
      b.criteria.some(
        (y) => x.id === y.id && x.level === y.level && x.status === y.status,
      ),
    )
  );
}
