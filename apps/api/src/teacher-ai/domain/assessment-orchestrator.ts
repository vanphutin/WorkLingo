import type {
  AssessmentProviderMetadata,
  AssessmentProviderVerdict,
} from '@worklingo/contracts';
import {
  aggregateAssessment,
  sameAssessmentDecision,
} from './assessment-scoring.js';
import type { AssessmentContext } from './assessment-context.js';

export interface AssessmentProviderInput {
  readonly context: AssessmentContext;
  readonly role: 'primary' | 'verifier' | 'adjudicator' | 'feedback';
}
export interface AssessmentProviderResponse {
  readonly verdict: AssessmentProviderVerdict;
  readonly metadata: Omit<AssessmentProviderMetadata, 'role'>;
}
export interface AssessmentEvaluator {
  assess(
    input: AssessmentProviderInput,
    signal?: AbortSignal,
  ): Promise<AssessmentProviderResponse>;
}
function assertActive(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('ASSESSMENT_CANCELLED');
}
function objectiveVerdict(
  context: AssessmentContext,
): AssessmentProviderVerdict | null {
  const objective = context.objective;
  if (!objective) return null;
  const questions = objective.questions;
  // Semantic questions are routed to AI; objective keys are never compared as universal text equality.
  if (
    questions.some(
      (q) =>
        q.responseType === 'open_ended' ||
        q.semanticCriteria ||
        (['fill_blank', 'short_answer'].includes(q.responseType ?? '') &&
          !q.acceptedAnswers?.length),
    )
  )
    return null;
  const indexes = objective.answerIndexes;
  if (
    !Array.isArray(indexes) ||
    indexes.length !== questions.length ||
    indexes.some(
      (n, i) =>
        !Number.isInteger(n) ||
        (questions[i]!.options.length
          ? n < 0 || n >= questions[i]!.options.length
          : n !== -1),
    )
  )
    throw new Error('OBJECTIVE_RESPONSE_INVALID');
  const answers = objective.answers;
  const correct = questions.reduce((n, q, i) => {
    if (q.options.length) return n + (indexes[i] === q.answerIndex ? 1 : 0);
    if (!Array.isArray(answers) || typeof answers[i] !== 'string')
      throw new Error('OBJECTIVE_RESPONSE_INVALID');
    const normalize = (text: string) =>
      q.answerCaseSensitive === false ? text.trim().toLowerCase() : text.trim();
    return (
      n +
      (q.acceptedAnswers?.some(
        (a) => normalize(a) === normalize(answers[i] as string),
      )
        ? 1
        : 0)
    );
  }, 0);
  const level = Math.round((correct / questions.length) * 3);
  return {
    confidence: 'HIGH',
    summary:
      correct === questions.length
        ? 'The submitted answers match the authored objective criteria.'
        : 'Some submitted answers do not match the authored objective criteria.',
    corrections: [],
    evidence: [
      {
        id: 'submission',
        source: 'submission',
        quote: context.sources.submission,
        start: 0,
        end: context.sources.submission.length,
        startMs: null,
        endMs: null,
      },
    ],
    criteria: context.rubric.criteria.map((c) => ({
      id: c.id,
      level,
      status: 'SCORED',
      evidenceIds: ['submission'],
      rationale: 'Verified against the exact pinned objective question keys.',
      feedback:
        correct === questions.length
          ? 'Correct understanding.'
          : 'Review the source and try the task again.',
    })),
  };
}
export async function runAssessment(
  context: AssessmentContext,
  primary: AssessmentEvaluator | undefined,
  verifier: AssessmentEvaluator | undefined,
  signal?: AbortSignal,
  adjudicator?: AssessmentEvaluator,
) {
  assertActive(signal);
  const objective = objectiveVerdict(context);
  if (objective) {
    return {
      ...aggregateAssessment(
        context.rubric,
        objective,
        objective.evidence,
        context.sources,
      ),
      providers: [
        {
          role: 'objective' as const,
          name: 'worklingo-objective',
          model: null,
          modelFamily: null,
          requestId: null,
          inputTokens: null,
          outputTokens: null,
          costUsd: 0,
          latencyMs: 0,
          synthetic: false,
        },
      ],
      decisions: [objective],
    };
  }
  if (!primary) {
    return {
      status: 'NOT_SCORABLE' as const,
      totalScore: null,
      criteria: [],
      evidence: [],
      feedback:
        'Assessment is unavailable until a verified provider and evaluation policy are configured.',
      confidence: 'UNKNOWN' as const,
      corrections: [],
      providers: [],
      decisions: [],
    };
  }
  const first = await primary.assess({ context, role: 'primary' }, signal);
  assertActive(signal);
  const aggregate = aggregateAssessment(
    context.rubric,
    first.verdict,
    first.verdict.evidence,
    context.sources,
  );
  const providers: AssessmentProviderMetadata[] = [
    { ...first.metadata, role: 'primary' },
  ];
  const decisions = [first.verdict];
  if (!verifier)
    return {
      ...aggregate,
      status: 'NEEDS_REVIEW' as const,
      totalScore: null,
      providers,
      decisions,
    };
  const second = await verifier.assess({ context, role: 'verifier' }, signal);
  assertActive(signal);
  const verified = aggregateAssessment(
    context.rubric,
    second.verdict,
    second.verdict.evidence,
    context.sources,
  );
  providers.push({ ...second.metadata, role: 'verifier' });
  decisions.push(second.verdict);
  if (
    aggregate.status === 'SCORED' &&
    verified.status === 'SCORED' &&
    sameAssessmentDecision(first.verdict, second.verdict)
  )
    return { ...aggregate, providers, decisions };
  if (adjudicator) {
    const third = await adjudicator.assess(
      { context, role: 'adjudicator' },
      signal,
    );
    assertActive(signal);
    const adjudicated = aggregateAssessment(
      context.rubric,
      third.verdict,
      third.verdict.evidence,
      context.sources,
    );
    providers.push({ ...third.metadata, role: 'adjudicator' });
    decisions.push(third.verdict);
    if (
      adjudicated.status === 'SCORED' &&
      ((aggregate.status === 'SCORED' &&
        sameAssessmentDecision(third.verdict, first.verdict)) ||
        (verified.status === 'SCORED' &&
          sameAssessmentDecision(third.verdict, second.verdict)))
    )
      return { ...adjudicated, providers, decisions };
  }
  return {
    ...aggregate,
    status:
      aggregate.status === 'NOT_SCORABLE'
        ? ('NOT_SCORABLE' as const)
        : ('NEEDS_REVIEW' as const),
    totalScore: null,
    feedback:
      'Independent evaluation evidence is incomplete or decisions disagree; no total score is assigned.',
    providers,
    decisions,
  };
}
