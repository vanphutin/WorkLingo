import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { JobRunnerService } from '../../src/jobs/application/job-runner.service.js';
import { PlacementRecommendationService } from '../../src/onboarding/application/placement-recommendation.service.js';
import { seedPlacementCurriculum } from '../../src/curriculum/infrastructure/seed-placement.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import {
  createLearningSessionTestContext,
  registerLearner,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

const clearShadowingWav = (): Buffer => {
  const sampleRate = 16_000;
  const dataSize = sampleRate * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  buffer.write('worklingo-fixture:clear-shadowing', 44, 'utf8');
  return buffer;
};

describe('placement evidence isolation', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('placement_isolation');
    await seedPlacementCurriculum(context.database, context.app.get(ObjectStorage));
  }, 45_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('completes and recommends from all four placement skills without learning side effects', async () => {
    const { agent, user } = await registerPendingLearner(context.app, {
      displayName: 'Isolated placement learner', email: 'placement-isolation@example.test',
    });
    const placement = await agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(201);
    const session = await agent.get(`/api/v1/learning-sessions/${placement.body.learningSessionId}`).expect(200);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const runner = context.app.get(JobRunnerService);

    for (const activityId of session.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds)) {
      const activity = await context.database.activity.findUniqueOrThrow({ where: { id: activityId } });
      const payload = activity.payload as { questions?: Array<{ answerIndex: number }>; sampleAnswer?: string };
      if (activity.activityType === 'speaking') {
        await agent.post(`/api/v1/activities/${activity.id}/recordings`)
          .field('sessionId', session.body.id)
          .field('clientAttemptId', randomUUID())
          .field('consentAccepted', 'true')
          .field('consentPolicyVersion', 'recording-v1')
          .field('consentScope', 'teacher-ai')
          .attach('audio', clearShadowingWav(), { filename: 'voice.wav', contentType: 'audio/wav' })
          .expect(202);
        await expect(runner.runOnce()).resolves.toBe(true);
        await expect(runner.runOnce()).resolves.toBe(true);
        continue;
      }
      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: payload.questions?.map((question) => question.answerIndex) }
        : { text: payload.sampleAnswer };
      await agent.post(`/api/v1/activities/${activity.id}/attempts`).send({
        clientAttemptId: randomUUID(), response, sessionId: session.body.id,
      }).expect(201);
      if (activity.activityType === 'writing') await expect(runner.runOnce()).resolves.toBe(true);
    }

    const recommendation = await context.app.get(PlacementRecommendationService)
      .refresh(user.id, placement.body.id);
    expect(recommendation).toMatchObject({
      recommendedLevelCode: 'FOUNDATION_1', status: 'RECOMMENDED',
    });
    await expect(context.database.masteryEvent.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.masteryRecord.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.errorBankEntry.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.checkpointAssessment.count({ where: { learnerId: user.id } })).resolves.toBe(0);

    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body).toMatchObject({
      activityAttempts: 0,
      completedActivities: 0,
      sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 },
    });
    const progression = await agent.get('/api/v1/me/progression').expect(409);
    expect(progression.body.code).toBe('ONBOARDING_REQUIRED');
    const mastery = await agent.get('/api/v1/me/mastery-map').expect(409);
    expect(mastery.body.code).toBe('ONBOARDING_REQUIRED');
  });

  it('preserves ordinary learning evidence and progress side effects', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Learning evidence learner', email: 'learning-evidence@example.test',
    });
    const learner = await context.database.user.findUniqueOrThrow({
      where: { email: 'learning-evidence@example.test' },
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 45,
    }).expect(201);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const readingId = session.body.plan.blocks[0].activityIds[0] as string;
    await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId: randomUUID(), response: { answerIndexes: [2, 2, 2] }, sessionId: session.body.id,
    }).expect(201);

    expect(await context.database.masteryEvent.count({ where: { learnerId: learner.id } })).toBeGreaterThan(0);
    expect(await context.database.errorBankEntry.count({ where: { learnerId: learner.id } })).toBeGreaterThan(0);
    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body.activityAttempts).toBeGreaterThan(0);
    expect(progress.body.sessions.inProgress).toBe(1);
  });
});
