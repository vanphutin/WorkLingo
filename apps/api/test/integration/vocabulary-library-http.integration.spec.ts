import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Vocabulary admin HTTP boundary', () => {
  let context: LearningSessionTestContext;
  let admin: Awaited<ReturnType<typeof registerPendingLearner>>;
  let learner: Awaited<ReturnType<typeof registerPendingLearner>>;
  const root = '/api/v1/admin/vocabulary';
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (url.port !== '55439' || !url.pathname.endsWith('_test')) throw new Error('Isolated vocabulary database required');
    context = await createLearningSessionTestContext('vocabulary_http');
    admin = await registerPendingLearner(context.app, { displayName: 'Admin', email: `${randomUUID()}@example.test` });
    learner = await registerPendingLearner(context.app, { displayName: 'Learner', email: `${randomUUID()}@example.test` });
    await context.database.user.update({ where: { id: admin.user.id }, data: { role: 'CONTENT_ADMIN' } });
  }, 90000);
  afterAll(async () => { await context?.close(); });

  it('requires authentication and administrator roles on metadata and content routes', async () => {
    for (const path of ['entries', 'sources', 'batches', 'collections', 'options']) {
      await request(context.app.getHttpServer()).get(`${root}/${path}`).expect(401);
      await learner.agent.get(`${root}/${path}`).expect(403);
      await admin.agent.get(`${root}/${path}`).expect(200);
    }
  });
  it('validates UUIDs, bounded pagination, unknown fields and administrator-only mutations', async () => {
    await admin.agent.get(`${root}/entries?limit=101`).expect(400);
    await admin.agent.get(`${root}/sources?includeAll=true`).expect(400);
    await admin.agent.get(`${root}/entries/not-a-uuid`).expect(400);
    await admin.agent.post(`${root}/sources`).send({ providerName: 'Fixture', title: 'Fixture', sourceUrl: 'https://example.test', rightsStatus: 'APPROVED' }).expect(400);
    for (const path of ['sources', 'documents', 'batches', 'collections', 'assignments', 'legacy-links', `batches/${randomUUID()}/stage`, `batches/${randomUUID()}/review`, `batches/${randomUUID()}/publish`, `batches/${randomUUID()}/rollback`, `versions/${randomUUID()}/publish`, `versions/${randomUUID()}/bindings`]) {
      await learner.agent.post(`${root}/${path}`).send({}).expect(403);
    }
  });
  it('registers metadata while blocked and rejects staging before storing content', async () => {
    const source = await admin.agent.post(`${root}/sources`).send({ providerName: 'Synthetic HTTP', title: 'Fixture', sourceUrl: `https://example.test/${randomUUID()}` }).expect(201);
    expect(source.body.rightsStatus).toBe('PENDING');
    const document = await admin.agent.post(`${root}/documents`).send({ sourceId: source.body.id, cefrLevel: 'A1', originalFilename: 'synthetic.pdf', sha256: 'a'.repeat(64), pageCount: 1 }).expect(201);
    const batch = await admin.agent.post(`${root}/batches`).send({ documentId: document.body.id, parserVersion: 'http/1', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic:1'], exceptions: [] }] } }).expect(201);
    expect(batch.body.status).toBe('BLOCKED_BY_RIGHTS');
    const response = await admin.agent.get(`${root}/batches/${batch.body.id}`).expect(422);
    expect(response.body.code).toBe('BLOCKED_BY_RIGHTS');
    await admin.agent.patch(`${root}/sources/${source.body.id}/rights`).send({ revision: 1, rightsStatus: 'APPROVED', permissionReference: 'authored-synthetic', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'] }).expect(200);
    await admin.agent.patch(`${root}/sources/${source.body.id}/rights`).send({ revision: 1, rightsStatus: 'REVOKED', permissionReference: null, allowedUses: [], allowedFields: [] }).expect(409);
    const detail = await admin.agent.get(`${root}/batches/${batch.body.id}`).expect(200);
    expect(detail.body.reconciliation).toMatchObject({ detected: 1, stored: 0, unresolved: 1 });
  });
});
