import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestClock } from '../../src/mastery/domain/clock.port.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';
import { CurriculumService } from '../../src/curriculum/application/curriculum.service.js';
import { LearningSessionsService } from '../../src/learning-sessions/application/learning-sessions.service.js';
import { seedWorkplaceTransferCurriculum } from '../../src/curriculum/infrastructure/seed-workplace-transfer.js';
import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('adaptive learning visibility and recurrence', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => { context = await createLearningSessionTestContext('adaptive_learning'); }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('requires authentication and isolates the four-skill map by learner', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/me/mastery-map').expect(401);
    const learner = await registerLearner(context.app, { email: 'map@example.test', displayName: 'Map learner' });
    const other = await registerLearner(context.app, { email: 'other-map@example.test', displayName: 'Other learner' });
    const empty = await learner.get('/api/v1/me/mastery-map').expect(200);
    expect(empty.body.items).toHaveLength(4);
    expect(empty.body.items[0].skills).toEqual({ reading: null, listening: null, speaking: null, writing: null });
    const session = await learner.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID() }).expect(201);
    await learner.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const ids = session.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
    await learner.post(`/api/v1/activities/${ids[0]}/attempts`).send({
      sessionId: session.body.id, clientAttemptId: randomUUID(), response: { text: 'My name is An.' },
    }).expect(201);
    await learner.post(`/api/v1/activities/${ids[1]}/attempts`).send({
      sessionId: session.body.id, clientAttemptId: randomUUID(), response: { answerIndexes: [1, 0, 0] },
    }).expect(201);
    const own = await learner.get('/api/v1/me/mastery-map').expect(200);
    const block = own.body.items.find((item: { slug: string }) => item.slug === 'do-you-need-help');
    expect(block.skills.reading).toMatchObject({ state: 'NEEDS_ATTENTION', score: 0 });
    expect(block.skills.speaking).toBeNull();
    expect(own.body.reviewQueue).toEqual(expect.arrayContaining([expect.objectContaining({ skill: 'reading', priorityReason: 'NEEDS_ATTENTION' })]));
    const isolated = await other.get('/api/v1/me/mastery-map').expect(200);
    expect(isolated.body.items.every((item: { skills: Record<string, unknown> }) =>
      Object.values(item.skills).every((state) => state === null))).toBe(true);
    expect(isolated.body.reviewQueue).toEqual([]);
  });

  it('brings evaluated knowledge back after injected time crosses its due date', async () => {
    const learner = await registerLearner(context.app, { email: 'due@example.test', displayName: 'Due learner' });
    const user = await learner.get('/api/v1/me').expect(200);
    const block = await context.database.languageBlock.findUniqueOrThrow({ where: { slug: 'do-you-need-help' } });
    await context.database.masteryRecord.create({ data: {
      learnerId: user.body.id, languageBlockId: block.id, skill: 'reading', state: 'STABLE',
      score: 1, confidence: 0.9, intervalDays: 5,
      lastEvidenceAt: new Date('2026-10-01T00:00:00Z'), nextReviewAt: new Date('2026-10-10T00:00:00Z'),
    } });
    const clock = new TestClock(new Date('2026-10-08T00:00:00Z'));
    const service = new MasteryService(context.database, clock);
    const sessions = new LearningSessionsService(context.database, context.app.get(CurriculumService), service);
    expect(await service.getReviewQueue(user.body.id)).toEqual([]);
    const before = await sessions.createSession(user.body.id, 60, randomUUID());
    expect(before.plan.reviewItemIds).toBeUndefined();
    clock.advanceDays(3);
    const due = await service.getReviewQueue(user.body.id);
    expect(due).toEqual([expect.objectContaining({ skill: 'reading', priorityReason: 'OVERDUE' })]);
    const after = await sessions.createSession(user.body.id, 60, randomUUID());
    expect(after.plan.reviewItemIds).toEqual([due[0]!.id]);
    expect(after.plan.reviewSelections?.[0]).toMatchObject({ reviewItemId: due[0]!.id, transferred: false });
  });

  it('selects a new published workplace context without changing a learner existing version', async () => {
    const learner = await registerLearner(context.app, { email: 'transfer@example.test', displayName: 'Transfer learner' });
    const user = await learner.get('/api/v1/me').expect(200);
    const original = await learner.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID() }).expect(201);
    await learner.post(`/api/v1/learning-sessions/${original.body.id}/start`).expect(200);
    const ids = original.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
    await learner.post(`/api/v1/activities/${ids[0]}/attempts`).send({
      sessionId: original.body.id, clientAttemptId: randomUUID(), response: { text: 'My name is An.' },
    }).expect(201);
    await learner.post(`/api/v1/activities/${ids[1]}/attempts`).send({
      sessionId: original.body.id, clientAttemptId: randomUUID(), response: { answerIndexes: [1, 0, 0] },
    }).expect(201);
    await seedWorkplaceTransferCurriculum(context.database);
    await seedWorkplaceTransferCurriculum(context.database);
    const availability = await learner.get('/api/v1/learning-sessions/availability').expect(200);
    expect(availability.body.mission.title).toBe('Welcome a customer to your workplace');
    const next = await learner.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID() }).expect(201);
    expect(next.body.mission.id).toBe(availability.body.mission.id);
    expect(next.body.plan.reviewSelections).toEqual([expect.objectContaining({ transferred: true })]);
    const queue = await context.app.get(MasteryService).getReviewQueue(user.body.id);
    expect(queue[0]?.previousContextSignatures).toHaveLength(1);
    const unchanged = await learner.get(`/api/v1/learning-sessions/${original.body.id}`).expect(200);
    expect(unchanged.body.lessonVersionId).toBe(original.body.lessonVersionId);
    expect(unchanged.body.currentCheckpoint).toBe(1);
    expect(await context.database.mission.count({ where: { slug: 'welcome-a-workplace-customer' } })).toBe(1);
  });
});
