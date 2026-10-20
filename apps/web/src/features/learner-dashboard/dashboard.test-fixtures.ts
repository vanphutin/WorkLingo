import type { LearnerDashboardAnalytics } from '@worklingo/contracts';

/** Test data deliberately gives each program different progress. */
export const dashboardFixture: LearnerDashboardAnalytics = {
  displayName: 'Minh', activeProgramSlug: 'intermediate',
  activity: [{ dateKey: '2026-10-14', sessions: 3, completedSessions: 2 }],
  accuracyTrend: [{ dateKey: '2026-10-14', averageScore: 0.75, samples: 4 }],
  skills: [
    { skill: 'reading', averageScore: 0.8, samples: 5 },
    { skill: 'listening', averageScore: 0.6, samples: 2 },
  ],
  programs: [
    { id: '11111111-1111-4111-8111-111111111111', slug: 'intermediate', name: 'Intermediate',
      availabilityStatus: 'AVAILABLE', enrolled: true, active: true, currentLevelCode: 'B1_2',
      completedMissions: 2, totalMissions: 8, completedLessons: 3, totalLessons: 12 },
    { id: '22222222-2222-4222-8222-222222222222', slug: 'foundation', name: 'Foundation',
      availabilityStatus: 'AVAILABLE', enrolled: true, active: false, currentLevelCode: 'FOUNDATION_2',
      completedMissions: 5, totalMissions: 5, completedLessons: 10, totalLessons: 10 },
    { id: '33333333-3333-4333-8333-333333333333', slug: 'ielts', name: 'IELTS',
      availabilityStatus: 'COMING_SOON', enrolled: false, active: false, currentLevelCode: null,
      completedMissions: 0, totalMissions: 0, completedLessons: 0, totalLessons: 0 },
  ],
};
