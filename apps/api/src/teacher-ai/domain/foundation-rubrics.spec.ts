import { describe, expect, it } from 'vitest';

import {
  aggregateEvaluation,
  resolveFoundationRubric,
} from './foundation-rubrics.js';

const languageEvaluation = {
  feedback: {
    correctedExample: 'Hello, I am Lan from the support team.',
    improvements: ['Use the complete workplace greeting.'],
    strengths: ['The introduction is easy to understand.'],
    summary: 'Bạn đã giới thiệu đúng bối cảnh công việc.',
  },
  scores: {
    clarity: 0.8,
    meaningAndLogic: 0.8,
    targetLanguage: 0.9,
    taskCompletion: 0.8,
  },
} as const;

describe('Foundation rubrics', () => {
  it('aggregates speaking shadowing with backend-owned weights', () => {
    const rubric = resolveFoundationRubric({ activityType: 'speaking', mode: 'shadowing' });
    const result = aggregateEvaluation(rubric, languageEvaluation, {
      accuracy: 0.9,
      completeness: 0.85,
      fluency: 0.7,
    });

    expect(rubric).toMatchObject({
      id: 'foundation-speaking-shadowing',
      version: '1',
      weights: {
        clarity: 0.15,
        meaningAndLogic: 0.15,
        pronunciationOrFluency: 0.2,
        targetLanguage: 0.25,
        taskCompletion: 0.25,
      },
    });
    expect(result.scores.pronunciationOrFluency).toBeCloseTo(0.8);
    expect(result.score).toBeCloseTo(0.825);
  });

  it('does not finalize speaking without speech-derived metrics', () => {
    const rubric = resolveFoundationRubric({ activityType: 'speaking', mode: 'shadowing' });

    expect(() => aggregateEvaluation(rubric, languageEvaluation)).toThrow(
      'Speech metrics are required',
    );
  });

  it('aggregates writing without inventing pronunciation evidence', () => {
    const rubric = resolveFoundationRubric({ activityType: 'writing' });
    const result = aggregateEvaluation(rubric, languageEvaluation);

    expect(rubric).toMatchObject({
      id: 'foundation-workplace-writing',
      version: '1',
      weights: {
        clarity: 0.2,
        meaningAndLogic: 0.25,
        targetLanguage: 0.25,
        taskCompletion: 0.3,
      },
    });
    expect(result.scores.pronunciationOrFluency).toBeNull();
    expect(result.score).toBeCloseTo(0.825);
  });

  it('rejects scores outside 0..1 and feedback beyond three improvements', () => {
    const rubric = resolveFoundationRubric({ activityType: 'writing' });

    expect(() => aggregateEvaluation(rubric, {
      ...languageEvaluation,
      scores: { ...languageEvaluation.scores, clarity: 1.1 },
    })).toThrow('Language evaluation response is invalid');
    expect(() => aggregateEvaluation(rubric, {
      ...languageEvaluation,
      feedback: {
        ...languageEvaluation.feedback,
        improvements: ['one', 'two', 'three', 'four'],
      },
    })).toThrow('Language evaluation response is invalid');
  });
});

