import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedPlacementCurriculum } from '../../src/curriculum/infrastructure/seed-placement.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import {
  createLearningSessionTestContext,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('placement attempt creation', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('placement_attempt');
    await seedPlacementCurriculum(context.database, context.app.get(ObjectStorage));
  }, 45_000);

  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('atomically creates a fixed 45-minute placement session bound to its lesson version', async () => {
    const { agent, user } = await registerPendingLearner(context.app, {
      displayName: 'Placement learner', email: 'placement@example.test',
    });
    const clientAttemptId = randomUUID();

    const response = await agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId }).expect(201);

    expect(response.body).toMatchObject({
      clientAttemptId,
      nextAction: 'continue_assessment',
      policyVersion: 'workplace-placement-v1',
      recommendedLevelCode: null,
      status: 'IN_PROGRESS',
    });
    expect(response.body.skillResults).toEqual({
      listening: { evidenceCount: 0, score: null, status: 'pending' },
      reading: { evidenceCount: 0, score: null, status: 'pending' },
      speaking: { evidenceCount: 0, score: null, status: 'pending' },
      writing: { evidenceCount: 0, score: null, status: 'pending' },
    });

    const session = await context.database.learningSession.findUniqueOrThrow({
      where: { id: response.body.learningSessionId }, include: { mission: true },
    });
    const attempt = await context.database.placementAttempt.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(session).toMatchObject({
      clientSessionId: clientAttemptId,
      durationMinutes: 45,
      learnerId: user.id,
      lessonVersionId: response.body.lessonVersionId,
      mission: { purpose: 'PLACEMENT' },
    });
    expect(attempt.lessonVersionId).toBe(session.lessonVersionId);

    const learnerSession = await agent.get(`/api/v1/learning-sessions/${session.id}`).expect(200);
    expect(learnerSession.body).toMatchObject({ purpose: 'placement', lessonVersionId: session.lessonVersionId });
  });

  it('replays one client UUID and rejects a second active placement attempt', async () => {
    const { agent } = await registerPendingLearner(context.app, {
      displayName: 'Resume learner', email: 'resume-placement@example.test',
    });
    const input = { clientAttemptId: randomUUID() };

    const first = await agent.post('/api/v1/me/onboarding/placement-attempts').send(input).expect(201);
    const replay = await agent.post('/api/v1/me/onboarding/placement-attempts').send(input).expect(201);
    expect(replay.body).toEqual(first.body);

    const conflict = await agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(409);
    expect(conflict.body).toMatchObject({
      attemptId: first.body.id,
      code: 'PLACEMENT_ATTEMPT_ACTIVE',
      statusCode: 409,
    });
    await expect(context.database.placementAttempt.count()).resolves.toBe(1);
    await expect(context.database.learningSession.count()).resolves.toBe(1);
  });

  it('serializes concurrent creation so exactly one active attempt is committed', async () => {
    const { agent } = await registerPendingLearner(context.app, {
      displayName: 'Concurrent learner', email: 'concurrent-placement@example.test',
    });

    const [left, right] = await Promise.all([
      agent.post('/api/v1/me/onboarding/placement-attempts').send({ clientAttemptId: randomUUID() }),
      agent.post('/api/v1/me/onboarding/placement-attempts').send({ clientAttemptId: randomUUID() }),
    ]);

    expect([left.status, right.status].sort()).toEqual([201, 409]);
    await expect(context.database.placementAttempt.count()).resolves.toBe(1);
    await expect(context.database.learningSession.count()).resolves.toBe(1);
  });

  it('rejects ordinary learning sessions while onboarding is pending', async () => {
    const { agent } = await registerPendingLearner(context.app, {
      displayName: 'Pending learner', email: 'pending-learning@example.test',
    });

    const response = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(409);

    expect(response.body).toMatchObject({ code: 'ONBOARDING_REQUIRED', statusCode: 409 });
  });

  it('checks completed onboarding before exposing placement curriculum availability', async () => {
    const { agent } = await registerPendingLearner(context.app, {
      displayName: 'Completed learner', email: 'completed-placement@example.test',
    });
    await agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1',
    }).expect(200);
    const mission = await context.database.mission.findUniqueOrThrow({
      where: { slug: 'workplace-placement-diagnostic' },
    });
    await context.database.mission.update({ where: { id: mission.id }, data: { status: 'ARCHIVED' } });

    try {
      const response = await agent.post('/api/v1/me/onboarding/placement-attempts')
        .send({ clientAttemptId: randomUUID() }).expect(409);
      expect(response.body).toMatchObject({ code: 'ONBOARDING_ALREADY_COMPLETE', statusCode: 409 });
    } finally {
      await context.database.mission.update({ where: { id: mission.id }, data: { status: 'PUBLISHED' } });
    }
  });

  it('keeps the placement session owner-scoped', async () => {
    const owner = await registerPendingLearner(context.app, {
      displayName: 'Owner learner', email: 'placement-owner@example.test',
    });
    const other = await registerPendingLearner(context.app, {
      displayName: 'Other learner', email: 'placement-other@example.test',
    });
    const placement = await owner.agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(201);

    await other.agent.get(`/api/v1/learning-sessions/${placement.body.learningSessionId}`).expect(404);
  });

  it('rolls back the session when placement-attempt persistence fails', async () => {
    const { agent, user } = await registerPendingLearner(context.app, {
      displayName: 'Rollback learner', email: 'placement-rollback@example.test',
    });
    await context.database.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION "${context.schemaName}"."reject_placement_attempt"()
      RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced placement failure'; END; $$ LANGUAGE plpgsql
    `);
    await context.database.$executeRawUnsafe(`
      CREATE TRIGGER "placement_attempt_failure"
      BEFORE INSERT ON "${context.schemaName}"."PlacementAttempt"
      FOR EACH ROW EXECUTE FUNCTION "${context.schemaName}"."reject_placement_attempt"()
    `);

    await agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(500);

    await expect(context.database.placementAttempt.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.learningSession.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await context.database.$executeRawUnsafe(
      `DROP TRIGGER "placement_attempt_failure" ON "${context.schemaName}"."PlacementAttempt"`,
    );
  });
});
