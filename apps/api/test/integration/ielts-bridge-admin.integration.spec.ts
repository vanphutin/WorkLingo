import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import { IELTS_BRIDGE_SEEDS } from '../../src/ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import {
  createLearningSessionTestContext,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('IELTS Bridge Admin API', () => {
  let context: LearningSessionTestContext;
  let admin: ReturnType<typeof request.agent>;
  let learner: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('ielts_bridge_admin');
    const email = `bridge-admin-${randomUUID()}@test.local`;
    const password = 'AdminSecret123!';
    await seedContentAdmin(context.database, { displayName: 'Bridge Admin', email, password });
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email, password }).expect(200);
    learner = (await registerPendingLearner(context.app, {
      displayName: 'Learner', email: `bridge-learner-${randomUUID()}@test.local`,
    })).agent;
  }, 60_000);

  afterAll(async () => context?.close());

  it('creates idempotently, validates, publishes idempotently, and archives a module', async () => {
    await learner.get('/api/v1/admin/ielts-bridge/modules').expect(403);
    const createCommand = { expectedRevision: null, idempotencyKey: randomUUID(), content: IELTS_BRIDGE_SEEDS[0] };
    const created = await admin.post('/api/v1/admin/ielts-bridge/modules').send(createCommand).expect(201);
    const createReplay = await admin.post('/api/v1/admin/ielts-bridge/modules').send(createCommand).expect(201);
    expect(createReplay.body.id).toBe(created.body.id);
    expect(await context.database.ieltsBridgeModule.count()).toBe(1);

    await admin.put(`/api/v1/admin/ielts-bridge/modules/${created.body.id}/draft`)
      .send({ ...createCommand, expectedRevision: 99, idempotencyKey: randomUUID() }).expect(409);

    const validated = await admin.post(`/api/v1/admin/ielts-bridge/modules/${created.body.id}/validate`)
      .send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
    expect(validated.body).toMatchObject({ moduleId: created.body.id, canPublish: true, status: 'VALIDATED' });

    const publishCommand = { expectedRevision: 1, idempotencyKey: randomUUID() };
    const published = await admin.post(`/api/v1/admin/ielts-bridge/modules/${created.body.id}/publish`)
      .send(publishCommand).expect(201);
    const publishReplay = await admin.post(`/api/v1/admin/ielts-bridge/modules/${created.body.id}/publish`)
      .send(publishCommand).expect(201);
    expect(publishReplay.body).toEqual(published.body);
    expect(await context.database.ieltsBridgeModuleVersion.count()).toBe(1);

    await admin.post(`/api/v1/admin/ielts-bridge/modules/${created.body.id}/archive`).expect(200);
    const archived = await admin.get(`/api/v1/admin/ielts-bridge/modules/${created.body.id}`).expect(200);
    expect(archived.body).toMatchObject({ status: 'ARCHIVED', currentPublishedVersion: null });
    expect(archived.body.versions[0]).toMatchObject({ status: 'ARCHIVED', version: 1 });
  });
});
