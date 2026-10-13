import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

const slide = (id: string, slug: string) => ({
  id, slug, title: slug, body: `${slug} body.`, transcript: `${slug} transcript.`,
  imageAssetId: null, audioAssetId: null, question: null,
});
const content = {
  title: 'IELTS Orientation', description: 'Understand the IELTS pathway.',
  slides: [
    slide('11111111-1111-4111-8111-111111111111', 'welcome'),
    { ...slide('22222222-2222-4222-8222-222222222222', 'knowledge-check'), question: {
      slug: 'skills-check', prompt: 'How many skills?', options: ['Two', 'Four'], answerIndex: 1,
      explanation: 'IELTS assesses four language skills.',
    } },
    slide('33333333-3333-4333-8333-333333333333', 'ready'),
  ],
};
const skills = Object.fromEntries(['reading', 'listening', 'speaking', 'writing'].map((skill) => [
  skill, { score: 1, threshold: 0.8, passed: true, evaluatedCount: 1, pendingCount: 0 },
]));

describe('IELTS orientation learner API', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => { context = await createLearningSessionTestContext('orientation_learner'); }, 60_000);
  afterAll(async () => context?.close());

  it('gates on Foundation evidence, pins a version, persists checks, and completes explicitly', async () => {
    const registration = await registerPendingLearner(context.app, {
      displayName: 'IELTS Learner', email: `ielts-learner-${randomUUID()}@test.local`,
    });
    await registration.agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1',
    }).expect(200);

    const orientation = await context.database.ieltsOrientation.create({ data: {
      slug: 'ielts-orientation', draftContent: content as Prisma.InputJsonValue, status: 'PUBLISHED',
    } });
    const versionOne = await context.database.ieltsOrientationVersion.create({ data: {
      orientationId: orientation.id, version: 1, title: content.title, sourceHash: randomUUID(),
      content: content as Prisma.InputJsonValue,
    } });
    await context.database.ieltsOrientation.update({ where: { id: orientation.id }, data: { currentPublishedVersionId: versionOne.id } });

    const locked = await registration.agent.get('/api/v1/me/ielts-orientation').expect(200);
    expect(locked.body).toMatchObject({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'] });

    const mission = await context.database.mission.findFirstOrThrow({
      where: { purpose: 'LEARNING' }, include: { lessons: { include: { lesson: true } } },
    });
    const lessonVersionId = mission.lessons[0]?.lesson.currentPublishedVersionId;
    if (!lessonVersionId) throw new Error('Foundation seed must publish a lesson version.');
    const session = await context.database.learningSession.create({ data: {
      learnerId: registration.user.id, clientSessionId: randomUUID(), missionId: mission.id,
      lessonVersionId, durationMinutes: 60, planSnapshot: {},
    } });
    await context.database.checkpointAssessment.create({ data: {
      learnerId: registration.user.id, clientAssessmentId: randomUUID(), sessionId: session.id,
      lessonVersionId, levelCode: 'FOUNDATION_6', policyVersion: 'phase-4-test', status: 'passed',
      skills, reinforcement: [], evidenceSnapshot: {}, canAdvance: true, nextLevelCode: 'IELTS_ORIENTATION',
    } });

    await registration.agent.get('/api/v1/me/ielts-orientation').expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ state: 'available', reasons: [], presentation: null, progress: null });
    });
    const started = await registration.agent.post('/api/v1/me/ielts-orientation/start').expect(200);
    expect(started.body).toMatchObject({ state: 'in_progress', presentation: { id: versionOne.id, version: 1 }, progress: { revision: 1, currentSlideIndex: 0 } });
    expect(started.body.presentation.slides[1].question).not.toHaveProperty('answerIndex');
    expect(started.body.presentation.slides[0]).not.toHaveProperty('audioAssetId');

    await registration.agent.put('/api/v1/me/ielts-orientation/progress').send({
      orientationVersionId: versionOne.id, expectedRevision: 1, targetSlideIndex: 1,
    }).expect(200).expect(({ body }) => expect(body.progress).toMatchObject({ revision: 2, currentSlideIndex: 1 }));
    await registration.agent.put('/api/v1/me/ielts-orientation/progress').send({
      orientationVersionId: versionOne.id, expectedRevision: 2, targetSlideIndex: 2,
      answer: { questionSlug: 'skills-check', selectedIndex: 0 },
    }).expect(200).expect(({ body }) => expect(body).toMatchObject({ progress: { revision: 3, currentSlideIndex: 1 }, answerFeedback: { correct: false } }));
    await registration.agent.put('/api/v1/me/ielts-orientation/progress').send({
      orientationVersionId: versionOne.id, expectedRevision: 3, targetSlideIndex: 2,
      answer: { questionSlug: 'skills-check', selectedIndex: 1 },
    }).expect(200).expect(({ body }) => expect(body).toMatchObject({ progress: { revision: 4, currentSlideIndex: 2 }, answerFeedback: { correct: true } }));

    const versionTwo = await context.database.ieltsOrientationVersion.create({ data: {
      orientationId: orientation.id, version: 2, title: 'Changed title', sourceHash: randomUUID(),
      content: { ...content, title: 'Changed title' } as Prisma.InputJsonValue,
    } });
    await context.database.ieltsOrientation.update({ where: { id: orientation.id }, data: { currentPublishedVersionId: versionTwo.id } });
    await registration.agent.get('/api/v1/me/ielts-orientation').expect(200).expect(({ body }) => {
      expect(body.presentation).toMatchObject({ id: versionOne.id, version: 1 });
    });

    await registration.agent.put('/api/v1/me/ielts-orientation/progress').send({
      orientationVersionId: versionOne.id, expectedRevision: 4, targetSlideIndex: 2, complete: true,
    }).expect(200).expect(({ body }) => expect(body.progress.completedAt).toEqual(expect.any(String)));
    await registration.agent.get('/api/v1/me/ielts-orientation').expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ state: 'completed', presentation: { id: versionOne.id }, progress: { revision: 5 } });
    });
  });
});
