import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CurriculumDefinitionInput } from '@worklingo/contracts';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('Foundation Admin HTTP', () => {
  let context: LearningSessionTestContext;
  let admin: ReturnType<typeof request.agent>;
  let learner: ReturnType<typeof request.agent>;
  let sequence = 10;
  beforeAll(async () => {
    context = await createLearningSessionTestContext('foundation_admin');
    const email = `${randomUUID()}@example.test`;
    await seedContentAdmin(context.database, { email, displayName: 'Admin', password: 'local-test-password' });
    admin = request.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email, password: 'local-test-password' }).expect(200);
    learner = (await registerPendingLearner(context.app, { email: `${randomUUID()}@example.test`, displayName: 'Learner' })).agent;
  }, 60_000);
  afterAll(async () => { await context?.close(); });
  const url = (id: string) => `/api/v1/admin/curriculum/missions/${id}/foundation`;

  async function unit() {
    const level = await context.database.level.findUniqueOrThrow({ where: { code: 'FOUNDATION_1' } });
    const version = await context.database.lessonVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' }, include: { activities: true } });
    const activity = version.activities.find((item) => item.activityType === 'reading')!;
    const mission = await context.database.mission.create({ data: {
      levelId: level.id, slug: randomUUID(), title: 'Foundation unit', objective: 'Understand routines', order: sequence++,
      lessons: { create: { lessonId: version.lessonId, order: 1 } },
    } });
    const definition: CurriculumDefinitionInput = {
      category: 'grammar', prerequisiteRevisionIds: [], objectives: [{
        slug: 'understand-routines', statement: 'Understand daily routines', skills: ['reading'], required: true,
        evidence: [{ lessonVersionId: version.id, activitySlug: activity.slug, languageBlockSlugs: [] }],
      }],
    };
    return { id: mission.id, definition, version };
  }
  async function save(id: string, definition: CurriculumDefinitionInput, expectedRevision: number | null = null) {
    return admin.put(url(id)).send({ definition, expectedRevision, idempotencyKey: randomUUID() }).expect(200);
  }
  async function publish(id: string, definition: CurriculumDefinitionInput) {
    const saved = await save(id, definition);
    await admin.post(`${url(id)}/validate`).send({ expectedRevision: saved.body.revision, idempotencyKey: randomUUID() }).expect(200);
    return admin.post(`${url(id)}/publish`).send({ expectedRevision: saved.body.revision, idempotencyKey: randomUUID() }).expect(200);
  }

  it('rejects unauthorized and learner access without writes', async () => {
    const item = await unit();
    await request(context.app.getHttpServer()).get(url(item.id)).expect(401);
    await learner.put(url(item.id)).send({ definition: item.definition, expectedRevision: null, idempotencyKey: randomUUID() }).expect(403);
    expect(await context.database.curriculumDefinition.count({ where: { missionId: item.id } })).toBe(0);
  });
  it('publishes frozen bindings and replays the same command only once', async () => {
    const item = await unit();
    await save(item.id, item.definition);
    await admin.post(`${url(item.id)}/publish`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(409);
    await admin.post(`${url(item.id)}/validate`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(200);
    const command = { expectedRevision: 1, idempotencyKey: randomUUID() };
    const [first, replay] = await Promise.all([
      admin.post(`${url(item.id)}/publish`).send(command), admin.post(`${url(item.id)}/publish`).send(command),
    ]);
    expect([first.status, replay.status]).toEqual([200, 200]);
    expect(first.body).toEqual(replay.body);
    expect(first.body).toMatchObject({ missionId: item.id, revision: 1, status: 'PUBLISHED', category: 'grammar' });
    expect(await context.database.curriculumRevisionLesson.count({ where: { curriculumRevisionId: first.body.id } })).toBe(1);
    const snapshot = await context.database.curriculumRevision.findUniqueOrThrow({ where: { id: first.body.id } });
    await save(item.id, { ...item.definition, category: 'reading' }, 1);
    expect((await context.database.curriculumRevision.findUniqueOrThrow({ where: { id: first.body.id } })).snapshot).toEqual(snapshot.snapshot);
    await admin.post(`${url(item.id)}/publish`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(409);
    await admin.post(`${url(item.id)}/publish`).send({ ...command, expectedRevision: 2 }).expect(409);
  });
  it('rejects stale and nested malformed inputs', async () => {
    const item = await unit();
    await save(item.id, item.definition);
    await admin.put(url(item.id)).send({ definition: item.definition, expectedRevision: null, idempotencyKey: randomUUID() }).expect(409);
    await admin.put(url(item.id)).send({ definition: { ...item.definition, learnerId: randomUUID() }, expectedRevision: 1, idempotencyKey: randomUUID() }).expect(400);
    expect((await context.database.curriculumDefinition.findUniqueOrThrow({ where: { missionId: item.id } })).revision).toBe(1);
  });
  it('rejects evidence outside attached published versions and nonexistent activities', async () => {
    const item = await unit();
    item.definition.objectives[0]!.evidence[0]!.lessonVersionId = randomUUID();
    await save(item.id, item.definition);
    const invalid = await admin.post(`${url(item.id)}/validate`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
    expect(invalid.body.issues[0]).toMatchObject({ code: 'INVALID_EVIDENCE', path: expect.any(String) });
    item.definition.objectives[0]!.evidence[0]!.lessonVersionId = item.version.id;
    item.definition.objectives[0]!.evidence[0]!.activitySlug = 'missing-activity';
    await save(item.id, item.definition, 1);
    await admin.post(`${url(item.id)}/validate`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(422);
  });
  it('blocks archive when a published curriculum depends on the revision', async () => {
    const a = await unit(); const b = await unit();
    const publishedA = await publish(a.id, a.definition);
    b.definition.prerequisiteRevisionIds = [publishedA.body.id];
    const publishedB = await publish(b.id, b.definition);
    const archive = (id: string) => admin.post(`/api/v1/admin/curriculum/foundation-revisions/${id}/archive`).send({ expectedRevision: 1, idempotencyKey: randomUUID() });
    expect((await archive(publishedA.body.id)).status).toBe(422);
    expect((await archive(publishedB.body.id)).status).toBe(200);
    expect((await archive(publishedA.body.id)).status).toBe(200);
    const c = await unit(); c.definition.prerequisiteRevisionIds = [publishedA.body.id];
    await save(c.id, c.definition);
    await admin.post(`${url(c.id)}/validate`).send({ expectedRevision: 1, idempotencyKey: randomUUID() }).expect(422);
  });
  it('serializes competing publications and rejects cyclic mission prerequisites', async () => {
    const a = await unit(); const b = await unit();
    const pa = await publish(a.id, a.definition); const pb = await publish(b.id, b.definition);
    a.definition.prerequisiteRevisionIds = [pb.body.id];
    b.definition.prerequisiteRevisionIds = [pa.body.id];
    await save(a.id, a.definition, 1); await save(b.id, b.definition, 1);
    for (const item of [a, b]) await admin.post(`${url(item.id)}/validate`).send({ expectedRevision: 2, idempotencyKey: randomUUID() }).expect(200);
    const results = await Promise.all([a, b].map((item) => admin.post(`${url(item.id)}/publish`).send({ expectedRevision: 2, idempotencyKey: randomUUID() })));
    expect(results.map((result) => result.status).sort()).toEqual([200, 422]);
    expect(await context.database.curriculumRevision.count({ where: { missionId: { in: [a.id, b.id] }, revision: 2 } })).toBe(1);
  });
});
