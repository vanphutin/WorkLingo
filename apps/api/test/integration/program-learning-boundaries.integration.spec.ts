import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createLearningSessionTestContext, registerLearner, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Program-scoped learning boundaries', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => { context = await createLearningSessionTestContext('program_learning'); }, 45_000);
  beforeEach(async () => {
    await context.resetLearners();
    await context.database.level.update({ where: { code: 'FOUNDATION_1' }, data: { status: 'PUBLISHED' } });
  });
  afterAll(async () => { await context?.close(); });

  it('selects sessions and mastery from enrollment despite a stale legacy level mirror', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Context Learner', email: 'mirror@example.test' });
    const learner = await context.database.user.findUniqueOrThrow({ where: { email: 'mirror@example.test' } });
    await context.database.learnerProfile.update({ where: { userId: learner.id }, data: { currentLevelCode: 'FOREIGN_LEVEL' } });
    await agent.get('/api/v1/learning-sessions/availability').expect(200);
    await agent.get('/api/v1/me/mastery-map').expect(200);
    const created = await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201);
    expect(created.body.mission.title).toBe('Introduce yourself to a new colleague');
  });

  it('does not start content at an archived level but preserves an existing session checkpoint', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Archive Learner', email: 'archive@example.test' });
    const session = await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201);
    await context.database.level.update({ where: { code: 'FOUNDATION_1' }, data: { status: 'ARCHIVED' } });
    await agent.get('/api/v1/learning-sessions/availability').expect(404);
    const resumed = await agent.get(`/api/v1/learning-sessions/${session.body.id}`).expect(200);
    expect(resumed.body.lessonVersionId).toBe(session.body.lessonVersionId);
    expect(resumed.body.plan).toEqual(session.body.plan);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
  });

  it('keeps ordinary onboarding limited to Intermediate even when IELTS has playable content', async () => {
    const database = context.database;
    const learningPath = await database.learningPath.create({ data: {
      slug: randomUUID(), name: 'IELTS fixture', status: 'PUBLISHED', programId: '10000000-0000-4000-8000-000000000004',
    } });
    const level = await database.level.create({ data: { pathId: learningPath.id, code: 'FOREIGN_1', name: 'Foreign level', cefrReference: 'B1', order: 0, status: 'PUBLISHED' } });
    const original = await database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' }, include: { lessons: true } });
    const mission = await database.mission.create({ data: { slug: randomUUID(), levelId: level.id, title: 'Foreign mission', objective: original.objective, order: 0, status: 'PUBLISHED' } });
    await database.missionLesson.create({ data: { missionId: mission.id, lessonId: original.lessons[0]!.lessonId, order: 0 } });
    const { agent } = await registerPendingLearner(context.app, { displayName: 'Pending Learner', email: 'foreign@example.test' });
    const state = await agent.get('/api/v1/me/onboarding').expect(200);
    expect(state.body.eligibleLevels.map((item: { code: string }) => item.code)).not.toContain('FOREIGN_1');
    await agent.post('/api/v1/me/onboarding/self-placement').send({ clientConfirmationId: randomUUID(), selectedLevelCode: 'FOREIGN_1' }).expect(422);
    expect((await agent.get('/api/v1/me/program-context').expect(200)).body.activeProgram).toBeNull();
  });
});
