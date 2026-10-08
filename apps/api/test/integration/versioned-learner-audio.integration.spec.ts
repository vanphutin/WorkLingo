import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import {
  createLearningSessionTestContext,
  registerLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('version-bound learner audio', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('versioned_learner_audio');
  }, 40_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  it('streams the artifact attached to the session version after the lesson current version changes', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Versioned Audio Learner', email: 'versioned-audio@example.test',
    });
    const created = await learner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const session = await context.database.learningSession.findUniqueOrThrow({
      where: { id: created.body.id },
      include: { lessonVersion: true },
    });
    const activityIds = (created.body.plan.blocks as Array<{ activityIds: string[] }>)
      .flatMap((block) => block.activityIds);
    const listening = await context.database.activity.findFirstOrThrow({
      where: { id: { in: activityIds }, activityType: 'listening' },
    });
    const payload = listening.payload as { questions: Array<{ evidence: string }> };
    const audioScriptSlug = payload.questions[0]!.evidence.split(':', 1)[0]!;
    const storage = context.app.get(ObjectStorage);
    const oldObject = await storage.put({
      body: Buffer.from('version-n-audio'), contentType: 'audio/wav', prefix: 'generated-audio',
    });
    const contentImport = await context.database.contentImport.create({
      data: {
        createdById: session.learnerId,
        rawSource: 'versioned audio integration fixture',
        sourceHash: randomUUID(),
        status: 'PUBLISHED',
        updatedById: session.learnerId,
      },
    });
    const oldArtifact = await context.database.audioArtifact.create({
      data: {
        adapterName: 'fake-tts',
        audioScriptSlug,
        byteSize: oldObject.size,
        checksum: randomUUID(),
        contentImportId: contentImport.id,
        mimeType: 'audio/wav',
        scriptHash: randomUUID(),
        status: 'READY',
        storageKey: oldObject.key,
        voiceConfig: {},
      },
    });
    await context.database.lessonVersionAudioArtifact.create({
      data: {
        audioArtifactId: oldArtifact.id,
        audioScriptSlug,
        lessonVersionId: session.lessonVersionId,
      },
    });
    const nextVersion = await context.database.lessonVersion.create({
      data: {
        lessonId: session.lessonVersion.lessonId,
        parsedContent: session.lessonVersion.parsedContent as Prisma.InputJsonValue,
        publishedAt: new Date(),
        sourceHash: randomUUID(),
        status: 'PUBLISHED',
        title: session.lessonVersion.title,
        version: session.lessonVersion.version + 1,
      },
    });
    await context.database.lesson.update({
      where: { id: session.lessonVersion.lessonId },
      data: { currentPublishedVersionId: nextVersion.id },
    });

    const response = await learner.get(
      `/api/v1/learning-sessions/${session.id}/activities/${listening.id}/audio`,
    ).buffer(true).parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    }).expect(200);
    expect(response.body).toEqual(Buffer.from('version-n-audio'));
  });
});
