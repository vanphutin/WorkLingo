import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('learner Teacher AI API', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('teacher_ai_api');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('enforces ownership, optimistic draft revisions, and learner-safe retry state', async () => {
    const owner = await registerLearner(context.app, {
      displayName: 'Teacher AI Owner', email: 'teacher-ai-owner@example.test',
    });
    const other = await registerLearner(context.app, {
      displayName: 'Teacher AI Other', email: 'teacher-ai-other@example.test',
    });
    const sessionResponse = await owner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const session = await context.database.learningSession.findUniqueOrThrow({
      where: { id: sessionResponse.body.id },
    });
    const activityIds = (sessionResponse.body.plan.blocks as Array<{ activityIds: string[] }>)
      .flatMap((block) => block.activityIds);
    const activities = await context.database.activity.findMany({ where: { id: { in: activityIds } } });
    const writing = activities.find((activity) => activity.activityType === 'writing');
    if (!writing) throw new Error('Foundation fixture needs a writing activity');

    const first = await owner.put(
      `/api/v1/learning-sessions/${session.id}/activities/${writing.id}/draft`,
    ).send({ expectedRevision: 0, text: 'First local draft' }).expect(200);
    expect(first.body).toMatchObject({ revision: 1, text: 'First local draft' });
    const second = await owner.put(
      `/api/v1/learning-sessions/${session.id}/activities/${writing.id}/draft`,
    ).send({ expectedRevision: 1, text: 'Newest server draft' }).expect(200);
    expect(second.body.revision).toBe(2);
    const stale = await owner.put(
      `/api/v1/learning-sessions/${session.id}/activities/${writing.id}/draft`,
    ).send({ expectedRevision: 1, text: 'Stale tab draft' }).expect(409);
    expect(stale.body).toMatchObject({ code: 'DRAFT_REVISION_CONFLICT', currentRevision: 2 });
    await other.get(
      `/api/v1/learning-sessions/${session.id}/activities/${writing.id}/draft`,
    ).expect(404);
    await owner.get(
      `/api/v1/learning-sessions/${session.id}/activities/${writing.id}/draft`,
    ).expect(200).expect(({ body }) => expect(body.text).toBe('Newest server draft'));

    const attempt = await context.database.activityAttempt.create({
      data: {
        activityId: writing.id,
        clientAttemptId: randomUUID(),
        evaluationStatus: 'EVALUATION_FAILED',
        learnerId: session.learnerId,
        rawResponse: { text: 'I will follow up tomorrow.' },
        sessionId: session.id,
      },
    });
    await context.database.job.create({
      data: {
        attemptCount: 1,
        completedAt: new Date(),
        createdById: session.learnerId,
        errorCode: 'PROVIDER_TIMEOUT',
        errorSummary: 'Provider request timed out.',
        idempotencyKey: `evaluate:${attempt.id}`,
        payload: { attemptId: attempt.id },
        resourceId: attempt.id,
        resourceType: 'ActivityAttempt',
        retryable: true,
        status: 'FAILED',
        type: 'EVALUATE_ATTEMPT',
      },
    });

    await other.get(`/api/v1/attempts/${attempt.id}/evaluation`).expect(404);
    const evaluation = await owner.get(`/api/v1/attempts/${attempt.id}/evaluation`).expect(200);
    expect(evaluation.body).toEqual({
      attemptId: attempt.id,
      completedAt: null,
      feedback: null,
      recording: null,
      retryable: true,
      score: null,
      scores: null,
      status: 'evaluation_failed',
      transcript: null,
    });
    expect(JSON.stringify(evaluation.body)).not.toContain('payload');
    await owner.post(`/api/v1/attempts/${attempt.id}/evaluation/retry`).expect(202);
    await expect(context.database.job.findUniqueOrThrow({
      where: { idempotencyKey: `evaluate:${attempt.id}` },
    })).resolves.toMatchObject({ status: 'PENDING', retryable: false });
  });
});
