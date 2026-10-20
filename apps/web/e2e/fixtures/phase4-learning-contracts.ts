import type { Page } from '@playwright/test';
import {
  activateProgramSchema, authUserSchema, curriculumRoadmapSchema,
  engagementSummarySchema, learningProgramCatalogSchema, programContextSchema,
  sessionAvailabilitySchema, weeklyTargetInputSchema, createCheckpointAssessmentSchema, dashboardOverviewSchema,
} from '@worklingo/contracts';
import { learnerProgressDtoSchema } from '../../src/lib/api/api-client';
import {
  errorBankSchema, masteryMapSchema, memoryHealthSchema, progressionSummarySchema, checkpointAssessmentSchema,
} from '../../src/lib/api/learner-schemas';
import {
  emptyErrorBank, emptyMasteryMap, errorItem, masteryMap, memoryHealth, progression, pendingAssessment,
} from '../../src/features/mastery/test-fixtures';
import { shellUser } from './shell-contracts';
import { dashboardFixture } from '../../src/features/learner-dashboard/dashboard.test-fixtures';

export type LearningFixtureState = 'loaded' | 'empty' | 'error';
export interface LearningFixtureOptions {
  readonly state?: LearningFixtureState;
  readonly locale?: 'vi' | 'en';
}
export interface LearningFixtureRequest {
  readonly method: string;
  readonly url: string;
  /** Raw JSON body; deliberately excludes cookies and authorization headers. */
  readonly body: string | null;
}

// Copied from the corresponding owner unit tests, not a parallel product model.
const catalog = learningProgramCatalogSchema.parse({
  programs: [
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Build essential English through guided four-skill practice.',
      destination: null,
      iconKey: 'beginner',
      isSelectable: false,
      learningGoal: 'Understand practical English in familiar situations.',
      name: 'Beginner',
      proficiencyLabel: 'Foundation / Pre-A1-A2',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'beginner',
    },
    {
      availabilityStatus: 'AVAILABLE',
      description: 'Use English confidently across everyday workplace situations.',
      destination: '/dashboard',
      iconKey: 'intermediate',
      isSelectable: true,
      learningGoal: 'Communicate, understand and respond effectively at work.',
      name: 'Intermediate',
      proficiencyLabel: 'Intermediate / B1-B2',
      publishedLevelCount: 2,
      publishedPathCount: 1,
      slug: 'intermediate',
    },
    {
      availabilityStatus: 'COMING_SOON',
      description: 'Prepare for TOEIC through practical workplace language.',
      destination: null,
      iconKey: 'toeic',
      isSelectable: false,
      learningGoal: 'Strengthen listening and reading.',
      name: 'TOEIC',
      proficiencyLabel: 'TOEIC-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'toeic',
    },
    {
      availabilityStatus: 'IN_DEVELOPMENT',
      description: 'Develop integrated English for a future IELTS pathway.',
      destination: null,
      iconKey: 'ielts',
      isSelectable: false,
      learningGoal: 'Build language evidence for IELTS preparation.',
      name: 'IELTS',
      proficiencyLabel: 'IELTS band-oriented',
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'ielts',
    },
  ],
});
const context = programContextSchema.parse({
  activeProgram: { id: '10000000-0000-4000-8000-000000000002', slug: 'intermediate', name: 'Intermediate' },
  enrollment: { id: '20000000-0000-4000-8000-000000000001', revision: 1, currentLevel: { id: '20000000-0000-4000-8000-000000000002', code: 'FOUNDATION_1', name: 'Foundation' } },
});
const progressData = learnerProgressDtoSchema.parse({
  activityAttempts: 4,
  completedActivities: 3,
  currentLevelCode: 'FOUNDATION_1',
  sessions: {
    completed: 1,
    inProgress: 0,
    paused: 0,
    planned: 1,
  },
});
const engagement = engagementSummarySchema.parse({
  consistency: {
    bestStreakWeeks: 4,
    currentStreakWeeks: 2,
  },
  currentWeek: {
    completedDays: 2,
    effectiveTargetNextWeek: null,
    remainingDays: 1,
    status: 'ACTIVE',
    targetChangeAppliesImmediately: true,
    targetDays: 3,
    timezone: 'Asia/Ho_Chi_Minh',
    weekStartKey: '2026-10-12',
  },
  evidenceOfProgress: {
    completedReviewsCount: 4,
    completedSessions: 6,
    distinctStudyDays: 3,
    evaluatedBlocksCount: 5,
    skills: {
      listening: {
        change: -0.01,
        currentAverage: 0.79,
        currentSamples: 2,
        previousAverage: 0.8,
        previousSamples: 2,
        status: 'STEADY',
      },
      reading: {
        change: 0.1,
        currentAverage: 0.85,
        currentSamples: 3,
        previousAverage: 0.75,
        previousSamples: 2,
        status: 'IMPROVING',
      },
      speaking: {
        change: -0.15,
        currentAverage: 0.65,
        currentSamples: 2,
        previousAverage: 0.8,
        previousSamples: 2,
        status: 'NEEDS_ATTENTION',
      },
      writing: {
        change: null,
        currentAverage: 0.7,
        currentSamples: 1,
        previousAverage: null,
        previousSamples: 0,
        status: 'INSUFFICIENT_EVIDENCE',
      },
    },
  },
});
const roadmap = curriculumRoadmapSchema.parse({
  programId: '11111111-1111-4111-8111-111111111111',
  enrollmentId: '22222222-2222-4222-8222-222222222222',
  items: [
    {
      missionId: '33333333-3333-4333-8333-333333333333', revisionId: '44444444-4444-4444-8444-444444444444',
      title: 'Handle a workplace request', state: 'in_progress', unmetPrerequisites: [], reviewDue: false,
      activeSessionId: '55555555-5555-4555-8555-555555555555',
      objectives: [{ slug: 'clarify', statement: 'Clarify a request', skills: ['speaking'], required: true, completed: false }],
    },
    {
      missionId: '66666666-6666-4666-8666-666666666666', revisionId: '77777777-7777-4777-8777-777777777777',
      title: 'Report an issue', state: 'locked', unmetPrerequisites: ['prerequisite_incomplete:44444444-4444-4444-8444-444444444444'],
      reviewDue: true, activeSessionId: null,
      objectives: [{ slug: 'report', statement: 'Report an issue clearly', skills: ['writing'], required: true, completed: false }],
    },
  ],
});

