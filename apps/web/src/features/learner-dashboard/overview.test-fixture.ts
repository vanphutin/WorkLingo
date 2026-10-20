import type { DashboardOverview } from '@worklingo/contracts';
import { dashboardFixture } from './dashboard.test-fixtures';
const id = '11111111-1111-4111-8111-111111111111';
export const overviewFixture: DashboardOverview = {
  programContext: { activeProgram: { id, slug: 'intermediate', name: 'Intermediate' }, enrollment: { id, revision: 1, currentLevel: { id, code: 'B1', name: 'B1' } } },
  progress: { status: 'ready', data: { activityAttempts: 4, completedActivities: 3, currentLevelCode: 'B1', sessions: { completed: 1, inProgress: 1, paused: 0, planned: 0 } } },
  availability: { status: 'ready', data: { mission: { id, title: 'Next workplace mission' }, lessonVersionId: id, supportedDurations: [60], availableDurations: [60], defaultDurationMinutes: 60 } },
  roadmap: { status: 'ready', data: { programId: id, enrollmentId: id, items: [{ missionId: id, revisionId: id, title: 'Saved workplace mission', state: 'in_progress', activeSessionId: id, objectives: [], unmetPrerequisites: [], reviewDue: false }] } },
  analytics: { status: 'ready', data: dashboardFixture },
  engagement: { status: 'error', error: { code: 'DASHBOARD_SECTION_UNAVAILABLE', status: 503 } },
  topics: { status: 'ready', data: [] },
};
