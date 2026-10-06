import { describe, expect, it } from 'vitest';
import { TestClock } from './clock.port.js';
import { calculateRecordHealth, summarizeMemoryHealth } from './memory-health-calculator.js';
import type { MasteryRecord } from '@prisma/client';

describe('MemoryHealthCalculator (deterministic heuristic v1)', () => {
  const t0 = new Date('2026-10-06T12:00:00Z');
  const clock = new TestClock(t0);

  function createRecord(overrides: Partial<MasteryRecord> = {}): MasteryRecord {
    return {
      id: 'mr-1',
      learnerId: 'learner-1',
      languageBlockId: 'lb-1',
      skill: 'reading',
      state: 'LEARNING',
      score: 0.8,
      confidence: 0.5,
      intervalDays: 3.0,
      lastEvidenceAt: t0,
      nextReviewAt: new Date(t0.getTime() + 3 * 86400000), // Due in 3 days
      lastLessonVersionId: 'lv-1',
      createdAt: t0,
      updatedAt: t0,
      ...overrides,
    };
  }

  it('calculates expected base health when record is not due', () => {
    // base = round(100 * (0.7 * 0.8 + 0.3 * 0.5)) = round(100 * (0.56 + 0.15)) = round(71) = 71
    // overdueDays = 0 => health = 71
    const record = createRecord({ score: 0.8, confidence: 0.5 });
    const health = calculateRecordHealth(record, clock.now());
    expect(health).toBe(71);
  });

  it('reduces health by 5 points for each full day overdue (clamped penalty)', () => {
    const record = createRecord({
      score: 0.8,
      confidence: 0.5,
      nextReviewAt: t0, // Exactly due right now
    });
    // At T0, overdueDays = 0 => 71
    expect(calculateRecordHealth(record, clock.now())).toBe(71);

    // Advance clock by exactly 2 full days => overdueDays = 2 => penalty = 10 => 71 - 10 = 61
    const t2 = new Date(t0.getTime() + 2 * 86400000 + 1000);
    expect(calculateRecordHealth(record, t2)).toBe(61);

    // Overdue by 10 days => max penalty 40 => 71 - 40 = 31
    const t10 = new Date(t0.getTime() + 10 * 86400000);
    expect(calculateRecordHealth(record, t10)).toBe(31);
  });

  it('caps health at 40 when state is NEEDS_ATTENTION', () => {
    const record = createRecord({
      state: 'NEEDS_ATTENTION',
      score: 0.9,
      confidence: 0.9,
      // base = round(100 * (0.63 + 0.27)) = 90
    });
    const health = calculateRecordHealth(record, clock.now());
    expect(health).toBeLessThanOrEqual(40);
    expect(health).toBe(40);
  });

  it('summarizes memory health per skill and overall, returning null for unassessed skills', () => {
    const reading1 = createRecord({ skill: 'reading', score: 0.8, confidence: 0.5 }); // health 71
    const reading2 = createRecord({ skill: 'reading', score: 1.0, confidence: 1.0 }); // health 100
    const listening1 = createRecord({ skill: 'listening', state: 'NEEDS_ATTENTION', score: 0.3, confidence: 0.2 }); // base 27, capped 27

    // speaking and writing have NO records (SUBMITTED / unassessed)
    const records = [reading1, reading2, listening1];
    const summary = summarizeMemoryHealth(records, clock.now());

    expect(summary.reading.health).toBe(86); // round((71 + 100) / 2) = round(85.5) = 86
    expect(summary.reading.evaluatedBlocksCount).toBe(2);
    expect(summary.reading.needsAttentionCount).toBe(0);

    expect(summary.listening.health).toBe(27);
    expect(summary.listening.evaluatedBlocksCount).toBe(1);
    expect(summary.listening.needsAttentionCount).toBe(1);

    // Unassessed skills MUST return null health, not 0
    expect(summary.speaking.health).toBeNull();
    expect(summary.speaking.evaluatedBlocksCount).toBe(0);
    expect(summary.writing.health).toBeNull();
    expect(summary.writing.evaluatedBlocksCount).toBe(0);

    // Overall summary across evaluated records
    expect(summary.overall.health).toBe(66); // round((71 + 100 + 27) / 3) = 66
    expect(summary.overall.evaluatedBlocksCount).toBe(3);
  });

  it('ignores NEW placeholder records without evaluated evidence', () => {
    const assessed = createRecord({ skill: 'reading' });
    const placeholder = createRecord({
      skill: 'speaking',
      state: 'NEW',
      lastEvidenceAt: null,
      nextReviewAt: null,
    });

    const summary = summarizeMemoryHealth([assessed, placeholder], clock.now());

    expect(summary.speaking.health).toBeNull();
    expect(summary.speaking.evaluatedBlocksCount).toBe(0);
    expect(summary.overall.health).toBe(71);
    expect(summary.overall.evaluatedBlocksCount).toBe(1);
  });
});
