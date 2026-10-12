import { describe, expect, it } from 'vitest';

import {
  calculateConsistency,
  InvalidTimezoneError,
  toLocalDateKey,
  toWeekStartKey,
} from './engagement-week.js';

describe('engagement-week domain policy', () => {
  describe('toLocalDateKey', () => {
    it('formats UTC instant into local date key for Asia/Ho_Chi_Minh (UTC+7)', () => {
      // 2026-10-11T16:59:00Z is 23:59 on Oct 11 in VN
      const lateNight = new Date('2026-10-11T16:59:00.000Z');
      expect(toLocalDateKey(lateNight, 'Asia/Ho_Chi_Minh')).toBe('2026-10-11');

      // 2026-10-11T17:01:00Z is 00:01 on Oct 12 in VN
      const pastMidnight = new Date('2026-10-11T17:01:00.000Z');
      expect(toLocalDateKey(pastMidnight, 'Asia/Ho_Chi_Minh')).toBe('2026-10-12');
    });

    it('formats year rollover accurately', () => {
      // 2026-12-31T18:00:00Z is 2027-01-01 01:00 in VN
      const rollover = new Date('2026-12-31T18:00:00.000Z');
      expect(toLocalDateKey(rollover, 'Asia/Ho_Chi_Minh')).toBe('2027-01-01');
    });

    it('throws InvalidTimezoneError for invalid timezone strings', () => {
      expect(() => toLocalDateKey(new Date(), 'Invalid/Unknown_Zone')).toThrow(
        InvalidTimezoneError,
      );
    });
  });

  describe('toWeekStartKey', () => {
    it('returns Monday for dates within the same week', () => {
      // Monday 2026-10-12
      expect(toWeekStartKey('2026-10-12')).toBe('2026-10-12');
      // Wednesday 2026-10-14 -> Monday 2026-10-12
      expect(toWeekStartKey('2026-10-14')).toBe('2026-10-12');
      // Sunday 2026-10-18 -> Monday 2026-10-12
      expect(toWeekStartKey('2026-10-18')).toBe('2026-10-12');
    });

    it('handles month and year boundaries when determining Monday', () => {
      // 2026-01-01 is Thursday -> Monday is 2025-12-29
      expect(toWeekStartKey('2026-01-01')).toBe('2025-12-29');
      // 2026-03-01 is Sunday -> Monday is 2026-02-23
      expect(toWeekStartKey('2026-03-01')).toBe('2026-02-23');
    });
  });

  describe('calculateConsistency', () => {
    const currentWeekStart = '2026-10-12'; // Monday

    it('returns 0 streak when no weeks exist', () => {
      const result = calculateConsistency({
        currentWeek: { completedDays: 0, targetDays: 3, weekStartKey: currentWeekStart },
        pastWeeks: [],
      });
      expect(result).toEqual({ bestStreakWeeks: 0, currentStreakWeeks: 0 });
    });

    it('does not break current streak when current week is active and incomplete', () => {
      // Past 2 weeks met: 2026-09-28 (met), 2026-10-05 (met)
      // Current week 2026-10-12 has 1 of 3 days completed.
      const result = calculateConsistency({
        currentWeek: { completedDays: 1, targetDays: 3, weekStartKey: currentWeekStart },
        pastWeeks: [
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-09-28' },
          { completedDays: 4, targetDays: 3, weekStartKey: '2026-10-05' },
        ],
      });
      expect(result.currentStreakWeeks).toBe(2);
      expect(result.bestStreakWeeks).toBe(2);
    });

    it('increments current streak when current week has already met target', () => {
      // Past 2 weeks met, and current week met (3 of 3 days)
      const result = calculateConsistency({
        currentWeek: { completedDays: 3, targetDays: 3, weekStartKey: currentWeekStart },
        pastWeeks: [
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-09-28' },
          { completedDays: 4, targetDays: 3, weekStartKey: '2026-10-05' },
        ],
      });
      expect(result.currentStreakWeeks).toBe(3);
      expect(result.bestStreakWeeks).toBe(3);
    });

    it('resets current streak when a past week was missed or missing', () => {
      // 2026-09-21 (met), 2026-09-28 (missed: 1 of 3), 2026-10-05 (met: 3 of 3)
      const result = calculateConsistency({
        currentWeek: { completedDays: 1, targetDays: 3, weekStartKey: currentWeekStart },
        pastWeeks: [
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-09-21' },
          { completedDays: 1, targetDays: 3, weekStartKey: '2026-09-28' },
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-10-05' },
        ],
      });
      expect(result.currentStreakWeeks).toBe(1);
      expect(result.bestStreakWeeks).toBe(1);
    });

    it('treats missing calendar week gaps as missed', () => {
      // 2026-09-21 (met), then missing 2026-09-28, then 2026-10-05 (met)
      const result = calculateConsistency({
        currentWeek: { completedDays: 0, targetDays: 3, weekStartKey: currentWeekStart },
        pastWeeks: [
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-09-21' },
          { completedDays: 3, targetDays: 3, weekStartKey: '2026-10-05' },
        ],
      });
      expect(result.currentStreakWeeks).toBe(1);
      expect(result.bestStreakWeeks).toBe(1);
    });
  });
});