/** Successful response payloads use the actual API client schemas. */
export const learningFixtures = {
  user: authUserSchema.parse(shellUser),
  catalog,
  context,
  progress: progressData,
  availability: sessionAvailabilitySchema.parse({
    mission: {
      id: 'c3d4e5f6-a7b8-49c0-81e2-3a4b5c6d7e8f',
      title: 'Introduce yourself to a new colleague',
    },
    lessonVersionId: 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e',
    supportedDurations: [45, 60, 90, 120, 150],
    availableDurations: [45, 60],
    defaultDurationMinutes: 60,
  }),
  roadmap,
  engagement,
  masteryMap: masteryMapSchema.parse(masteryMap),
  memoryHealth: memoryHealthSchema.parse(memoryHealth),
  errorBank: errorBankSchema.parse({ ...emptyErrorBank, items: [errorItem], total: 1, totalPages: 1 }),
  progression: progressionSummarySchema.parse(progression),
};

const unassessed = { health: null, evaluatedBlocksCount: 0, dueCount: 0, needsAttentionCount: 0 };
const noEvidence = {
  change: null, currentAverage: null, currentSamples: 0,
  previousAverage: null, previousSamples: 0, status: 'INSUFFICIENT_EVIDENCE',
};

/** Assigned learner without study evidence; catalog and roadmap can be empty. */
export const emptyLearningFixtures = {
  ...learningFixtures,
  catalog: learningProgramCatalogSchema.parse({ programs: [] }),
  progress: learnerProgressDtoSchema.parse({
    ...progressData, activityAttempts: 0, completedActivities: 0,
    sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 },
  }),
  availability: sessionAvailabilitySchema.parse({ ...learningFixtures.availability, availableDurations: [] }),
  roadmap: curriculumRoadmapSchema.parse({ ...roadmap, items: [] }),
  engagement: engagementSummarySchema.parse({
    consistency: { bestStreakWeeks: 0, currentStreakWeeks: 0 },
    currentWeek: { ...engagement.currentWeek, completedDays: 0, remainingDays: engagement.currentWeek.targetDays },
    evidenceOfProgress: {
      completedReviewsCount: 0, completedSessions: 0, distinctStudyDays: 0, evaluatedBlocksCount: 0,
      skills: { reading: noEvidence, listening: noEvidence, speaking: noEvidence, writing: noEvidence },
    },
  }),
  masteryMap: masteryMapSchema.parse(emptyMasteryMap),
  memoryHealth: memoryHealthSchema.parse({
    reading: unassessed, listening: unassessed, speaking: unassessed,
    writing: unassessed, overall: unassessed,
  }),
  errorBank: errorBankSchema.parse(emptyErrorBank),
  progression: progressionSummarySchema.parse({
    ...progression, eligibleSessionId: null, canAssess: false, reasons: ['no_valid_completed_session'],
  }),
};

/**
 * Install before navigation. Returned requests capture method, URL and raw body.
 * Error mode keeps /me authenticated and fails learning reads with HTTP 503.
 * Unowned endpoints/methods fall back, so shell fixtures can be composed.
 * Session creation and level confirmation are not simulated. Checkpoint response
 * is the existing pending-assessment fixture, never a client-computed grade.
 */
