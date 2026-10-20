import { describe, expect, it } from 'vitest';
import { adminDashboardOverviewSchema, learnerDashboardAnalyticsSchema } from './dashboard.contracts.ts';

describe('dashboard contracts', () => {
  it('preserves empty scores and completion rates instead of fabricating results', () => {
    expect(adminDashboardOverviewSchema.parse({ totalLearners: 0, activeLearners7d: 0,
      programEnrollments: 0, sessionCompletionRate: null, programs: [], activity: [], recentActivity: []
    }).sessionCompletionRate).toBeNull();
    expect(learnerDashboardAnalyticsSchema.parse({ displayName: 'Learner', activeProgramSlug: null,
      programs: [], activity: [], accuracyTrend: [], skills: []
    }).skills).toEqual([]);
  });

  it('rejects unbounded scores, invalid dates and negative metric counts', () => {
    const base = { displayName: 'Learner', activeProgramSlug: null, programs: [], activity: [], accuracyTrend: [], skills: [] };
    expect(learnerDashboardAnalyticsSchema.safeParse({ ...base, skills: [{ skill: 'reading', averageScore: 90, samples: 2 }] }).success).toBe(false);
    expect(learnerDashboardAnalyticsSchema.safeParse({ ...base, accuracyTrend: [{ dateKey: 'bad', averageScore: 0.5, samples: 1 }] }).success).toBe(false);
    expect(learnerDashboardAnalyticsSchema.safeParse({ ...base, activity: [{ dateKey: '2026-10-15', sessions: -1, completedSessions: 0 }] }).success).toBe(false);
  });
});
