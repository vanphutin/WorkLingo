import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';
import { StudyDayProjectorService } from '../../src/engagement/application/study-day-projector.service.js';

describe('Engagement HTTP API Integration', () => {
  let context: LearningSessionTestContext;
  let projector: StudyDayProjectorService;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('engagement_api_test');
    projector = context.app.get(StudyDayProjectorService);
  }, 45_000);

  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('requires authentication for engagement endpoints', async () => {
    const request = (await import('supertest')).default;
    const unauth = context.app.getHttpServer() as Parameters<typeof request>[0];

    await request(unauth).get('/api/v1/me/engagement').expect(401);
    await request(unauth).patch('/api/v1/me/engagement/weekly-target').send({ targetDays: 3 }).expect(401);
  });

  it('returns default engagement summary for newly registered learner', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Fresh Learner',
      email: 'fresh@example.test',
    });

    const res = await agent.get('/api/v1/me/engagement').expect(200);

    expect(res.body).toMatchObject({
      consistency: {
        bestStreakWeeks: 0,
        currentStreakWeeks: 0,
      },
      currentWeek: {
        completedDays: 0,
        remainingDays: 3,
        status: 'ACTIVE',
        targetChangeAppliesImmediately: true,
        targetDays: 3,
        timezone: 'Asia/Ho_Chi_Minh',
      },
      evidenceOfProgress: {
        completedReviewsCount: 0,
        completedSessions: 0,
        distinctStudyDays: 0,
        evaluatedBlocksCount: 0,
        skills: {
          listening: { change: null, currentAverage: null, currentSamples: 0, status: 'INSUFFICIENT_EVIDENCE' },
          reading: { change: null, currentAverage: null, currentSamples: 0, status: 'INSUFFICIENT_EVIDENCE' },
          speaking: { change: null, currentAverage: null, currentSamples: 0, status: 'INSUFFICIENT_EVIDENCE' },
          writing: { change: null, currentAverage: null, currentSamples: 0, status: 'INSUFFICIENT_EVIDENCE' },
        },
      },
    });

    // Ensure no sensitive or raw fields are leaked
    expect(res.body).not.toHaveProperty('rawResponse');
    expect(res.body).not.toHaveProperty('transcript');
    expect(res.body).not.toHaveProperty('storageKey');
  });

  it('updates weekly target immediately before study, but defers when study day exists', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Target Learner',
      email: 'target@example.test',
    });
    const user = await context.database.user.findUniqueOrThrow({ where: { email: 'target@example.test' } });

    // 1. Validation boundaries: 1 is invalid, 6 is invalid
    await agent.patch('/api/v1/me/engagement/weekly-target').send({ targetDays: 1 }).expect(400);
    await agent.patch('/api/v1/me/engagement/weekly-target').send({ targetDays: 6 }).expect(400);

    // 2. Change target from 3 to 4 before studying -> applies immediately
    const update1 = await agent.patch('/api/v1/me/engagement/weekly-target').send({ targetDays: 4 }).expect(200);
    expect(update1.body.currentWeek.targetDays).toBe(4);
    expect(update1.body.currentWeek.targetChangeAppliesImmediately).toBe(true);
    expect(update1.body.currentWeek.effectiveTargetNextWeek).toBeNull();

    // 3. Complete a study session today
    const session = await context.database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: user.id,
        lessonVersionId: (await context.database.lessonVersion.findFirstOrThrow()).id,
        missionId: (await context.database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' } })).id,
        planSnapshot: {},
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await context.database.$transaction(async (tx) => {
      await projector.recordCompletion(tx, {
        completedAt: session.completedAt!,
        learnerId: user.id,
        purpose: 'learning',
        sessionId: session.id,
      });
    });

    // 4. Change target to 2 after studying -> currentWeek stays 4, effective next week is 2
    const update2 = await agent.patch('/api/v1/me/engagement/weekly-target').send({ targetDays: 2 }).expect(200);
    expect(update2.body.currentWeek.targetDays).toBe(4);
    expect(update2.body.currentWeek.completedDays).toBe(1);
    expect(update2.body.currentWeek.targetChangeAppliesImmediately).toBe(false);
    expect(update2.body.currentWeek.effectiveTargetNextWeek).toBe(2);
  });
});
