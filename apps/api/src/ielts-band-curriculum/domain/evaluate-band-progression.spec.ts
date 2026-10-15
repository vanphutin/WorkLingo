import { describe, expect, it } from 'vitest';

import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { evaluateBandProgression } from './evaluate-band-progression.js';

const stage = INITIAL_IELTS_BAND_CURRICULUM.stages[0]!;

describe('evaluateBandProgression', () => {
  it('returns gaps and authored remediation when evidence is insufficient', () => {
    const result = evaluateBandProgression({ stage, completedSessions: 1, blocks: [
      { skill: 'listening', correct: true }, { skill: 'reading', correct: false },
    ] });
    expect(result.canAdvance).toBe(false);
    expect(result.unmetCriteria).toContain('Complete at least 2 integrated sessions.');
    expect(result.proficiency.find((item) => item.skill === 'writing')?.descriptor).toBe('insufficient_evidence');
    expect(result.remediation.map((item) => item.skill)).toEqual(['listening', 'reading', 'writing', 'speaking']);
  });

  it('advances only when every skill and the session threshold pass', () => {
    const blocks = ['listening', 'reading', 'writing', 'speaking'].flatMap((skill) => [
      { skill, correct: true }, { skill, correct: true },
    ]);
    const result = evaluateBandProgression({ stage, completedSessions: 2, blocks });
    expect(result.canAdvance).toBe(true);
    expect(result.unmetCriteria).toEqual([]);
    expect(result.practicePerformance).toEqual({ completedSessions: 2, evaluatedBlocks: 8, recentCorrectRate: 1 });
    expect(result.proficiency.every((item) => item.descriptor === 'advanced')).toBe(true);
  });
});
