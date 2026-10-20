import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
import { seedIeltsTopicCurriculum } from './ielts-topic-test-fixture.js';
import { IeltsTopicAdminService } from '../../src/ielts-study/application/ielts-topic-admin.service.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';

describe('IELTS study sessions and program isolation', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => {
    context = await createLearningSessionTestContext('ielts_study');
    context.app.get(ConfigService).set('ieltsFlow', 'v3');
    await context.database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'BETA' } });
  }, 60_000);
  afterAll(async () => context?.close());

  it('creates distinct canonical plans, scopes evidence, and resumes pinned attempts after rollback', async () => {
    const db = context.database;
    const fixture = await seedIeltsTopicCurriculum(context);
    const admin = await db.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Author', role: 'CONTENT_ADMIN', passwordHash: 'test-only' } });
    const publisher = context.app.get(IeltsTopicAdminService);
    const draft = await publisher.saveDraft(admin.id, null, { expectedRevision: null, idempotencyKey: randomUUID(), content: { schemaVersion: 1, title: 'Education', description: 'Education vocabulary for two real contexts.', packs: [fixture.pack] } });
    const published = await publisher.publish(admin.id, draft.id, { expectedRevision: draft.draftRevision, idempotencyKey: randomUUID() });
    const learner = await registerPendingLearner(context.app, { displayName: 'IELTS learner', email: `${randomUUID()}@test.local` });
    await learner.agent.post('/api/v1/me/onboarding/self-placement').send({ clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' }).expect(200);
    const beforeProfile = await db.learnerProfile.findUnique({ where: { userId: learner.user.id } });
    const beforeEnrollment = await db.learnerProgramEnrollment.findMany({ where: { learnerId: learner.user.id } });
    const catalog = await learner.agent.get('/api/v1/me/ielts-study/topics').expect(200);
    expect(catalog.body.topics[0].packs[0].supportedDurations).toEqual([90, 120, 150]);
    expect(catalog.body.topics[0].packs[0].sampleChunks[0]).toMatchObject({ expression: 'useful phrase 0', meaning: 'Nghĩa 0' });
    const start = { clientSessionId: randomUUID(), topicVersionId: published.topicVersionId, packSlug: fixture.pack.slug, durationMinutes: 90 };
    await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, durationMinutes: 60 }).expect(400);
    const [one, retry] = await Promise.all([learner.agent.post('/api/v1/me/ielts-study/sessions').send(start), learner.agent.post('/api/v1/me/ielts-study/sessions').send(start)]);
    expect(one.status).toBe(201); expect(retry.body.id).toBe(one.body.id);
    expect((await learner.agent.get(`/api/v1/learning-sessions/${one.body.id}`).expect(200)).body.ieltsTopic).toEqual({ topicVersionId: published.topicVersionId, title: 'Education', packSlug: fixture.pack.slug });
    for (const [durationMinutes, expectedBlocks] of [[120, 8], [150, 10]] as const) {
      const created = await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, clientSessionId: randomUUID(), durationMinutes }).expect(201);
      expect(created.body.plan.blocks).toHaveLength(expectedBlocks);
      const ids = created.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
      expect(new Set(ids).size).toBe(ids.length);
      for (const block of created.body.plan.blocks.filter((block: { type: string }) => block.type === 'respond')) expect(block.skills.sort()).toEqual(['speaking', 'writing']);
    }
    await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, durationMinutes: 150 }).expect(409);
    await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, packSlug: 'ielts-other-pack' }).expect(409);
    expect(await db.learnerProfile.findUnique({ where: { userId: learner.user.id } })).toEqual(beforeProfile);
    expect(await db.learnerProgramEnrollment.findMany({ where: { learnerId: learner.user.id, programId: '10000000-0000-4000-8000-000000000002' } })).toEqual(beforeEnrollment);
    const mastery = context.app.get(MasteryService);
    const targetBlock = fixture.lesson.mission.lessonVersion.wordBanks[0]!.languageBlocks[0]!;
    await db.masteryRecord.create({ data: { learnerId: learner.user.id, languageBlockId: targetBlock.id, skill: 'reading', state: 'STABLE', score: 1, confidence: 1, intervalDays: 7, nextReviewAt: new Date(0), lastLessonVersionId: fixture.version.id, lastEvidenceAt: new Date() } });
    expect(await mastery.getReviewQueue(learner.user.id, { programId: '10000000-0000-4000-8000-000000000004', limit: 1 })).toHaveLength(1);
    expect(await mastery.getReviewQueue(learner.user.id, { limit: 1 })).toHaveLength(0);
    expect(await mastery.getMasteryRecords(learner.user.id)).toHaveLength(0);
    const intermediateChunk = await db.languageBlock.findFirstOrThrow({ where: { slug: { not: { startsWith: 'ielts-' } } } });
    await db.masteryRecord.create({ data: { learnerId: learner.user.id, languageBlockId: intermediateChunk.id, skill: 'reading', state: 'NEEDS_ATTENTION', score: 0, nextReviewAt: new Date(0) } });
    expect((await mastery.getReviewQueue(learner.user.id, { programId: '10000000-0000-4000-8000-000000000004', limit: 1 }))[0]!.languageBlockId).toBe(targetBlock.id);
    const ownedProgress = await learner.agent.get('/api/v1/me/progress').expect(200);
    await learner.agent.post(`/api/v1/learning-sessions/${one.body.id}/start`).expect(200);
    const plannedIds: string[] = one.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
    for (const activityId of plannedIds.slice(0, 2)) {
      const source = fixture.lesson.mission.lessonVersion.activities.find(activity => activity.id === activityId)!;
      const response = source.activityType === 'reading' || source.activityType === 'listening' ? { answerIndexes: source.payload.questions.map(question => question.answerIndex === 0 ? 1 : 0) } : { text: 'My name is Test Learner. I work with a study group.' };
      await learner.agent.post(`/api/v1/activities/${activityId}/attempts`).send({ clientAttemptId: randomUUID(), sessionId: one.body.id, response }).expect(201);
    }
    expect((await learner.agent.get('/api/v1/me/progress').expect(200)).body).toEqual(ownedProgress.body);
    expect((await mastery.getErrorBank(learner.user.id)).total).toBe(0);
    expect((await mastery.getErrorBank(learner.user.id, { programId: '10000000-0000-4000-8000-000000000004' })).total).toBe(12);
    const progress = await learner.agent.get('/api/v1/me/ielts-study/progress').expect(200);
    expect(progress.body.masteredChunkCount).toBe(0);
    expect(progress.body.practicedChunkCount).toBe(12);
    expect(progress.body.pendingEvaluationCount).toBe(1);
    await db.ieltsTopic.update({ where: { id: draft.id }, data: { status: 'ARCHIVED', currentPublishedVersionId: null } });
    await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, clientSessionId: randomUUID() }).expect(409);
    context.app.get(ConfigService).set('ieltsFlow', 'legacy');
    expect((await learner.agent.post('/api/v1/me/ielts-study/sessions').send(start).expect(201)).body.plan).toEqual(one.body.plan);
    expect((await learner.agent.get(`/api/v1/learning-sessions/${one.body.id}`).expect(200)).body.plan).toEqual(one.body.plan);
    await learner.agent.post('/api/v1/me/ielts-study/sessions').send({ ...start, clientSessionId: randomUUID() }).expect(409);
  });
});
