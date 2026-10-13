import { randomUUID } from 'node:crypto';

import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import {
  createLearningSessionTestContext,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const slide = (id: string, slug: string) => ({
  id,
  slug,
  title: slug.replaceAll('-', ' '),
  body: `Understand ${slug.replaceAll('-', ' ')} before practice.`,
  transcript: `This slide explains ${slug.replaceAll('-', ' ')}.`,
  imageAssetId: null,
  audioAssetId: null,
  question: null,
});

const content = {
  title: 'IELTS Orientation',
  description: 'A concise guided introduction to IELTS.',
  slides: [
    slide('11111111-1111-4111-8111-111111111111', 'welcome-to-ielts'),
    slide('22222222-2222-4222-8222-222222222222', 'four-skills'),
    { ...slide('33333333-3333-4333-8333-333333333333', 'knowledge-check'), question: {
      slug: 'four-skills-check', prompt: 'What does IELTS assess?',
      options: ['Reading only', 'Four language skills'], answerIndex: 1,
      explanation: 'IELTS assesses Listening, Reading, Writing and Speaking.',
    } },
  ],
};

describe('IELTS orientation Admin API', () => {
  let context: LearningSessionTestContext;
  let admin: ReturnType<typeof request.agent>;
  let learner: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('orientation_admin');
    const email = `orientation-admin-${randomUUID()}@test.local`;
    const password = 'AdminSecret123!';
    await seedContentAdmin(context.database, { displayName: 'Orientation Admin', email, password });
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email, password }).expect(200);
    learner = (await registerPendingLearner(context.app, {
      displayName: 'Learner', email: `orientation-learner-${randomUUID()}@test.local`,
    })).agent;
  }, 60_000);

  afterAll(async () => context?.close());

  it('updates, validates, publishes idempotently, and archives immutable versions', async () => {
    await context.database.ieltsOrientation.create({
      data: { slug: 'ielts-orientation', draftContent: content },
    });

    await learner.get('/api/v1/admin/ielts-orientation').expect(403);
    const initial = await admin.get('/api/v1/admin/ielts-orientation').expect(200);
    expect(initial.body).toMatchObject({ draftRevision: 1, status: 'DRAFT', versions: [] });

    const imageBytes = Buffer.from('phase-four-image');
    const uploaded = await admin.post('/api/v1/admin/ielts-orientation/media')
      .field('kind', 'IMAGE')
      .attach('file', imageBytes, { contentType: 'image/png', filename: 'orientation.png' })
      .expect(201);
    expect(uploaded.body).toMatchObject({ kind: 'IMAGE', mimeType: 'image/png', byteSize: imageBytes.length });
    const streamed = await admin.get(`/api/v1/admin/ielts-orientation/media/${uploaded.body.id}/content`).expect(200);
    expect(Buffer.from(streamed.body)).toEqual(imageBytes);

    const updated = await admin.put('/api/v1/admin/ielts-orientation/draft')
      .send({ expectedRevision: 1, content: {
        ...content,
        description: 'Updated orientation.',
        slides: content.slides.map((item, index) => index === 0 ? { ...item, imageAssetId: uploaded.body.id } : item),
      } })
      .expect(200);
    expect(updated.body).toMatchObject({ draftRevision: 2, status: 'DRAFT' });

    const validated = await admin.post('/api/v1/admin/ielts-orientation/validate')
      .send({ expectedRevision: 2 }).expect(200);
    expect(validated.body).toEqual({ draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });

    const command = { expectedRevision: 2, idempotencyKey: randomUUID() };
    const published = await admin.post('/api/v1/admin/ielts-orientation/publish').send(command).expect(201);
    const replay = await admin.post('/api/v1/admin/ielts-orientation/publish').send(command).expect(201);
    expect(replay.body).toEqual(published.body);
    expect(await context.database.ieltsOrientationVersion.count()).toBe(1);

    await admin.post('/api/v1/admin/ielts-orientation/archive').expect(200);
    const archived = await admin.get('/api/v1/admin/ielts-orientation').expect(200);
    expect(archived.body).toMatchObject({ status: 'ARCHIVED', currentPublishedVersion: null });
    expect(archived.body.versions[0]).toMatchObject({ status: 'ARCHIVED', version: 1 });
  });
});
