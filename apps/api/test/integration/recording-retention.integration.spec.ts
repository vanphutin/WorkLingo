import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { RetentionCleanupHandler } from '../../src/media/application/retention-cleanup.handler.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('recording and draft retention', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('recording_retention');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('deletes due terminal audio and expired drafts without touching queued audio', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Retention Learner', email: 'retention@example.test',
    });
    const created = await learner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const session = await context.database.learningSession.findUniqueOrThrow({ where: { id: created.body.id } });
    const activityIds = (created.body.plan.blocks as Array<{ activityIds: string[] }>)
      .flatMap((block) => block.activityIds);
    const activities = await context.database.activity.findMany({ where: { id: { in: activityIds } } });
    const speaking = activities.find((activity) => activity.activityType === 'speaking');
    const writing = activities.find((activity) => activity.activityType === 'writing');
    if (!speaking || !writing) throw new Error('Foundation fixture needs speaking and writing');
    const storage = context.app.get(ObjectStorage);
    const dueObject = await storage.put({ body: Buffer.from('due'), contentType: 'audio/wav', prefix: 'recordings' });
    const queuedObject = await storage.put({ body: Buffer.from('queued'), contentType: 'audio/wav', prefix: 'recordings' });
    const dueAttempt = await context.database.activityAttempt.create({ data: {
      activityId: speaking.id, clientAttemptId: randomUUID(), evaluationStatus: 'EVALUATED',
      learnerId: session.learnerId, rawResponse: { kind: 'recording' }, sessionId: session.id, score: 0.8,
    } });
    const queuedAttempt = await context.database.activityAttempt.create({ data: {
      activityId: speaking.id, clientAttemptId: randomUUID(), evaluationStatus: 'QUEUED',
      learnerId: session.learnerId, rawResponse: { kind: 'recording' }, sessionId: session.id,
    } });
    const consent = {
      activityId: speaking.id, byteSize: 3, checksum: randomUUID(), consentAcceptedAt: new Date(),
      consentPolicyVersion: 'recording-v1', consentScope: 'teacher-ai', learnerId: session.learnerId,
      mimeType: 'audio/wav', retentionUntil: new Date('2026-10-07T00:00:00Z'), sessionId: session.id,
    };
    const dueRecording = await context.database.recording.create({ data: {
      ...consent, attemptId: dueAttempt.id, storageKey: dueObject.key,
    } });
    const queuedRecording = await context.database.recording.create({ data: {
      ...consent, attemptId: queuedAttempt.id, storageKey: queuedObject.key,
    } });
    await context.database.activityDraft.create({ data: {
      activityId: writing.id, expiresAt: new Date('2026-10-07T00:00:00Z'),
      learnerId: session.learnerId, sessionId: session.id, text: 'expired',
    } });

    const result = await context.app.get(RetentionCleanupHandler).handle({
      attemptNumber: 1, id: 'cleanup', maxAttempts: 3,
      payload: { now: '2026-10-08T00:00:00.000Z' }, type: 'RETENTION_CLEANUP',
    });

    expect(result).toEqual({ deletedDrafts: 1, deletedRecordings: 1 });
    await expect(context.database.recording.findUniqueOrThrow({ where: { id: dueRecording.id } }))
      .resolves.toMatchObject({ deletedAt: new Date('2026-10-08T00:00:00.000Z') });
    await expect(context.database.recording.findUniqueOrThrow({ where: { id: queuedRecording.id } }))
      .resolves.toMatchObject({ deletedAt: null });
    await expect(storage.read(dueObject.key)).rejects.toThrow();
    await expect(storage.read(queuedObject.key)).resolves.toEqual(Buffer.from('queued'));
  });
});
