import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
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

  it('streams playable WAV audio for the seeded listening activity', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Seed Audio Learner', email: 'seed-audio@example.test',
    });
    const created = await learner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const session = await context.database.learningSession.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    const listening = await context.database.activity.findFirstOrThrow({
      where: { lessonVersionId: session.lessonVersionId, activityType: 'listening' },
    });
    const seededReferences = await context.database.lessonVersionAudioArtifact.findMany({
      include: { audioArtifact: true },
    });
    expect(
      seededReferences.some((reference) =>
        reference.lessonVersionId === session.lessonVersionId &&
        listening.contentReferences.includes(reference.audioScriptSlug) &&
        reference.audioArtifact.status === 'READY'),
      JSON.stringify({
        contentReferences: listening.contentReferences,
        seededReferences,
        sessionLessonVersionId: session.lessonVersionId,
      }),
    ).toBe(true);

    const response = await learner.get(
      `/api/v1/learning-sessions/${session.id}/activities/${listening.id}/audio`,
    ).buffer(true).parse((res, callback) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.headers['content-type']).toContain('audio/wav');
    expect(response.body.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });

  it('streams the artifact attached to the session version after the lesson current version changes', async () => {
    const learner = await registerLearner(context.app, {
      displayName: 'Versioned Audio Learner', email: 'versioned-audio@example.test',
    });
    const actor = await context.database.user.findUniqueOrThrow({
      where: { email: 'versioned-audio@example.test' },
    });
    const lesson = await context.database.lesson.findFirstOrThrow({
      where: { currentPublishedVersionId: { not: null } },
      include: { currentPublishedVersion: true },
    });
    const baseVersion = lesson.currentPublishedVersion!;
    const source = lessonSnapshotSchema.parse(baseVersion.parsedContent);
    const snapshot = {
      ...source,
      activities: source.activities.map((activity) => ({ ...activity, id: randomUUID() })),
      contentBlocks: source.contentBlocks.map((block) => ({ ...block, id: randomUUID() })),
    };
    const version = await context.database.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        parsedContent: snapshot as Prisma.InputJsonValue,
        sourceHash: randomUUID(),
        title: snapshot.title,
        version: baseVersion.version + 1,
      },
    });
    await context.database.contentBlock.createMany({
      data: snapshot.contentBlocks.map((block, order) => ({
        id: block.id,
        lessonVersionId: version.id,
        metadata: block.audio ? { audio: block.audio } : {},
        order,
        slug: block.slug,
        text: block.text,
        type: block.type,
      })),
    });
    await context.database.activity.createMany({
      data: snapshot.activities.map((activity) => ({ ...activity, lessonVersionId: version.id })),
    });
    await context.database.lessonVersionWordBank.createMany({
      data: snapshot.wordBanks.map((bank) => ({
        lessonVersionId: version.id,
        wordBankId: bank.id,
      })),
    });
    const listening = snapshot.activities.find((activity) => activity.activityType === 'listening')!;
    const payload = listening.payload as { questions: Array<{ evidence: string }> };
    const audioScriptSlug = payload.questions[0]!.evidence.split(':', 1)[0]!;
    const storage = context.app.get(ObjectStorage);
    const oldObject = await storage.put({
      body: Buffer.from('version-n-audio'), contentType: 'audio/wav', prefix: 'generated-audio',
    });
    const contentImport = await context.database.contentImport.create({
      data: {
        createdById: actor.id,
        lessonId: lesson.id,
        lessonVersionId: version.id,
        rawSource: 'versioned audio integration fixture',
        sourceHash: randomUUID(),
        status: 'VALIDATED',
        updatedById: actor.id,
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
        lessonVersionId: version.id,
      },
    });
    await context.database.lessonVersion.update({
      where: { id: baseVersion.id },
      data: { status: 'ARCHIVED' },
    });
    await context.database.lessonVersion.update({
      where: { id: version.id },
      data: { publishedAt: new Date(), status: 'PUBLISHED' },
    });
    await context.database.lesson.update({
      where: { id: lesson.id },
      data: { currentPublishedVersionId: version.id },
    });

    const created = await learner.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 60,
    }).expect(201);
    const session = await context.database.learningSession.findUniqueOrThrow({
      where: { id: created.body.id },
      include: { lessonVersion: true },
    });
    expect(session.lessonVersionId).toBe(version.id);

    await context.database.lessonVersion.update({
      where: { id: version.id },
      data: { status: 'ARCHIVED' },
    });
    const nextVersion = await context.database.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        parsedContent: session.lessonVersion.parsedContent as Prisma.InputJsonValue,
        publishedAt: new Date(),
        sourceHash: randomUUID(),
        status: 'PUBLISHED',
        title: session.lessonVersion.title,
        version: session.lessonVersion.version + 1,
      },
    });
    await context.database.lesson.update({
      where: { id: lesson.id },
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
