import type { PlacementSkillResults } from '@worklingo/contracts';
import { describe, expect, it } from 'vitest';

import {
  recommendPlacement,
  WORKPLACE_PLACEMENT_V1_CANDIDATES,
  type PlacementPolicyCandidate,
} from './placement-policy.js';

const evaluated = (scores: Record<'listening' | 'reading' | 'speaking' | 'writing', number>): PlacementSkillResults => ({
  listening: { evidenceCount: 1, score: scores.listening, status: 'evaluated' },
  reading: { evidenceCount: 2, score: scores.reading, status: 'evaluated' },
  speaking: { evidenceCount: 1, score: scores.speaking, status: 'evaluated' },
  writing: { evidenceCount: 1, score: scores.writing, status: 'evaluated' },
});

const candidates: PlacementPolicyCandidate[] = [
  {
    available: true,
    levelCode: 'FOUNDATION_1',
    minimumScores: { listening: 0.3, reading: 0.3, speaking: 0.3, writing: 0.3 },
    order: 0,
  },
  {
    available: true,
    levelCode: 'INTERMEDIATE_1',
    minimumScores: { listening: 0.75, reading: 0.75, speaking: 0.75, writing: 0.75 },
    order: 1,
  },
];

describe('workplace placement policy', () => {
  it('keeps null or pending evidence not ready instead of converting it to zero', () => {
    const skillResults: PlacementSkillResults = {
      ...evaluated({ listening: 0.8, reading: 0.8, speaking: 0.8, writing: 0.8 }),
      speaking: { evidenceCount: 0, score: null, status: 'pending' },
    };

    expect(recommendPlacement({ candidates, skillResults })).toEqual({
      ready: false,
      reason: 'incomplete_evidence',
    });
  });

  it('does not let a high average compensate for one below-threshold skill', () => {
    const result = recommendPlacement({
      candidates,
      skillResults: evaluated({ listening: 0.99, reading: 0.99, speaking: 0.99, writing: 0.74 }),
    });

    expect(result).toMatchObject({ ready: true, recommendedLevelCode: 'FOUNDATION_1' });
    if (!result.ready) throw new Error('Expected a recommendation');
    expect(result.explanation.candidateDecisions).toEqual(expect.arrayContaining([
      expect.objectContaining({ eligible: false, levelCode: 'INTERMEDIATE_1' }),
    ]));
  });

  it('selects the highest available candidate whose four separate minima pass', () => {
    expect(recommendPlacement({
      candidates,
      skillResults: evaluated({ listening: 0.8, reading: 0.9, speaking: 0.75, writing: 0.82 }),
    })).toMatchObject({ ready: true, recommendedLevelCode: 'INTERMEDIATE_1' });
  });

  it('ships v1 with only the safe Foundation candidate', () => {
    expect(WORKPLACE_PLACEMENT_V1_CANDIDATES).toEqual([
      expect.objectContaining({ levelCode: 'FOUNDATION_1', order: 0 }),
    ]);
  });

  it('returns a bounded explanation with scores and counts but no raw response', () => {
    const result = recommendPlacement({
      candidates: WORKPLACE_PLACEMENT_V1_CANDIDATES,
      skillResults: evaluated({ listening: 0.5, reading: 0.6, speaking: 0.4, writing: 0.7 }),
    });

    expect(result).toMatchObject({ ready: true, recommendedLevelCode: 'FOUNDATION_1' });
    expect(JSON.stringify(result)).not.toMatch(/rawResponse|transcript|learnerResponse|recording/u);
    if (!result.ready) throw new Error('Expected a recommendation');
    expect(result.explanation.skillResults.reading).toEqual({ evidenceCount: 2, score: 0.6, status: 'evaluated' });
  });
});
