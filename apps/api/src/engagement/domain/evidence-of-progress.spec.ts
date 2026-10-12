import { describe, expect, it } from 'vitest';

import { compareEvidence, type RawEvaluatedSample } from './evidence-of-progress.js';

describe('evidence-of-progress domain policy', () => {
  const referenceDate = new Date('2026-10-12T12:00:00.000Z');

  it('calculates numeric delta and status when both 28-day windows have at least 2 evaluated samples', () => {
    // Current window: 2026-09-14 to 2026-10-12
    // Previous window: 2026-08-17 to 2026-09-14
    const samples: RawEvaluatedSample[] = [
      // Reading: current window has 2 samples (0.9, 0.8 -> avg 0.85), previous window has 2 samples (0.7, 0.8 -> avg 0.75)
      // change = +0.10 -> IMPROVING
      { evaluatedAt: new Date('2026-10-10T10:00:00Z'), languageBlockId: 'b1', purpose: 'learning', score: 0.9, skill: 'reading' },
      { evaluatedAt: new Date('2026-10-05T10:00:00Z'), languageBlockId: 'b2', purpose: 'learning', score: 0.8, skill: 'reading' },
      { evaluatedAt: new Date('2026-09-01T10:00:00Z'), languageBlockId: 'b1', purpose: 'learning', score: 0.7, skill: 'reading' },
      { evaluatedAt: new Date('2026-08-25T10:00:00Z'), languageBlockId: 'b2', purpose: 'learning', score: 0.8, skill: 'reading' },

      // Listening: current (0.7, 0.7 -> 0.7), previous (0.7, 0.71 -> 0.705) -> change ~ -0.005 -> STEADY
      { evaluatedAt: new Date('2026-10-08T10:00:00Z'), languageBlockId: 'b3', purpose: 'learning', score: 0.7, skill: 'listening' },
      { evaluatedAt: new Date('2026-10-02T10:00:00Z'), languageBlockId: 'b3', purpose: 'learning', score: 0.7, skill: 'listening' },
      { evaluatedAt: new Date('2026-09-02T10:00:00Z'), languageBlockId: 'b3', purpose: 'learning', score: 0.7, skill: 'listening' },
      { evaluatedAt: new Date('2026-08-20T10:00:00Z'), languageBlockId: 'b3', purpose: 'learning', score: 0.71, skill: 'listening' },

      // Speaking: current (0.6, 0.6 -> 0.6), previous (0.8, 0.8 -> 0.8) -> change = -0.2 -> NEEDS_ATTENTION
      { evaluatedAt: new Date('2026-10-07T10:00:00Z'), languageBlockId: 'b4', purpose: 'learning', score: 0.6, skill: 'speaking' },
      { evaluatedAt: new Date('2026-10-01T10:00:00Z'), languageBlockId: 'b4', purpose: 'learning', score: 0.6, skill: 'speaking' },
      { evaluatedAt: new Date('2026-09-05T10:00:00Z'), languageBlockId: 'b4', purpose: 'learning', score: 0.8, skill: 'speaking' },
      { evaluatedAt: new Date('2026-08-28T10:00:00Z'), languageBlockId: 'b4', purpose: 'learning', score: 0.8, skill: 'speaking' },

      // Writing: only 1 sample in current window -> INSUFFICIENT_EVIDENCE
      { evaluatedAt: new Date('2026-10-06T10:00:00Z'), languageBlockId: 'b5', purpose: 'learning', score: 0.75, skill: 'writing' },
      { evaluatedAt: new Date('2026-09-04T10:00:00Z'), languageBlockId: 'b5', purpose: 'learning', score: 0.7, skill: 'writing' },
      { evaluatedAt: new Date('2026-08-22T10:00:00Z'), languageBlockId: 'b5', purpose: 'learning', score: 0.7, skill: 'writing' },
    ];

    const result = compareEvidence({
      completedReviewsCount: 3,
      completedSessions: 5,
      distinctStudyDays: 4,
      now: referenceDate,
      samples,
    });

    expect(result.completedSessions).toBe(5);
    expect(result.distinctStudyDays).toBe(4);
    expect(result.completedReviewsCount).toBe(3);
    expect(result.evaluatedBlocksCount).toBe(5);

    expect(result.skills.reading).toEqual({
      change: 0.1,
      currentAverage: 0.85,
      currentSamples: 2,
      previousAverage: 0.75,
      previousSamples: 2,
      status: 'IMPROVING',
    });

    expect(result.skills.listening.status).toBe('STEADY');
    expect(result.skills.listening.change).toBeCloseTo(-0.005, 3);
    expect(result.skills.speaking.status).toBe('NEEDS_ATTENTION');
    expect(result.skills.speaking.change).toBe(-0.2);

    expect(result.skills.writing).toEqual({
      change: null,
      currentAverage: 0.75,
      currentSamples: 1,
      previousAverage: 0.7,
      previousSamples: 2,
      status: 'INSUFFICIENT_EVIDENCE',
    });
  });

  it('strictly excludes samples with placement purpose from progress calculation', () => {
    const samples: RawEvaluatedSample[] = [
      // 2 placement samples in current window, 2 placement in previous
      { evaluatedAt: new Date('2026-10-10T10:00:00Z'), languageBlockId: 'b1', purpose: 'placement', score: 0.95, skill: 'reading' },
      { evaluatedAt: new Date('2026-10-05T10:00:00Z'), languageBlockId: 'b2', purpose: 'placement', score: 0.95, skill: 'reading' },
      { evaluatedAt: new Date('2026-09-01T10:00:00Z'), languageBlockId: 'b1', purpose: 'placement', score: 0.75, skill: 'reading' },
      { evaluatedAt: new Date('2026-08-25T10:00:00Z'), languageBlockId: 'b2', purpose: 'placement', score: 0.75, skill: 'reading' },
    ];

    const result = compareEvidence({
      completedReviewsCount: 0,
      completedSessions: 0,
      distinctStudyDays: 0,
      now: referenceDate,
      samples,
    });

    expect(result.skills.reading).toEqual({
      change: null,
      currentAverage: null,
      currentSamples: 0,
      previousAverage: null,
      previousSamples: 0,
      status: 'INSUFFICIENT_EVIDENCE',
    });
    expect(result.evaluatedBlocksCount).toBe(0);
  });

  it('handles completely empty windows without NaN', () => {
    const result = compareEvidence({
      completedReviewsCount: 0,
      completedSessions: 0,
      distinctStudyDays: 0,
      now: referenceDate,
      samples: [],
    });

    for (const skill of ['reading', 'listening', 'speaking', 'writing'] as const) {
      expect(result.skills[skill]).toEqual({
        change: null,
        currentAverage: null,
        currentSamples: 0,
        previousAverage: null,
        previousSamples: 0,
        status: 'INSUFFICIENT_EVIDENCE',
      });
    }
  });
});
