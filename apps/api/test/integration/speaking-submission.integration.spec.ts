import { randomUUID } from 'node:crypto';

import type { Activity } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

const oneSecondPcmWav = (): Buffer => {
  const sampleRate = 16_000;
  const dataSize = sampleRate * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  return buffer;
};

describe('speaking recording submission', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('speaking_submission');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  async function createSessionAtSpeaking(agent: Awaited<ReturnType<typeof registerLearner>>) {
    const created = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    await agent.post(`/api/v1/learning-sessions/${created.body.id}/start`).expect(200);
    const activityIds = (created.body.plan.blocks as Array<{ activityIds: string[] }>)
      .flatMap((block) => block.activityIds);

    for (const activityId of activityIds) {
      const activity = await context.database.activity.findUniqueOrThrow({ where: { id: activityId } });
      if (activity.activityType === 'speaking') return { activity, session: created.body };
      const payload = activity.payload as { questions?: Array<{ answerIndex: number }> };
      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: payload.questions?.map((question) => question.answerIndex) }
        : { text: 'My name is Lan. I work in support.' };
      await agent.post(`/api/v1/activities/${activityId}/attempts`).send({
        clientAttemptId: randomUUID(), sessionId: created.body.id, response,
      }).expect(201);
    }
    throw new Error('The fixture does not contain a speaking activity');
  }

  const upload = (
    agent: Awaited<ReturnType<typeof registerLearner>>,
    activity: Activity,
    sessionId: string,
    clientAttemptId: string,
  ) => agent.post(`/api/v1/activities/${activity.id}/recordings`)
    .field('sessionId', sessionId)
    .field('clientAttemptId', clientAttemptId)
    .field('consentAccepted', 'true')
    .field('consentPolicyVersion', 'recording-v1')
    .field('consentScope', 'teacher-ai')
    .attach('audio', oneSecondPcmWav(), { filename: 'voice.wav', contentType: 'audio/wav' });

  it('atomically creates attempt, recording, transcription job, and advances checkpoint', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Speaking Learner', email: 'speaking@example.test',
    });
    const { activity, session } = await createSessionAtSpeaking(learner);
    const before = await context.database.learningSession.findUniqueOrThrow({ where: { id: session.id } });

    const response = await upload(learner, activity, session.id, randomUUID()).expect(202);

    expect(response.body).toMatchObject({ status: 'processing' });
    await expect(context.database.activityAttempt.findUniqueOrThrow({
      where: { id: response.body.attemptId },
    })).resolves.toMatchObject({ evaluationStatus: 'QUEUED', score: null });
    await expect(context.database.recording.findUniqueOrThrow({
      where: { id: response.body.recordingId },
    })).resolves.toMatchObject({ consentPolicyVersion: 'recording-v1', mimeType: 'audio/wav' });
    await expect(context.database.job.findUniqueOrThrow({ where: { id: response.body.jobId } }))
      .resolves.toMatchObject({ type: 'TRANSCRIBE_SPEECH', status: 'PENDING' });
    await expect(context.database.learningSession.findUniqueOrThrow({ where: { id: session.id } }))
      .resolves.toMatchObject({ currentCheckpoint: before.currentCheckpoint + 1 });
  });

  it('enforces ownership, consent, and client-attempt target binding', async () => {
    const owner = await registerLearner(context.app, {
      displayName: 'Recording Owner', email: 'recording-owner@example.test',
    });
    const other = await registerLearner(context.app, {
      displayName: 'Recording Other', email: 'recording-other@example.test',
    });
    const { activity, session } = await createSessionAtSpeaking(owner);

    await upload(other, activity, session.id, randomUUID()).expect(404);
    const noConsent = await other.post(`/api/v1/activities/${activity.id}/recordings`)
      .field('sessionId', session.id)
      .field('clientAttemptId', randomUUID())
      .field('consentAccepted', 'false')
      .field('consentPolicyVersion', 'recording-v1')
      .field('consentScope', 'teacher-ai')
      .attach('audio', oneSecondPcmWav(), { filename: 'voice.wav', contentType: 'audio/wav' })
      .expect(400);
    expect(noConsent.body).toMatchObject({ code: 'RECORDING_CONSENT_REQUIRED' });
  });
});
