import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('IELTS introduction V3', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => {
    context = await createLearningSessionTestContext('ielts_intro_v3');
    context.app.get(ConfigService).set('ieltsFlow', 'v3');
    await context.database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'BETA' } });
  }, 60_000);
  afterAll(async () => context?.close());

  it('reads without progress writes, freely revisits and preserves owned versions and media', async () => {
    const learner = await registerPendingLearner(context.app, { displayName: 'New IELTS learner', email: `${randomUUID()}@test.local` });
    await learner.agent.post('/api/v1/me/onboarding/self-placement').send({ clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' }).expect(200);
    const foreign = await registerPendingLearner(context.app, { displayName: 'Other learner', email: `${randomUUID()}@test.local` });
    await foreign.agent.post('/api/v1/me/onboarding/self-placement').send({ clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' }).expect(200);
    const orientation = await context.database.ieltsOrientation.create({ data: { slug: 'ielts-orientation', status: 'PUBLISHED', draftContent: {} } });
    const mediaBytes = Buffer.from('authored-image-bytes');
    const stored = await context.app.get(ObjectStorage).put({ body: mediaBytes, contentType: 'image/png', prefix: 'orientation' });
    const media = await context.database.orientationMediaAsset.create({ data: { orientationId: orientation.id, kind: 'IMAGE', fileName: 'format.png', mimeType: 'image/png', byteSize: mediaBytes.length, checksum: 'fixture-checksum', storageKey: stored.key, createdById: learner.user.id } });
    const content = { title: 'Introduction to IELTS', description: 'Explore the format at your own pace.', slides: Array.from({ length: 3 }, (_, index) => ({ id: randomUUID(), slug: `intro-${index}`, title: `Slide ${index + 1}`, body: `Introduction content ${index + 1}`, transcript: 'Four skills for communication.', imageAssetId: index === 0 ? media.id : null, audioAssetId: null, question: index === 1 ? { slug: 'four-skills', prompt: 'How many skills?', options: ['Two', 'Four'], answerIndex: 1, explanation: 'Four skills are assessed.' } : null })) };
    const version = await context.database.ieltsOrientationVersion.create({ data: { orientationId: orientation.id, version: 1, title: content.title, sourceHash: randomUUID(), content } });
    await context.database.ieltsOrientation.update({ where: { id: orientation.id }, data: { currentPublishedVersionId: version.id } });
    const originalProfile = await context.database.learnerProfile.findUniqueOrThrow({ where: { userId: learner.user.id } });
    const read = await learner.agent.get('/api/v1/me/ielts-introduction').expect(200);
    expect(read.body.presentation.slides).toHaveLength(3);
    expect(read.body.presentation.slides[1].question).not.toHaveProperty('answerIndex');
    expect(read.body.visit).toBeNull();
    await learner.agent.get(`/api/v1/me/ielts-introduction/media/${media.id}?versionId=${version.id}`).expect(200);
    await learner.agent.get(`/api/v1/me/ielts-introduction/media/${randomUUID()}?versionId=${version.id}`).expect(404);
    expect(await context.database.ieltsIntroductionVisit.count()).toBe(0);
    for (const [step, index] of [2, 0, 1].entries()) {
      await learner.agent.put('/api/v1/me/ielts-introduction/visit').send({ orientationVersionId: version.id, slideIndex: index, expectedRevision: step }).expect(200);
    }
    const review = await learner.agent.get('/api/v1/me/ielts-introduction').expect(200);
    expect(review.body.visit.viewedAllAt).toEqual(expect.any(String));
    expect(review.body.presentation.slides).toHaveLength(3);
    await learner.agent.put('/api/v1/me/ielts-introduction/visit').send({ orientationVersionId: version.id, slideIndex: 0, expectedRevision: 3 }).expect(200);
    await learner.agent.put('/api/v1/me/ielts-introduction/visit').send({ orientationVersionId: version.id, slideIndex: 1, expectedRevision: 3 }).expect(409);
    const replacement = await context.database.ieltsOrientationVersion.create({ data: { orientationId: orientation.id, version: 2, title: 'New edition', sourceHash: randomUUID(), content: { ...content, title: 'New edition' } } });
    await context.database.ieltsOrientation.update({ where: { id: orientation.id }, data: { currentPublishedVersionId: replacement.id } });
    await context.database.ieltsOrientationVersion.update({ where: { id: version.id }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
    expect((await learner.agent.get('/api/v1/me/ielts-introduction').expect(200)).body.presentation.id).toBe(version.id);
    expect((await learner.agent.get(`/api/v1/me/ielts-introduction?versionId=${replacement.id}`).expect(200)).body.presentation.id).toBe(replacement.id);
    await foreign.agent.get(`/api/v1/me/ielts-introduction?versionId=${version.id}`).expect(404);
    await foreign.agent.get(`/api/v1/me/ielts-introduction/media/${randomUUID()}?versionId=${version.id}`).expect(404);
    expect(await context.database.orientationProgress.count()).toBe(0);
    expect(await context.database.masteryRecord.count()).toBe(0);
    expect(await context.database.learnerProfile.findUnique({ where: { userId: learner.user.id } })).toEqual(originalProfile);
    context.app.get(ConfigService).set('ieltsFlow', 'legacy');
    await learner.agent.get('/api/v1/me/ielts-introduction').expect(200);
    await foreign.agent.get('/api/v1/me/ielts-introduction').expect(409);
  });
});
