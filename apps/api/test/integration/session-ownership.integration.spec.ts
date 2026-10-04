import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('learning session ownership and recovery', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('session_ownership_test');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('returns 404 when another learner reads or submits to a session', async () => {
    const owner = await registerLearner(context.app, {
      displayName: 'Owner Learner', email: 'owner@example.test',
    });
    const other = await registerLearner(context.app, {
      displayName: 'Other Learner', email: 'other@example.test',
    });
    const session = await owner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const activityId = session.body.plan.blocks[0].activityIds[0] as string;

    await other.get(`/api/v1/learning-sessions/${session.body.id}`).expect(404);
    await other
      .get(`/api/v1/learning-sessions/${session.body.id}/activities/${activityId}`)
      .expect(404);
    await other.post(`/api/v1/activities/${activityId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: session.body.id,
      response: { text: 'My name is Other Learner.' },
    }).expect(404);
    await expect(context.database.activityAttempt.count()).resolves.toBe(0);
  });

  it('does not let an idempotency key bypass session ownership or change its target', async () => {
    const owner = await registerLearner(context.app, {
      displayName: 'Key Owner', email: 'key-owner@example.test',
    });
    const other = await registerLearner(context.app, {
      displayName: 'Key Other', email: 'key-other@example.test',
    });
    const ownerSession = await owner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const otherSession = await other.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await other.post(`/api/v1/learning-sessions/${otherSession.body.id}/start`).expect(200);
    const otherActivityId = otherSession.body.plan.blocks[0].activityIds[0] as string;
    const clientAttemptId = randomUUID();
    await other.post(`/api/v1/activities/${otherActivityId}/attempts`).send({
      clientAttemptId, sessionId: otherSession.body.id,
      response: { text: 'My name is Key Other.' },
    }).expect(201);

    const ownerActivityId = ownerSession.body.plan.blocks[0].activityIds[0] as string;
    await other.post(`/api/v1/activities/${ownerActivityId}/attempts`).send({
      clientAttemptId, sessionId: ownerSession.body.id,
      response: { text: 'This must not bypass ownership.' },
    }).expect(404);

    const nextActivityId = otherSession.body.plan.blocks[1].activityIds[0] as string;
    const mismatch = await other.post(`/api/v1/activities/${nextActivityId}/attempts`).send({
      clientAttemptId, sessionId: otherSession.body.id,
      response: { answerIndexes: [0, 1, 1] },
    }).expect(409);
    expect(mismatch.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('restores the persisted checkpoint after a fresh login', async () => {
    const credentials = {
      displayName: 'Refresh Learner', email: 'refresh@example.test',
      password: 'a-secure-local-password',
    };
    const firstClient = await registerLearner(context.app, credentials);
    const session = await firstClient.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await firstClient.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const activityId = session.body.plan.blocks[0].activityIds[0] as string;
    await firstClient.post(`/api/v1/activities/${activityId}/attempts`).send({
      clientAttemptId: randomUUID(), sessionId: session.body.id,
      response: { text: 'My name is Refresh Learner.' },
    }).expect(201);

    const freshClient = request.agent(context.app.getHttpServer());
    await freshClient.post('/api/v1/auth/login').send({
      email: credentials.email, password: credentials.password,
    }).expect(200);
    const restored = await freshClient.get(`/api/v1/learning-sessions/${session.body.id}`).expect(200);
    expect(restored.body).toMatchObject({
      currentCheckpoint: 1, id: session.body.id, status: 'in_progress',
    });
    expect(restored.body.attempts).toHaveLength(1);
  });
});
