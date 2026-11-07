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
type AssessmentQuestion = NonNullable<
  AssessmentContext['objective']
>['questions'][number];
const semanticQuestion = (q: AssessmentQuestion) =>
  q.responseType === 'open_ended' ||
  (['fill_blank', 'short_answer'].includes(q.responseType ?? '') &&
    (Boolean(q.semanticCriteria) || !q.acceptedAnswers?.length));
const textQuestion = (q: AssessmentQuestion) =>
  ['fill_blank', 'short_answer', 'open_ended'].includes(q.responseType ?? '');
function objectiveAnswerCorrect(
  q: AssessmentQuestion,
  index: unknown,
  answer: unknown,
) {
  if (!textQuestion(q)) return index === q.answerIndex;
  if (typeof answer !== 'string') throw new Error('OBJECTIVE_RESPONSE_INVALID');
  const normalize = (value: string) =>
    q.answerCaseSensitive === false ? value.trim().toLowerCase() : value.trim();
  return (
    q.acceptedAnswers?.some((a) => normalize(a) === normalize(answer)) ?? false
  );
}
function objectiveVerdict(
  context: AssessmentContext,
): AssessmentProviderVerdict | null {
  const objective = context.objective;
  if (!objective) return null;
  const questions = objective.questions;
  // Semantic questions are routed to AI; objective keys are never compared as universal text equality.
  if (questions.some(semanticQuestion)) return null;
  const indexes = objective.answerIndexes;
  if (
    !Array.isArray(indexes) ||
    indexes.length !== questions.length ||
    indexes.some(
      (n, i) =>
        !Number.isInteger(n) ||
        (!textQuestion(questions[i]!)
          ? n < 0 || n >= questions[i]!.options.length
          : n !== -1),
    )
  )
    throw new Error('OBJECTIVE_RESPONSE_INVALID');
  const answers = objective.answers;
  const correct = questions.reduce((n, q, i) => {
    if (!textQuestion(q)) return n + (indexes[i] === q.answerIndex ? 1 : 0);
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
        quote: context.sources.submission.slice(0, 1000),
        start: 0,
        end: Math.min(context.sources.submission.length, 1000),
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
  if (context.skill === 'speaking' && !context.sources.submission.trim())
    return {
      status: 'NOT_SCORABLE' as const,
      totalScore: null,
      criteria: context.rubric.criteria.map((c) => ({
        id: c.id,
        description: c.description,
        required: c.required,
        weight: c.weight,
        level: null,
        rawScore: null,
        maximumScore: 3 as const,
        status: 'NEEDS_EVIDENCE' as const,
        evidenceIds: [],
        rationale: 'No transcribed learner speech is available.',
        feedback: 'Wait for transcription or submit another recording.',
      })),
      evidence: [],
      feedback:
        'Transcription is pending or unavailable. No language or acoustic score was assigned.',
      confidence: 'UNKNOWN' as const,
      corrections: [],
      providers: [] as AssessmentProviderMetadata[],
      decisions: [] as AssessmentProviderVerdict[],
    };
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
  // Mixed tasks retain objective verification; AI consensus cannot override an authored key.
  const objectiveIndexes =
    context.objective?.questions.flatMap((q, i) =>
      semanticQuestion(q) ? [] : [i],
    ) ?? [];
  const mixedObjective =
    context.objective && objectiveIndexes.length
      ? objectiveVerdict({
          ...context,
          objective: {
            questions: objectiveIndexes.map(
              (i) => context.objective!.questions[i]!,
            ),
            answerIndexes: objectiveIndexes.map(
              (i) => (context.objective!.answerIndexes as number[])[i],
            ),
            answers: objectiveIndexes.map(
              (i) =>
                (context.objective!.answers as string[] | undefined)?.[i] ?? '',
            ),
          },
        })
      : null;
  const objectiveMismatch = context.objective
    ? objectiveIndexes.some(
        (i) =>
          !objectiveAnswerCorrect(
            context.objective!.questions[i]!,
            (context.objective!.answerIndexes as number[])[i],
            (context.objective!.answers as string[] | undefined)?.[i],
          ),
      )
    : false;
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
    sameAssessmentDecision(first.verdict, second.verdict) &&
    !objectiveMismatch
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
      !objectiveMismatch &&
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
    decisions: mixedObjective ? [...decisions, mixedObjective] : decisions,
  };
}
