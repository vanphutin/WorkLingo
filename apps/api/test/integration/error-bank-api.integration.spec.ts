import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('Error Bank & Memory Health HTTP API Integration', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('error_bank_api_test');
  }, 45_000);

  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('rejects unauthenticated requests with 401', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/me/error-bank')
      .expect(401);

    await request(context.app.getHttpServer())
      .get('/api/v1/me/memory-health')
      .expect(401);
  });

  it('returns null health for unassessed skills and empty error bank for fresh learner', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Fresh Learner',
      email: 'fresh@example.test',
    });

    const errorBankRes = await learner.get('/api/v1/me/error-bank').expect(200);
    expect(errorBankRes.body).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    const healthRes = await learner.get('/api/v1/me/memory-health').expect(200);
    expect(healthRes.body.reading.health).toBeNull();
    expect(healthRes.body.reading.evaluatedBlocksCount).toBe(0);
    expect(healthRes.body.listening.health).toBeNull();
    expect(healthRes.body.speaking.health).toBeNull();
    expect(healthRes.body.writing.health).toBeNull();
    expect(healthRes.body.overall.health).toBeNull();
  });

  it('handles SUBMITTED vs EVALUATED correctly, populating error bank and isolating data per learner', async () => {
    const learnerA = await registerLearner(context.app, {
      displayName: 'Learner A',
      email: 'learner-a@example.test',
    });
    const learnerB = await registerLearner(context.app, {
      displayName: 'Learner B',
      email: 'learner-b@example.test',
    });

    // Learner A creates and starts a learning session
    const sessionRes = await learnerA.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(),
      durationMinutes: 60,
    }).expect(201);

    const sessionId = sessionRes.body.id;
    await learnerA.post(`/api/v1/learning-sessions/${sessionId}/start`).expect(200);

    // Activity 0 is writing (activate) -> durably queued for Teacher AI.
    const writingActivityId = sessionRes.body.plan.blocks[0].activityIds[0];
    const submittedAttempt = await learnerA
      .post(`/api/v1/activities/${writingActivityId}/attempts`)
      .send({
        clientAttemptId: randomUUID(),
        sessionId,
        response: { text: 'My name is An.' },
      })
      .expect(201);

    expect(submittedAttempt.body.evaluationStatus).toBe('queued');
    expect(submittedAttempt.body.score).toBeNull();

    // Verify Error Bank is still empty (writing is queued and remains unassessed).
    const errorBankEmpty = await learnerA.get('/api/v1/me/error-bank').expect(200);
    expect(errorBankEmpty.body.total).toBe(0);

    // Verify writing health is still null
    const healthInitial = await learnerA.get('/api/v1/me/memory-health').expect(200);
    expect(healthInitial.body.writing.health).toBeNull();

    // Activity 1 is reading (readDecode) with 3 questions
    const readingActivityId = sessionRes.body.plan.blocks[1].activityIds[0];

    // Submit an INCORRECT attempt on reading (wrong answers for 3 questions)
    const evaluatedAttempt = await learnerA
      .post(`/api/v1/activities/${readingActivityId}/attempts`)
      .send({
        clientAttemptId: randomUUID(),
        sessionId,
        response: { answerIndexes: [2, 2, 2] }, // all wrong options
      })
      .expect(201);

    expect(evaluatedAttempt.body.evaluationStatus).toBe('evaluated');
    expect(evaluatedAttempt.body.score).toBe(0);

    // Learner A calls /me/error-bank
    const errorBankA = await learnerA.get('/api/v1/me/error-bank').expect(200);
    expect(errorBankA.body.total).toBe(1);
    expect(errorBankA.body.items).toHaveLength(1);

    const entry = errorBankA.body.items[0];
    expect(entry.occurrenceCount).toBe(1);
    expect(entry.activityId).toBe(readingActivityId);
    expect(entry.canonicalForm).toBeDefined();
    expect(entry.languageBlockSlug).toBeDefined();
    expect(entry.contextKey).toContain(':');
    expect(entry.errorType).toBe('ACTIVITY_INCORRECT');
    expect(entry.evidenceGranularity).toBe('ACTIVITY');

    // Leak check: Ensure no private internals are exposed
    expect(entry).not.toHaveProperty('rawResponse');
    expect(entry).not.toHaveProperty('normalizedResponse');
    expect(entry).not.toHaveProperty('passwordHash');
    expect(entry).not.toHaveProperty('tokenHash');

    // Learner B calls /me/error-bank -> MUST NOT see Learner A's errors (strict data isolation)
    const errorBankB = await learnerB.get('/api/v1/me/error-bank').expect(200);
    expect(errorBankB.body.total).toBe(0);
    expect(errorBankB.body.items).toHaveLength(0);

    // Learner A retries the reading activity and fails again
    await learnerA
      .post(`/api/v1/activities/${readingActivityId}/attempts`)
      .send({
        clientAttemptId: randomUUID(),
        sessionId,
        response: { answerIndexes: [2, 2, 0] }, // partial wrong: 1/3 = 0.33 < 0.7
      })
      .expect(201);

    const errorBankA2 = await learnerA.get('/api/v1/me/error-bank').expect(200);
    expect(errorBankA2.body.total).toBe(1);
    expect(errorBankA2.body.items[0].occurrenceCount).toBe(2);

    // Filter by skill
    const readingFilter = await learnerA.get('/api/v1/me/error-bank?skill=reading').expect(200);
    expect(readingFilter.body.total).toBe(1);

    const listeningFilter = await learnerA.get('/api/v1/me/error-bank?skill=listening').expect(200);
    expect(listeningFilter.body.total).toBe(0);

    // Pagination
    const paginated = await learnerA.get('/api/v1/me/error-bank?page=1&limit=1').expect(200);
    expect(paginated.body.page).toBe(1);
    expect(paginated.body.limit).toBe(1);
    expect(paginated.body.totalPages).toBe(1);

    // Check Learner A memory health
    const healthA = await learnerA.get('/api/v1/me/memory-health').expect(200);
    expect(typeof healthA.body.reading.health).toBe('number');
    expect(healthA.body.reading.evaluatedBlocksCount).toBeGreaterThan(0);
    expect(healthA.body.speaking.health).toBeNull(); // speaking remains unassessed
    expect(healthA.body.writing.health).toBeNull(); // writing remains unassessed
    expect(typeof healthA.body.overall.health).toBe('number');
  });
});
