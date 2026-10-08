import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { JobRunnerService } from '../../src/jobs/application/job-runner.service.js';
import { EvaluationService } from '../../src/teacher-ai/application/evaluation.service.js';
import {
  createLearningSessionTestContext,
  registerLearner,
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

describe('Teacher AI pipeline', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('teacher_ai_pipeline');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('evaluates speaking and writing once while preserving immutable lesson evidence', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Teacher AI Learner', email: 'teacher-ai@example.test',
    });
    const created = await learner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await learner.post(`/api/v1/learning-sessions/${created.body.id}/start`).expect(200);

    const runner = context.app.get(JobRunnerService);
    const evaluations = context.app.get(EvaluationService);
    const activityIds = (created.body.plan.blocks as Array<{ activityIds: string[] }>)
      .flatMap((block) => block.activityIds);
    const evaluatedAttemptIds: string[] = [];

    for (const activityId of activityIds) {
      const activity = await context.database.activity.findUniqueOrThrow({ where: { id: activityId } });
      const payload = activity.payload as {
        questions?: Array<{ answerIndex: number }>;
        sampleAnswer?: string;
      };
      if (activity.activityType === 'speaking') {
        const response = await learner.post(`/api/v1/activities/${activity.id}/recordings`)
          .field('sessionId', created.body.id)
          .field('clientAttemptId', randomUUID())
          .field('consentAccepted', 'true')
          .field('consentPolicyVersion', 'recording-v1')
          .field('consentScope', 'teacher-ai')
          .attach('audio', clearShadowingWav(), { filename: 'voice.wav', contentType: 'audio/wav' })
          .expect(202);
        evaluatedAttemptIds.push(response.body.attemptId as string);
        await expect(runner.runOnce()).resolves.toBe(true);
        await expect(runner.runOnce()).resolves.toBe(true);
        continue;
      }

      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: payload.questions?.map((question) => question.answerIndex) }
        : { text: payload.sampleAnswer ?? 'I will follow up with the customer tomorrow.' };
      const submitted = await learner.post(`/api/v1/activities/${activity.id}/attempts`).send({
        clientAttemptId: randomUUID(), sessionId: created.body.id, response,
      }).expect(201);
      if (activity.activityType === 'writing') {
        expect(submitted.body.evaluationStatus).toBe('queued');
        evaluatedAttemptIds.push(submitted.body.id as string);
        await expect(runner.runOnce()).resolves.toBe(true);
      }
    }

    for (const attemptId of evaluatedAttemptIds) {
      const attempt = await context.database.activityAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      expect(attempt).toMatchObject({ evaluationStatus: 'EVALUATED' });
      expect(attempt.score).toBeGreaterThan(0);
      const before = await context.database.masteryEvent.count({ where: { attemptId } });
      await evaluations.evaluateAttempt(attemptId);
      await expect(context.database.evaluationResult.count({ where: { attemptId } })).resolves.toBe(1);
      await expect(context.database.masteryEvent.count({ where: { attemptId } })).resolves.toBe(before);
    }
  });
});
