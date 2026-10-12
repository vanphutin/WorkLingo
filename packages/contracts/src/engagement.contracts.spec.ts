import { describe, expect, it } from 'vitest';

import {
  engagementSkillStatusSchema,
  engagementSummarySchema,
  evidenceOfProgressSchema,
  weeklyTargetInputSchema,
} from './engagement.contracts.js';

describe('engagement contracts', () => {
  describe('weeklyTargetInputSchema', () => {
    it('accepts integer weekly targets between 2 and 5', () => {
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 2 }).success).toBe(true);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 3 }).success).toBe(true);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 4 }).success).toBe(true);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 5 }).success).toBe(true);
    });

    it('rejects targetDays outside the 2 to 5 boundary or non-integers', () => {
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 1 }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 6 }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 0 }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: -3 }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: 3.5 }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({ targetDays: '3' }).success).toBe(false);
      expect(weeklyTargetInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('evidenceOfProgressSchema', () => {
    const validEvidencePayload = {
      completedReviewsCount: 5,
      completedSessions: 8,
      distinctStudyDays: 4,
      evaluatedBlocksCount: 12,
      skills: {
        listening: {
          change: 0.05,
          currentAverage: 0.85,
          currentSamples: 3,
          previousAverage: 0.8,
          previousSamples: 2,
          status: 'IMPROVING' as const,
        },
        reading: {
          change: null,
          currentAverage: 0.75,
          currentSamples: 1,
          previousAverage: null,
          previousSamples: 0,
          status: 'INSUFFICIENT_EVIDENCE' as const,
        },
        speaking: {
          change: -0.02,
          currentAverage: 0.78,
          currentSamples: 2,
          previousAverage: 0.8,
          previousSamples: 2,
          status: 'STEADY' as const,
        },
        writing: {
          change: -0.15,
          currentAverage: 0.65,
          currentSamples: 2,
          previousAverage: 0.8,
          previousSamples: 2,
          status: 'NEEDS_ATTENTION' as const,
        },
      },
    };

    it('validates a complete four-skill evidence summary with nullable change and explicit counts', () => {
      const parsed = evidenceOfProgressSchema.safeParse(validEvidencePayload);
      expect(parsed.success).toBe(true);
    });

    it('rejects evidence when any skill is missing', () => {
      const { writing: _w, ...threeSkills } = validEvidencePayload.skills;
      const invalid = { ...validEvidencePayload, skills: threeSkills };
      expect(evidenceOfProgressSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects invalid skill status', () => {
      expect(engagementSkillStatusSchema.safeParse('UNKNOWN').success).toBe(false);
      expect(engagementSkillStatusSchema.safeParse('FAILED').success).toBe(false);
    });
  });

  describe('engagementSummarySchema', () => {
    it('validates a complete learner engagement summary', () => {
      const payload = {
        consistency: {
          bestStreakWeeks: 4,
          currentStreakWeeks: 2,
        },
        currentWeek: {
          completedDays: 2,
          effectiveTargetNextWeek: null,
          remainingDays: 1,
          status: 'ACTIVE' as const,
          targetChangeAppliesImmediately: true,
          targetDays: 3,
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-05',
        },
        evidenceOfProgress: {
          completedReviewsCount: 2,
          completedSessions: 3,
          distinctStudyDays: 2,
          evaluatedBlocksCount: 6,
          skills: {
            listening: {
              change: null,
              currentAverage: null,
              currentSamples: 0,
              previousAverage: null,
              previousSamples: 0,
              status: 'INSUFFICIENT_EVIDENCE' as const,
            },
            reading: {
              change: null,
              currentAverage: null,
              currentSamples: 0,
              previousAverage: null,
              previousSamples: 0,
              status: 'INSUFFICIENT_EVIDENCE' as const,
            },
            speaking: {
              change: null,
              currentAverage: null,
              currentSamples: 0,
              previousAverage: null,
              previousSamples: 0,
              status: 'INSUFFICIENT_EVIDENCE' as const,
            },
            writing: {
              change: null,
              currentAverage: null,
              currentSamples: 0,
              previousAverage: null,
              previousSamples: 0,
              status: 'INSUFFICIENT_EVIDENCE' as const,
            },
          },
        },
      };

      expect(engagementSummarySchema.safeParse(payload).success).toBe(true);
    });
  });
});
