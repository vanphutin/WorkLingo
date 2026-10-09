import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('learning sessions', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('learning_sessions_test');
  }, 40_000);

  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('creates and transactionally persists a complete 60-minute plan', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Session Learner', email: 'session@example.test',
    });
    const clientSessionId = randomUUID();
    const response = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId, durationMinutes: 60,
    }).expect(201);

    expect(response.body).toMatchObject({
      clientSessionId,
      currentCheckpoint: 0,
      durationMinutes: 60,
      mission: { title: 'Introduce yourself to a new colleague' },
      status: 'planned',
    });
    expect(response.body.plan.blocks.map((block: { order: number; targetMinutes: number; type: string }) =>
      [block.type, block.order, block.targetMinutes])).toEqual([
      ['activate', 1, 15], ['readDecode', 2, 15],
      ['listenReason', 3, 15], ['respond', 4, 15],
    ]);

    const stored = await context.database.learningSession.findUniqueOrThrow({
      where: { id: response.body.id }, include: { blocks: { orderBy: { order: 'asc' } } },
    });
    expect(stored).toMatchObject({
      clientSessionId, currentCheckpoint: 0,
      durationMinutes: 60, lessonVersionId: response.body.lessonVersionId,
      planSnapshot: response.body.plan,
    });
    expect(stored.blocks).toHaveLength(4);
  });

  it('creates and persists a 45-minute session with three canonical blocks', async () => {
    const agent = await registerLearner(context.app, {
      displayName: '45m Learner', email: 'session45@example.test',
    });
    const clientSessionId = randomUUID();
    const response = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId, durationMinutes: 45,
    }).expect(201);

    expect(response.body).toMatchObject({
      clientSessionId,
      currentCheckpoint: 0,
      durationMinutes: 45,
      status: 'planned',
    });
    expect(response.body.plan.blocks.map((block: { order: number; targetMinutes: number; type: string }) =>
      [block.type, block.order, block.targetMinutes])).toEqual([
      ['readDecode', 1, 15],
      ['listenReason', 2, 15],
      ['respond', 3, 15],
    ]);
  });

  it('defaults to 60-minute duration when durationMinutes is omitted', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Default Duration Learner', email: 'default-duration@example.test',
    });
    const clientSessionId = randomUUID();
    const response = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId,
    }).expect(201);

    expect(response.body.durationMinutes).toBe(60);
    expect(response.body.plan.blocks).toHaveLength(4);
  });

  it('brings a weak reading item back into the next session review snapshot', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Review Learner', email: 'session-review@example.test',
    });
    const learner = await context.database.user.findUniqueOrThrow({
      where: { email: 'session-review@example.test' },
    });
    const first = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 45,
    }).expect(201);
    expect(first.body.plan.reviewItemIds).toBeUndefined();
    await agent.post(`/api/v1/learning-sessions/${first.body.id}/start`).expect(200);
    const readingId = first.body.plan.blocks[0].activityIds[0] as string;
    await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: first.body.id,
      response: { answerIndexes: [2, 2, 2] },
    }).expect(201);
    const review = await context.database.masteryRecord.findFirstOrThrow({
      where: { learnerId: learner.id, skill: 'reading' },
    });

    const second = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 45,
    }).expect(201);
    expect(second.body.plan.reviewItemIds).toContain(review.id);
    expect(second.body.plan.blocks[0].activityIds).toContain(readingId);
  });

  it('requires authentication, returns 422 for insufficient content, and rejects unsupported durations', async () => {
    await request(context.app.getHttpServer()).post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(401);
    const agent = await registerLearner(context.app, {
      displayName: 'Duration Learner', email: 'duration@example.test',
    });

    // 90 minutes has insufficient content for seed lesson (needs 6 activities, only 5 available)
    const insufficientRes = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 90,
    }).expect(422);
    expect(insufficientRes.body).toMatchObject({
      code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
      availableDurations: [45, 60],
    });

    // 30 minutes is not one of [45, 60, 90, 120, 150]
    const unsupportedRes = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 30,
    }).expect(422);
    expect(unsupportedRes.body).toMatchObject({ code: 'INVALID_SESSION_DURATION' });
  });

  it('returns the original session for a repeated clientSessionId', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Idempotent Learner', email: 'session-idempotent@example.test',
    });
    const input = { clientSessionId: randomUUID(), durationMinutes: 60 };
    const first = await agent.post('/api/v1/learning-sessions').send(input).expect(201);
    const second = await agent.post('/api/v1/learning-sessions').send(input).expect(201);
    expect(second.body).toEqual(first.body);
    await expect(context.database.learningSession.count()).resolves.toBe(1);
  });

  it('returns a learner-safe activity payload for the current session', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Activity Learner', email: 'activity@example.test',
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const activityId = session.body.plan.blocks[1].activityIds[0] as string;

    const response = await agent
      .get(`/api/v1/learning-sessions/${session.body.id}/activities/${activityId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      activityType: 'reading',
      content: [{ slug: 'welcome-email' }],
      id: activityId,
      payload: { questions: expect.any(Array) },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/answerIndex|explanation|evidence|sampleAnswer/u);
  });

  it('stores raw answers before deterministic evaluation and advances a checkpoint once', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Attempt Learner', email: 'attempt@example.test',
    });
    const learner = await context.database.user.findUniqueOrThrow({
      where: { email: 'attempt@example.test' },
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);

    const activateId = session.body.plan.blocks[0].activityIds[0] as string;
    await agent.post(`/api/v1/activities/${activateId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: session.body.id,
      response: { text: 'My name is Session Learner.' },
    }).expect(201);
    await expect(context.database.masteryEvent.count({
      where: { learnerId: learner.id },
    })).resolves.toBe(0);

    const readingId = session.body.plan.blocks[1].activityIds[0] as string;
    const incorrectResponse = { answerIndexes: [2, 2, 2] };
    await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: session.body.id, response: incorrectResponse,
    }).expect(201);
    await expect(context.database.masteryEvent.count({
      where: { learnerId: learner.id, skill: 'reading' },
    })).resolves.toBe(1);
    const afterIncorrect = await agent.get(`/api/v1/learning-sessions/${session.body.id}`).expect(200);
    expect(afterIncorrect.body.currentCheckpoint).toBe(1);
    expect(afterIncorrect.body.attempts.at(-1)).toMatchObject({ rawResponse: incorrectResponse });

    const clientAttemptId = randomUUID();
    const rawResponse = { answerIndexes: [0, 1, 1] };
    const first = await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId, sessionId: session.body.id, response: rawResponse,
    }).expect(201);
    expect(first.body).toMatchObject({
      activityId: readingId, evaluationStatus: 'evaluated', score: 1,
    });
    const stored = await context.database.activityAttempt.findUniqueOrThrow({
      where: { learnerId_clientAttemptId: {
        learnerId: first.body.learnerId, clientAttemptId,
      } },
    });
    expect(stored.rawResponse).toEqual(rawResponse);

    const duplicate = await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId, sessionId: session.body.id, response: rawResponse,
    }).expect(201);
    expect(duplicate.body).toEqual(first.body);
    await expect(context.database.masteryEvent.count({
      where: { learnerId: learner.id, skill: 'reading' },
    })).resolves.toBe(2);
    const refreshed = await agent.get(`/api/v1/learning-sessions/${session.body.id}`).expect(200);
    expect(refreshed.body.currentCheckpoint).toBe(2);
    await expect(context.database.activityAttempt.count()).resolves.toBe(3);
  });

  it('persists pause/resume transitions and reports invalid transitions', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Pause Learner', email: 'pause@example.test',
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const invalid = await agent.post(`/api/v1/learning-sessions/${session.body.id}/pause`).expect(409);
    expect(invalid.body).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const paused = await agent.post(`/api/v1/learning-sessions/${session.body.id}/pause`).expect(200);
    expect(paused.body.status).toBe('paused');
    const resumed = await agent.post(`/api/v1/learning-sessions/${session.body.id}/resume`).expect(200);
    expect(resumed.body.status).toBe('in_progress');
  });

  it('does not count a queued Teacher AI attempt as a completed activity', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Progress Learner', email: 'progress@example.test',
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const activityId = session.body.plan.blocks[0].activityIds[0] as string;
    await agent.post(`/api/v1/activities/${activityId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: session.body.id,
      response: { text: 'My name is Progress Learner.' },
    }).expect(201);

    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body).toEqual({
      activityAttempts: 1,
      completedActivities: 0,
      currentLevelCode: 'FOUNDATION_1',
      sessions: { completed: 0, inProgress: 1, paused: 0, planned: 0 },
    });
  });

  it('requires authentication for session availability query', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/learning-sessions/availability')
      .expect(401);
  });

  it('returns session availability without mutating database or triggering :id route', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Availability Learner',
      email: 'availability@example.test',
    });

    const sessionsBefore = await context.database.learningSession.count();
    const attemptsBefore = await context.database.activityAttempt.count();

    const response = await agent
      .get('/api/v1/learning-sessions/availability')
      .expect(200);

    expect(response.body).toEqual({
      mission: {
        id: expect.any(String),
        title: 'Introduce yourself to a new colleague',
      },
      lessonVersionId: expect.any(String),
      supportedDurations: [45, 60, 90, 120, 150],
      availableDurations: [45, 60],
      defaultDurationMinutes: 60,
    });

    const sessionsAfter = await context.database.learningSession.count();
    const attemptsAfter = await context.database.activityAttempt.count();
    expect(sessionsAfter).toBe(sessionsBefore);
    expect(attemptsAfter).toBe(attemptsBefore);
  });
});
