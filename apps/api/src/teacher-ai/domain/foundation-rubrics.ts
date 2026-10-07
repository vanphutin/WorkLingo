import type { EvaluationDimensionScores, EvaluationFeedback } from '@worklingo/contracts';
import { z } from 'zod';

import {
  languageEvaluationSchema,
  type LanguageEvaluation,
} from '../../ai-gateway/domain/language-evaluation.schema.js';
import type { SpeechPronunciationMetrics } from '../../ai-gateway/domain/speech-to-text.port.js';

const scoreSchema = z.number().min(0).max(1);
const speechMetricsSchema = z.object({
  accuracy: scoreSchema,
  completeness: scoreSchema.optional(),
  fluency: scoreSchema,
  prosody: scoreSchema.optional(),
}).strict();

export interface FoundationRubric {
  readonly id: 'foundation-speaking-shadowing' | 'foundation-workplace-writing';
  readonly version: '1';
  readonly activityType: 'speaking' | 'writing';
  readonly weights: Readonly<{
    taskCompletion: number;
    meaningAndLogic: number;
    targetLanguage: number;
    clarity: number;
    pronunciationOrFluency?: number;
  }>;
}

const speakingRubric: FoundationRubric = {
  id: 'foundation-speaking-shadowing',
  version: '1',
  activityType: 'speaking',
  weights: {
    taskCompletion: 0.25,
    meaningAndLogic: 0.15,
    targetLanguage: 0.25,
    clarity: 0.15,
    pronunciationOrFluency: 0.2,
  },
};

const writingRubric: FoundationRubric = {
  id: 'foundation-workplace-writing',
  version: '1',
  activityType: 'writing',
  weights: {
    taskCompletion: 0.3,
    meaningAndLogic: 0.25,
    targetLanguage: 0.25,
    clarity: 0.2,
  },
};

export const resolveFoundationRubric = (
  input: { readonly activityType: 'speaking'; readonly mode: 'shadowing' }
    | { readonly activityType: 'writing' },
): FoundationRubric => input.activityType === 'speaking' ? speakingRubric : writingRubric;

export interface AggregatedEvaluation {
  readonly scores: EvaluationDimensionScores;
  readonly score: number;
  readonly feedback: EvaluationFeedback;
}

const validateLanguageEvaluation = (input: unknown): LanguageEvaluation => {
  const result = languageEvaluationSchema.safeParse(input);
  if (!result.success) {
    throw new Error('Language evaluation response is invalid', { cause: result.error });
  }
  return result.data;
};

export const aggregateEvaluation = (
  rubric: FoundationRubric,
  input: unknown,
  speechMetrics?: SpeechPronunciationMetrics,
): AggregatedEvaluation => {
  const language = validateLanguageEvaluation(input);
  let pronunciationOrFluency: number | null = null;

  if (rubric.activityType === 'speaking') {
    const result = speechMetricsSchema.safeParse(speechMetrics);
    if (!result.success) {
      throw new Error('Speech metrics are required for speaking evaluation', { cause: result.error });
    }
    pronunciationOrFluency = (result.data.accuracy + result.data.fluency) / 2;
  }

  const scores: EvaluationDimensionScores = {
    ...language.scores,
    pronunciationOrFluency,
  };
  const score = (
    scores.taskCompletion * rubric.weights.taskCompletion
    + scores.meaningAndLogic * rubric.weights.meaningAndLogic
    + scores.targetLanguage * rubric.weights.targetLanguage
    + scores.clarity * rubric.weights.clarity
    + (scores.pronunciationOrFluency ?? 0) * (rubric.weights.pronunciationOrFluency ?? 0)
  );

  return { scores, score, feedback: language.feedback };
};
