import { describe, expect, it } from 'vitest';
import { scoreObjectiveAnswer, scoreProductiveSkills, toOverallMockBand } from './ielts-mock-scoring.js';

describe('IELTS mock scoring policy', () => {
  it('normalizes authored variations but rejects answers over the word limit', () => {
    const policy = { acceptedAnswers: ['New Zealand', 'NZ'], caseSensitive: false, maxWords: 2 };
    expect(scoreObjectiveAnswer('  new   zealand ', policy)).toBe(true);
    expect(scoreObjectiveAnswer('New Zealand office', policy)).toBe(false);
  });

  it('weights Writing Task 2 twice and averages Speaking criteria equally', () => {
    expect(scoreProductiveSkills({ writingTask1: [6, 6, 6, 6], writingTask2: [7, 7, 7, 7], speaking: [6, 6.5, 7, 6.5] })).toEqual({ writing: 6.5, speaking: 6.5 });
  });

  it('uses the official quarter and three-quarter overall rounding behavior', () => {
    expect(toOverallMockBand([6.5, 6.5, 5, 7])).toBe(6.5);
    expect(toOverallMockBand([4, 3.5, 4, 4])).toBe(4);
    expect(toOverallMockBand([6.5, 6.5, 5.5, 6])).toBe(6);
  });
});
