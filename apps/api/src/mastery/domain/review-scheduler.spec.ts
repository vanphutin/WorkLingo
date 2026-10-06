import { describe, expect, it } from 'vitest';
import { ReviewScheduler } from './review-scheduler';
import { TestClock } from './clock.port';
import type { ReviewCandidate } from './mastery.types';

describe('ReviewScheduler (deterministic prioritization & time-travel)', () => {
  const t0 = new Date('2026-10-06T12:00:00Z');
  const clock = new TestClock(t0);

  const candidates: ReviewCandidate[] = [
    {
      id: 'rec-1',
      languageBlockId: 'lb-1',
      skill: 'reading',
      state: 'LEARNING',
      score: 0.8,
      confidence: 0.7,
      nextReviewAt: new Date('2026-10-07T12:00:00Z'), // Due at T0 + 1 day
    },
    {
      id: 'rec-2',
      languageBlockId: 'lb-2',
      skill: 'listening',
      state: 'NEEDS_ATTENTION',
      score: 0.3,
      confidence: 0.4,
      nextReviewAt: new Date('2026-10-06T15:00:00Z'), // Due today at 15:00
    },
    {
      id: 'rec-3',
      languageBlockId: 'lb-3',
      skill: 'speaking',
      state: 'STABLE',
      score: 0.95,
      confidence: 0.9,
      nextReviewAt: new Date('2026-10-13T12:00:00Z'), // Due in 7 days
    },
  ];

  it('prioritizes NEEDS_ATTENTION and overdue items at T0', () => {
    const scheduler = new ReviewScheduler(clock);
    // At T0 (12:00), rec-2 is not past 15:00, but rec-2 has state NEEDS_ATTENTION so it is prioritized
    const due = scheduler.selectReviewItems(candidates, { includeWeakUnscheduled: true });
    expect(due.length).toBeGreaterThan(0);
    expect(due[0]!.id).toBe('rec-2');
    expect(due[0]!.priorityReason).toBe('NEEDS_ATTENTION');
  });

  it('performs time-travel: items become due when clock advances', () => {
    const scheduler = new ReviewScheduler(clock);

    // At T0: rec-1 (due T0 + 1 day) is NOT due yet
    let due = scheduler.selectReviewItems(candidates, { includeWeakUnscheduled: false });
    expect(due.find((item) => item.id === 'rec-1')).toBeUndefined();

    // Time-travel: advance clock by 1.5 days
    clock.advanceDays(1.5);
    due = scheduler.selectReviewItems(candidates, { includeWeakUnscheduled: false });

    // Now both rec-2 and rec-1 are due
    expect(due.map((i) => i.id)).toContain('rec-1');
    expect(due.map((i) => i.id)).toContain('rec-2');
    // rec-3 (due in 7 days) is still not due
    expect(due.find((item) => item.id === 'rec-3')).toBeUndefined();

    // Advance 6 more days (total 7.5 days)
    clock.advanceDays(6);
    due = scheduler.selectReviewItems(candidates, { includeWeakUnscheduled: false });
    expect(due.map((i) => i.id)).toContain('rec-3');
  });

  it('filters by skill when specified', () => {
    clock.setTime(new Date('2026-10-20T12:00:00Z')); // All items due
    const scheduler = new ReviewScheduler(clock);

    const readingOnly = scheduler.selectReviewItems(candidates, { skill: 'reading' });
    expect(readingOnly.every((item) => item.skill === 'reading')).toBe(true);
    expect(readingOnly.map((i) => i.id)).toEqual(['rec-1']);
  });

  it('keeps a weak item ahead of a much older overdue item', () => {
    const scheduler = new ReviewScheduler(new TestClock(new Date('2026-10-06T12:00:00Z')));
    const items: ReviewCandidate[] = [
      {
        id: 'old', languageBlockId: 'lb-old', skill: 'reading', state: 'STABLE',
        score: 0.9, confidence: 0.9, nextReviewAt: new Date('2026-08-01T12:00:00Z'),
      },
      {
        id: 'weak', languageBlockId: 'lb-weak', skill: 'listening', state: 'NEEDS_ATTENTION',
        score: 0.3, confidence: 0.2, nextReviewAt: new Date('2026-10-07T12:00:00Z'),
      },
    ];

    expect(scheduler.selectReviewItems(items).map((item) => item.id)).toEqual(['weak', 'old']);
  });

  it('breaks equal-priority ties by stable record id regardless of input order', () => {
    const scheduler = new ReviewScheduler(new TestClock(new Date('2026-10-06T12:00:00Z')));
    const earlier: ReviewCandidate = {
      id: 'a', languageBlockId: 'lb-a', skill: 'reading', state: 'LEARNING',
      score: 0.8, confidence: 0.5, nextReviewAt: new Date('2026-10-05T12:00:00Z'),
    };
    const later: ReviewCandidate = { ...earlier, id: 'b', languageBlockId: 'lb-b' };

    expect(scheduler.selectReviewItems([later, earlier]).map((item) => item.id)).toEqual(['a', 'b']);
  });
});