export async function installLearningFixtures(page: Page, options: LearningFixtureOptions = {}) {
  // Clone per installation to prevent tests from sharing mutable response data.
  const data = structuredClone(options.state === 'empty' ? emptyLearningFixtures : learningFixtures);
  if (options.locale) data.user.locale = options.locale;
  const requests: LearningFixtureRequest[] = [];
  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    requests.push({ method, url: request.url(), body: request.postData() });
    const path = url.pathname.replace(/^\/api\/v1/u, '');
    const reads: Record<string, unknown> = {
      '/me/dashboard/overview': dashboardOverviewSchema.parse({
        programContext: data.context,
        progress: { status: 'ready', data: data.progress },
        availability: { status: 'ready', data: data.availability },
        roadmap: { status: 'ready', data: data.roadmap },
        analytics: { status: 'ready', data: dashboardFixture },
        engagement: { status: 'ready', data: data.engagement },
        topics: { status: 'ready', data: [] },
      }),
      '/me': data.user,
      '/learning-programs': data.catalog,
      '/me/program-context': data.context,
      '/me/progress': data.progress,
      '/learning-sessions/availability': data.availability,
      '/me/curriculum-roadmap': data.roadmap,
      '/me/engagement': data.engagement,
      '/me/mastery-map': data.masteryMap,
      '/me/memory-health': data.memoryHealth,
      '/me/error-bank': data.errorBank,
      '/me/progression': data.progression,
    };
    if (method === 'GET' && Object.hasOwn(reads, path)) {
      if (options.state === 'error' && path !== '/me') {
        await route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Learning data temporarily unavailable', statusCode: 503 } });
        return;
      }
      if (path === '/me/error-bank') {
        const skill = url.searchParams.get('skill');
        const pageNumber = Number(url.searchParams.get('page') ?? 1);
        const limit = Number(url.searchParams.get('limit') ?? 20);
        if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 ||
            !Number.isSafeInteger(limit) || limit < 1 ||
            (skill !== null && !['reading', 'listening', 'speaking', 'writing'].includes(skill))) {
          await route.fulfill({ status: 400, json: { code: 'VALIDATION_ERROR', message: 'Invalid error-bank query' } });
          return;
        }
        const items = data.errorBank.items.filter((item) => !skill || item.skill === skill);
        await route.fulfill({ status: 200, json: errorBankSchema.parse({
          items: items.slice((pageNumber - 1) * limit, pageNumber * limit),
          total: items.length, page: pageNumber, limit, totalPages: Math.ceil(items.length / limit),
        }) });
        return;
      }
      await route.fulfill({ status: 200, json: reads[path] });
      return;
    }
    if (method === 'PATCH' && path === '/me/engagement/weekly-target') {
      const { targetDays } = weeklyTargetInputSchema.parse(request.postDataJSON());
      data.engagement = engagementSummarySchema.parse({ ...data.engagement, currentWeek: { ...data.engagement.currentWeek, targetDays, remainingDays: Math.max(0, targetDays - data.engagement.currentWeek.completedDays) } });
      return route.fulfill({ json: data.engagement });
    }
    if (method === 'POST' && path === '/me/checkpoint-assessments') {
      const input = createCheckpointAssessmentSchema.parse(request.postDataJSON());
      const assessment = checkpointAssessmentSchema.parse({ ...pendingAssessment, id: input.clientAssessmentId, sessionId: input.sessionId });
      return route.fulfill({ json: assessment });
    }
    if (method === 'PUT' && path === '/me/program-context') {
      if (options.state === 'error') {
        await route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Learning data temporarily unavailable' } });
        return;
      }
      let body: unknown;
      try { body = request.postDataJSON(); } catch { body = null; }
      const parsed = activateProgramSchema.safeParse(body);
      if (!parsed.success) {
        await route.fulfill({ status: 400, json: { code: 'VALIDATION_ERROR', message: 'Invalid program activation' } });
        return;
      }
      const program = data.catalog.programs.find((item) => item.slug === parsed.data.programSlug);
      if (!program?.isSelectable) {
        await route.fulfill({ status: 422, json: { code: 'PROGRAM_UNAVAILABLE', message: 'Program unavailable' } });
        return;
      }
      if (parsed.data.expectedRevision !== data.context.enrollment?.revision) {
        await route.fulfill({ status: 409, json: { code: 'PROGRAM_CONTEXT_STALE', message: 'Program context changed' } });
        return;
      }
      // Reopening active Intermediate is idempotent, as in the existing E2E.
      await route.fulfill({ status: 200, json: programContextSchema.parse(data.context) });
      return;
    }
    await route.fallback();
  });
  return { requests };
}
