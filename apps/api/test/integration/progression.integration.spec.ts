import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { checkpointAssessmentSchema, progressionSummarySchema, sessionPlanSchema } from '@worklingo/contracts';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createLearningSessionTestContext, registerLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';
import { activitySchema, lessonSnapshotSchema, type LessonSnapshot } from '../../src/curriculum/domain/curriculum.types.js';
import { MasteryService } from '../../src/mastery/application/mastery.service.js';

describe('learner progression HTTP API', () => {
  let context: LearningSessionTestContext;
  const createdMissionIds: string[] = [];
  const createdLevelIds: string[] = [];
  const extraLessonLinks: { missionId: string; lessonId: string }[] = [];
  const shiftedLessonLinks: { missionId: string; lessonId: string; order: number }[] = [];
  beforeAll(async () => { context = await createLearningSessionTestContext('progression'); }, 45_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());
  afterEach(async () => {
    for (const link of extraLessonLinks) await context.database.missionLesson.delete({ where: { missionId_lessonId: link } });
    extraLessonLinks.length = 0;
    for (const { missionId, lessonId, order } of shiftedLessonLinks) {
      await context.database.missionLesson.update({ where: { missionId_lessonId: { missionId, lessonId } }, data: { order } });
    }
    shiftedLessonLinks.length = 0;
    await context.database.missionLesson.deleteMany({ where: { missionId: { in: createdMissionIds } } });
    await context.database.mission.deleteMany({ where: { id: { in: createdMissionIds } } });
    await context.database.level.deleteMany({ where: { id: { in: createdLevelIds } } });
    createdMissionIds.length = 0;
    createdLevelIds.length = 0;
  });

  async function completedSession() {
    const email = `checkpoint-${randomUUID()}@example.test`;
    const agent = await registerLearner(context.app, { displayName: 'Checkpoint Learner', email });
    const learner = await context.database.user.findUniqueOrThrow({ where: { email } });
    const created = await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID(), durationMinutes: 60 }).expect(201);
    const plan = sessionPlanSchema.parse(created.body.plan);
    const sessionId = String(created.body.id);
    await agent.post(`/api/v1/learning-sessions/${sessionId}/start`).expect(200);
    for (const activityId of plan.blocks.flatMap((block) => block.activityIds)) {
      const row = await context.database.activity.findUniqueOrThrow({ where: { id: activityId } });
      const activity = activitySchema.parse(row);
      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: activity.payload.questions.map((question) => question.answerIndex) }
        : { text: 'Hello, my name is An. I work in the support team.' };
      await agent.post(`/api/v1/activities/${activityId}/attempts`).send({
        clientAttemptId: randomUUID(), sessionId, response,
      }).expect(201);
    }
    return { agent, learnerId: learner.id, sessionId, plan };
  }

  async function evaluatedSession() {
    const completed = await completedSession();
    const attempts = await context.database.activityAttempt.findMany({
      where: { sessionId: completed.sessionId, evaluationStatus: 'SUBMITTED' }, include: { activity: true },
    });
    // Simulate server/provider evaluation, never a learner-supplied score.
    for (const attempt of attempts) {
      await context.database.activityAttempt.update({ where: { id: attempt.id }, data: { evaluationStatus: 'EVALUATED', score: 0.7 } });
      await context.app.get(MasteryService).recordAttemptEvaluation({
        attemptId: attempt.id, learnerId: completed.learnerId, lessonVersionId: completed.plan.lessonVersionId,
        skills: attempt.activity.skills, languageBlockSlugs: attempt.activity.languageBlockReferences,
        score: 0.7, evaluationStatus: 'EVALUATED',
      });
    }
    return completed;
  }

  async function nextLevel(code: string, order: number, hasPublishedContent = true) {
    const current = await context.database.level.findUniqueOrThrow({ where: { code: 'FOUNDATION_1' } });
    const level = await context.database.level.create({ data: { code, order, pathId: current.pathId, name: code, cefrReference: 'A1' } });
    createdLevelIds.push(level.id);
    if (hasPublishedContent) {
      const mission = await context.database.mission.create({ data: {
        levelId: level.id, slug: `next-${randomUUID()}`, title: 'Next published workplace mission', objective: 'Practice at the next level', order: 0, status: 'PUBLISHED',
      } });
      createdMissionIds.push(mission.id);
      const lesson = await context.database.lesson.findFirstOrThrow({ where: { currentPublishedVersionId: { not: null } } });
      await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: lesson.id, order: 0 } });
    }
    return level;
  }

  async function publishedLesson(input: LessonSnapshot) {
    const snapshot = {
      ...input,
      contentBlocks: input.contentBlocks.map((block) => ({ ...block, id: randomUUID() })),
      activities: input.activities.map((activity) => ({ ...activity, id: randomUUID() })),
    };
    const lesson = await context.database.lesson.create({ data: { slug: `later-lesson-${randomUUID()}` } });
    const version = await context.database.lessonVersion.create({ data: {
      lessonId: lesson.id, version: 1, title: snapshot.title, sourceHash: randomUUID(), parsedContent: snapshot as Prisma.InputJsonValue,
    } });
    await context.database.contentBlock.createMany({ data: snapshot.contentBlocks.map((block, order) => ({
      id: block.id, slug: block.slug, type: block.type, text: block.text, order, lessonVersionId: version.id,
      metadata: block.audio ? { audio: block.audio } : {},
    })) });
    await context.database.activity.createMany({ data: snapshot.activities.map((activity) => ({ ...activity, lessonVersionId: version.id })) });
    await context.database.lessonVersionWordBank.createMany({ data: snapshot.wordBanks.map((bank) => ({
      lessonVersionId: version.id, wordBankId: bank.id,
    })) });
    await context.database.lessonVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await context.database.lesson.update({ where: { id: lesson.id }, data: { currentPublishedVersionId: version.id } });
    return lesson;
  }

  it('starts at the persisted Foundation level with no assessable session', async () => {
    const agent = await registerLearner(context.app, { displayName: 'Progression Learner', email: 'progression@example.test' });
    const response = await agent.get('/api/v1/me/progression').expect(200);
    expect(progressionSummarySchema.parse(response.body)).toMatchObject({
      currentLevelCode: 'FOUNDATION_1', eligibleSessionId: null, canAssess: false, latestAssessment: null,
    });
    await request(context.app.getHttpServer()).get('/api/v1/me/progression').expect(401);
  });

  it('allows assessment of a completed session while speaking and writing remain honestly pending', async () => {
    const { agent, sessionId } = await completedSession();
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body).toMatchObject({ eligibleSessionId: sessionId, canAssess: true });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    const assessment = checkpointAssessmentSchema.parse(response.body);
    expect(assessment).toMatchObject({ sessionId, levelCode: 'FOUNDATION_1', status: 'pending_evaluation', canAdvance: false });
    expect(assessment.skills.reading).toMatchObject({ score: 1, passed: true });
    expect(assessment.skills.speaking).toMatchObject({ score: null, evaluatedCount: 0, passed: false });
    expect(assessment.skills.speaking.pendingCount).toBeGreaterThan(0);
    const latest = await agent.get('/api/v1/me/progression').expect(200);
    expect(latest.body.latestAssessment).toEqual(assessment);
  });

  it('rejects confirmation while one of the four skills is still pending', async () => {
    const { agent, sessionId } = await completedSession();
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).send({}).expect(409);
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body.currentLevelCode).toBe('FOUNDATION_1');
  });

  it('confirms successful current-level completion without inventing next content', async () => {
    const { agent, sessionId } = await evaluatedSession();
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'passed', canAdvance: false, nextLevelCode: null });
    const confirmed = await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).send({}).expect(200);
    expect(confirmed.body.currentLevelCode).toBe('FOUNDATION_1');
    const replay = await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).send({}).expect(200);
    expect(replay.body).toEqual(confirmed.body);
  });

  it('uses persisted current level in the existing progress API even without sessions', async () => {
    const email = 'persisted-progress@example.test';
    const agent = await registerLearner(context.app, { displayName: 'Persisted Level', email });
    const learner = await context.database.user.findUniqueOrThrow({ where: { email } });
    await context.database.learnerProfile.update({ where: { userId: learner.id }, data: { currentLevelCode: 'FOUNDATION_2' } });
    const response = await agent.get('/api/v1/me/progress').expect(200);
    expect(response.body.currentLevelCode).toBe('FOUNDATION_2');
  });

  it('serializes UUID replay and rejects reuse for a different session', async () => {
    const { agent, sessionId } = await completedSession();
    const clientAssessmentId = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId }).expect(201),
    ));
    expect(new Set(results.map((response) => response.body.id)).size).toBe(1);
    for (const result of results) expect(result.body).toEqual(results[0]!.body);
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId: randomUUID(), clientAssessmentId }).expect(409);
    const replay = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: clientAssessmentId.toUpperCase() }).expect(201);
    expect(replay.body).toEqual(results[0]!.body);
  });

  it('rejects learner scores, malformed UUIDs, foreign sessions and incomplete sessions', async () => {
    const { agent, sessionId } = await completedSession();
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID(), scores: { speaking: 1 } }).expect(400);
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: 'not-a-uuid' }).expect(400);
    const other = await registerLearner(context.app, { displayName: 'Other Learner', email: 'other-progression@example.test' });
    await other.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(404);
    const planned = await agent.post('/api/v1/learning-sessions').send({ clientSessionId: randomUUID() }).expect(201);
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId: planned.body.id, clientAssessmentId: randomUUID() }).expect(409);
    const own = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    await other.post(`/api/v1/me/checkpoint-assessments/${own.body.id}/confirm`).expect(404);
    const summary = await other.get('/api/v1/me/progression').expect(200);
    expect(summary.body.latestAssessment).toBeNull();
  });

  it('retains the immutable pending snapshot after server evaluation and reassesses with a new UUID', async () => {
    const { agent, sessionId, plan, learnerId } = await completedSession();
    const clientAssessmentId = randomUUID();
    const pending = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId }).expect(201);
    const submitted = await context.database.activityAttempt.findMany({ where: { sessionId, evaluationStatus: 'SUBMITTED' }, include: { activity: true } });
    for (const attempt of submitted) {
      await context.database.activityAttempt.update({ where: { id: attempt.id }, data: { evaluationStatus: 'EVALUATED', score: 0.9 } });
      await context.app.get(MasteryService).recordAttemptEvaluation({
        attemptId: attempt.id, learnerId, lessonVersionId: plan.lessonVersionId, skills: attempt.activity.skills,
        languageBlockSlugs: attempt.activity.languageBlockReferences, score: 0.9, evaluationStatus: 'EVALUATED',
      });
    }
    const replay = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId }).expect(201);
    expect(replay.body).toEqual(pending.body);
    const assessed = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(assessed.body.status).toBe('passed');
    await agent.post(`/api/v1/me/checkpoint-assessments/${pending.body.id}/confirm`).expect(409);
    await expect(context.database.checkpointAssessment.update({ where: { id: pending.body.id }, data: { status: 'passed' } })).rejects.toThrow('append-only');
    await expect(context.database.checkpointAssessment.delete({ where: { id: pending.body.id } })).rejects.toThrow('append-only');
  });

  it('reports an actionable not_ready result for incomplete published missions', async () => {
    const { agent, sessionId } = await evaluatedSession();
    const level = await context.database.level.findUniqueOrThrow({ where: { code: 'FOUNDATION_1' } });
    const mission = await context.database.mission.create({ data: {
      levelId: level.id, slug: `incomplete-${randomUUID()}`, title: 'Additional workplace mission', objective: 'Complete this mission', order: 10, status: 'PUBLISHED',
    } });
    createdMissionIds.push(mission.id);
    const lesson = await context.database.lesson.findFirstOrThrow({ where: { currentPublishedVersionId: { not: null } } });
    await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: lesson.id, order: 0 } });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'not_ready', canAdvance: false });
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body.reasons).toContain('incomplete_missions');
    await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).expect(409);
  });

  it('advances once under concurrent confirmation and rejects a stale competing assessment', async () => {
    const { agent, sessionId } = await evaluatedSession();
    await nextLevel('FOUNDATION_2', 1);
    await nextLevel('FOUNDATION_3', 2);
    const firstKey = randomUUID();
    const first = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: firstKey }).expect(201);
    const second = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(first.body).toMatchObject({ status: 'passed', nextLevelCode: 'FOUNDATION_2', canAdvance: true });
    const confirmations = await Promise.all(Array.from({ length: 4 }, () => agent.post(`/api/v1/me/checkpoint-assessments/${first.body.id}/confirm`).expect(200)));
    for (const response of confirmations) expect(response.body.currentLevelCode).toBe('FOUNDATION_2');
    await agent.post(`/api/v1/me/checkpoint-assessments/${second.body.id}/confirm`).expect(409);
    const replay = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: firstKey }).expect(201);
    expect(replay.body).toEqual(first.body);
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(409);
    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body.currentLevelCode).toBe('FOUNDATION_2');
  });

  it('never skips an immediate next level that has no published content', async () => {
    const { agent, sessionId } = await evaluatedSession();
    await nextLevel('FOUNDATION_2', 1, false);
    await nextLevel('FOUNDATION_3', 2);
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'passed', nextLevelCode: null, canAdvance: false });
    const summary = await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).expect(200);
    expect(summary.body.currentLevelCode).toBe('FOUNDATION_1');
  });

  it('rejects confirmation after next-level content is withdrawn', async () => {
    const { agent, sessionId } = await evaluatedSession();
    const level = await nextLevel('FOUNDATION_2', 1);
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    await context.database.mission.updateMany({ where: { levelId: level.id }, data: { status: 'ARCHIVED' } });
    await agent.post(`/api/v1/me/checkpoint-assessments/${response.body.id}/confirm`).expect(409);
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body.currentLevelCode).toBe('FOUNDATION_1');
  });

  it('does not make an invalid completed plan assessable', async () => {
    const { agent, sessionId } = await completedSession();
    await context.database.learningSession.update({ where: { id: sessionId }, data: { planSnapshot: { blocks: [] } } });
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body).toMatchObject({ canAssess: false, eligibleSessionId: null });
    await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(409);
  });

  it('keeps known weak reinforcement while other skills await evaluation', async () => {
    const { agent, sessionId } = await completedSession();
    const reading = await context.database.activity.findFirstOrThrow({ where: { activityType: 'reading', learningBlock: 'readDecode' } });
    await context.database.activityAttempt.create({ data: {
      learnerId: (await context.database.learningSession.findUniqueOrThrow({ where: { id: sessionId } })).learnerId,
      sessionId, activityId: reading.id, clientAttemptId: randomUUID(), evaluationStatus: 'EVALUATED', score: 0,
      rawResponse: {}, createdAt: new Date('2020-01-01T00:00:00Z'),
    } });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body.status).toBe('pending_evaluation');
    expect(response.body.skills.reading.score).toBeLessThan(0.7);
    expect(response.body.reinforcement).toEqual(expect.arrayContaining([expect.objectContaining({ skill: 'reading', reason: 'below_threshold' })]));
  });

  it('finds a valid completed session when the newest completed plan is invalid', async () => {
    const { agent, sessionId } = await completedSession();
    const source = await context.database.learningSession.findUniqueOrThrow({ where: { id: sessionId } });
    await context.database.learningSession.create({ data: {
      learnerId: source.learnerId, clientSessionId: randomUUID(), missionId: source.missionId,
      lessonVersionId: source.lessonVersionId, durationMinutes: source.durationMinutes,
      status: 'COMPLETED', completedAt: new Date('2099-01-01T00:00:00Z'), planSnapshot: { blocks: [] },
    } });
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body).toMatchObject({ canAssess: true, eligibleSessionId: sessionId });
  });

  it('reports unavailable curriculum honestly when a published mission has no published lesson', async () => {
    const { agent, sessionId } = await evaluatedSession();
    const level = await context.database.level.findUniqueOrThrow({ where: { code: 'FOUNDATION_1' } });
    const mission = await context.database.mission.create({ data: {
      levelId: level.id, slug: `unready-${randomUUID()}`, title: 'Unready curriculum', objective: 'Await publication', order: 20, status: 'PUBLISHED',
    } });
    createdMissionIds.push(mission.id);
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'not_ready', canAdvance: false });
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body.reasons).toContain('curriculum_unavailable');
  });

  it('does not lock progression on mastery required only by an unreachable later published lesson', async () => {
    const { agent, sessionId, plan } = await evaluatedSession();
    const source = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: plan.lessonVersionId } });
    const snapshot = lessonSnapshotSchema.parse(source.parsedContent);
    const bank = snapshot.wordBanks[0]!;
    const sourceBlock = bank.languageBlocks[0]!;
    const { id: _id, ...fields } = sourceBlock;
    const block = await context.database.languageBlock.create({ data: { ...fields, slug: `later-block-${randomUUID()}`, wordBankId: bank.id } });
    const later = await publishedLesson({
      ...snapshot,
      wordBanks: [{ ...bank, languageBlocks: [{ ...sourceBlock, id: block.id, slug: block.slug }] }],
      activities: snapshot.activities.map((activity) => ({ ...activity, languageBlockReferences: [block.slug] })),
    });
    const missionId = plan.missionId;
    await context.database.missionLesson.create({ data: { missionId, lessonId: later.id, order: 10 } });
    extraLessonLinks.push({ missionId, lessonId: later.id });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'passed', canAdvance: false });
    expect(response.body.reinforcement).toEqual([]);
  });

  it('does not unlock a next mission through a later lesson when its selected first lesson lacks four skills', async () => {
    const { agent, sessionId, plan } = await evaluatedSession();
    const source = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: plan.lessonVersionId } });
    const snapshot = lessonSnapshotSchema.parse(source.parsedContent);
    const level = await nextLevel('FOUNDATION_2', 1, false);
    const mission = await context.database.mission.create({ data: {
      levelId: level.id, slug: `unplayable-${randomUUID()}`, title: 'Selected lesson lacks skills', objective: 'Await playable content', order: 0, status: 'PUBLISHED',
    } });
    createdMissionIds.push(mission.id);
    const first = await publishedLesson({ ...snapshot, activities: snapshot.activities.filter((activity) => activity.activityType === 'reading') });
    const later = await publishedLesson(snapshot);
    await context.database.missionLesson.createMany({ data: [
      { missionId: mission.id, lessonId: first.id, order: 0 }, { missionId: mission.id, lessonId: later.id, order: 1 },
    ] });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'passed', nextLevelCode: null, canAdvance: false });
  });

  it('does not unlock four-skill content that cannot form any canonical session', async () => {
    const { agent, sessionId, plan } = await evaluatedSession();
    const source = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: plan.lessonVersionId } });
    const snapshot = lessonSnapshotSchema.parse(source.parsedContent);
    const level = await nextLevel('FOUNDATION_2', 1, false);
    const mission = await context.database.mission.create({ data: {
      levelId: level.id, slug: `bad-layout-${randomUUID()}`, title: 'Four skills without a playable plan',
      objective: 'Await properly allocated activities', order: 0, status: 'PUBLISHED',
    } });
    createdMissionIds.push(mission.id);
    const lesson = await publishedLesson({
      ...snapshot, activities: snapshot.activities.map((activity) => ({ ...activity, learningBlock: 'activate' })),
    });
    await context.database.missionLesson.create({ data: { missionId: mission.id, lessonId: lesson.id, order: 0 } });
    const playable = await context.database.mission.create({ data: {
      levelId: level.id, slug: `valid-layout-${randomUUID()}`, title: 'Later playable mission',
      objective: 'A valid later mission must not hide an unplayable required mission', order: 1, status: 'PUBLISHED',
    } });
    createdMissionIds.push(playable.id);
    const originalLink = await context.database.missionLesson.findFirstOrThrow({ where: { missionId: plan.missionId } });
    await context.database.missionLesson.create({ data: { missionId: playable.id, lessonId: originalLink.lessonId, order: 0 } });
    const response = await agent.post('/api/v1/me/checkpoint-assessments')
      .send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'passed', nextLevelCode: null, canAdvance: false });
  });

  it('blocks a stale pass when a new published current-level mission is still incomplete', async () => {
    const { agent, sessionId, plan } = await evaluatedSession();
    await nextLevel('FOUNDATION_2', 1);
    const passed = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(passed.body.status).toBe('passed');
    const source = await context.database.mission.findUniqueOrThrow({ where: { id: plan.missionId }, include: { lessons: true } });
    const added = await context.database.mission.create({ data: {
      levelId: source.levelId, slug: `added-after-pass-${randomUUID()}`, title: 'New required mission', objective: 'Complete new curriculum', order: 20, status: 'PUBLISHED',
    } });
    createdMissionIds.push(added.id);
    await context.database.missionLesson.create({ data: { missionId: added.id, lessonId: source.lessons[0]!.lessonId, order: 0 } });
    await agent.post(`/api/v1/me/checkpoint-assessments/${passed.body.id}/confirm`).expect(409);
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body).toMatchObject({ currentLevelCode: 'FOUNDATION_1', latestAssessment: { status: 'passed' } });
  });

  it('blocks a stale pass when the selected curriculum gains an unscored required Language Block', async () => {
    const { agent, sessionId, plan } = await evaluatedSession();
    await nextLevel('FOUNDATION_2', 1);
    const passed = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    const original = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: plan.lessonVersionId } });
    const snapshot = lessonSnapshotSchema.parse(original.parsedContent);
    const bank = snapshot.wordBanks[0]!;
    const sourceBlock = bank.languageBlocks[0]!;
    const { id: _id, ...fields } = sourceBlock;
    const block = await context.database.languageBlock.create({ data: { ...fields, slug: `new-required-${randomUUID()}`, wordBankId: bank.id } });
    const selected = await publishedLesson({
      ...snapshot, wordBanks: [{ ...bank, languageBlocks: [{ ...sourceBlock, id: block.id, slug: block.slug }] }],
      activities: snapshot.activities.map((activity) => ({ ...activity, languageBlockReferences: [block.slug] })),
    });
    const originalLink = await context.database.missionLesson.findFirstOrThrow({ where: { missionId: plan.missionId }, orderBy: { order: 'asc' } });
    shiftedLessonLinks.push({ missionId: originalLink.missionId, lessonId: originalLink.lessonId, order: originalLink.order });
    await context.database.missionLesson.update({ where: { missionId_lessonId: { missionId: originalLink.missionId, lessonId: originalLink.lessonId } }, data: { order: 10 } });
    await context.database.missionLesson.create({ data: { missionId: plan.missionId, lessonId: selected.id, order: 0 } });
    extraLessonLinks.push({ missionId: plan.missionId, lessonId: selected.id });
    await agent.post(`/api/v1/me/checkpoint-assessments/${passed.body.id}/confirm`).expect(409);
    const summary = await agent.get('/api/v1/me/progression').expect(200);
    expect(summary.body.currentLevelCode).toBe('FOUNDATION_1');
    expect(summary.body.latestAssessment).toEqual(passed.body);
  });

  it('blocks a stale pass when evaluated required mastery falls below the threshold', async () => {
    const { agent, sessionId, learnerId } = await evaluatedSession();
    await nextLevel('FOUNDATION_2', 1);
    const passed = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    await context.database.masteryRecord.updateMany({ where: { learnerId, skill: 'reading' }, data: { score: 0.6 } });
    await agent.post(`/api/v1/me/checkpoint-assessments/${passed.body.id}/confirm`).expect(409);
  });

  it('scores the original frozen lesson after a newer version is published', async () => {
    const { agent, sessionId, plan } = await completedSession();
    const original = await context.database.lessonVersion.findUniqueOrThrow({ where: { id: plan.lessonVersionId }, include: { wordBanks: true } });
    const snapshot = lessonSnapshotSchema.parse(original.parsedContent);
    const changed = {
      ...snapshot, title: 'New published lesson',
      contentBlocks: snapshot.contentBlocks.map((block) => ({ ...block, id: randomUUID() })),
      activities: snapshot.activities.map((activity) => ({ ...activity, id: randomUUID() })),
    };
    const next = await context.database.lessonVersion.create({ data: {
      lessonId: original.lessonId, version: original.version + 1, title: changed.title,
      sourceHash: randomUUID(), parsedContent: changed as Prisma.InputJsonValue,
    } });
    await context.database.contentBlock.createMany({ data: changed.contentBlocks.map((block, order) => ({
      id: block.id, slug: block.slug, type: block.type, text: block.text, order, lessonVersionId: next.id,
      metadata: block.audio ? { audio: block.audio } : {},
    })) });
    await context.database.activity.createMany({ data: changed.activities.map((activity) => ({ ...activity, lessonVersionId: next.id })) });
    await context.database.lessonVersionWordBank.createMany({ data: original.wordBanks.map((bank) => ({
      lessonVersionId: next.id, wordBankId: bank.wordBankId, wordBankVersionId: bank.wordBankVersionId,
    })) });
    await context.database.lessonVersion.update({ where: { id: original.id }, data: { status: 'ARCHIVED' } });
    await context.database.lessonVersion.update({ where: { id: next.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    await context.database.lesson.update({ where: { id: original.lessonId }, data: { currentPublishedVersionId: next.id } });
    const response = await agent.post('/api/v1/me/checkpoint-assessments').send({ sessionId, clientAssessmentId: randomUUID() }).expect(201);
    expect(response.body).toMatchObject({ status: 'pending_evaluation', skills: { reading: { score: 1 }, speaking: { score: null } } });
    const saved = await context.database.checkpointAssessment.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(saved.lessonVersionId).toBe(original.id);
    expect(saved.evidenceSnapshot).toMatchObject({ plan: { lessonVersionId: original.id } });
  });
});
