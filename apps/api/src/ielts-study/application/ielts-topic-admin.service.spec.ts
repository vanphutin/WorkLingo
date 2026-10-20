import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedIeltsTopicCurriculum } from '../../../test/integration/ielts-topic-test-fixture.js';
import { createLearningSessionTestContext, type LearningSessionTestContext } from '../../../test/integration/learning-session-test-harness.js';
import { topicFixture } from '../domain/ielts-topic-validation.fixture.js';
import { IeltsTopicAdminService } from './ielts-topic-admin.service.js';

describe('IELTS topic publishing with actual stored curriculum', () => {
  let context: LearningSessionTestContext;
  beforeAll(async () => { context = await createLearningSessionTestContext('ielts_topic_admin'); }, 60_000);
  afterAll(async () => context?.close());
  it('rejects foreign or missing revisions and serializes publication while retaining old snapshots', async () => {
    const db = context.database;
    const actor = await db.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Content editor', role: 'CONTENT_ADMIN', passwordHash: 'test-only' } });
    const service = context.app.get(IeltsTopicAdminService);
    const fixture = topicFixture();
    const content = { schemaVersion: 1, title: 'Education', description: 'Study education in two contextual situations.', packs: [fixture.pack] };
    const draft = await service.saveDraft(actor.id, null, { expectedRevision: null, idempotencyKey: randomUUID(), content });
    expect((await service.validate(draft.id, { expectedRevision: draft.draftRevision })).issues.map(issue => issue.code)).toContain('IELTS_TOPIC_REVISION_UNAVAILABLE');
    await seedIeltsTopicCurriculum(context, fixture);
    const valid = await service.validate(draft.id, { expectedRevision: draft.draftRevision });
    expect(valid.issues).toEqual([]);
    expect(valid.supportedDurations).toEqual([90, 120, 150]);
    const command = { expectedRevision: draft.draftRevision, idempotencyKey: randomUUID() };
    const [first, retry] = await Promise.all([service.publish(actor.id, draft.id, command), service.publish(actor.id, draft.id, command)]);
    expect(retry).toEqual(first);
    expect(await db.ieltsTopicVersion.count()).toBe(1);
    const old = await db.ieltsTopicVersion.findFirstOrThrow();
    const edited = await service.saveDraft(actor.id, draft.id, { expectedRevision: draft.draftRevision, idempotencyKey: randomUUID(), content: { ...content, description: 'Updated education topic with the same valid curriculum.' } });
    expect(edited.status).toBe('PUBLISHED');
    expect(edited.currentPublishedVersionId).toBe(old.id);
    const published = await Promise.allSettled([service.publish(actor.id, draft.id, { expectedRevision: edited.draftRevision, idempotencyKey: randomUUID() }), service.publish(actor.id, draft.id, { expectedRevision: edited.draftRevision, idempotencyKey: randomUUID() })]);
    expect(published.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.ieltsTopicVersion.findUniqueOrThrow({ where: { id: old.id } })).content).toEqual(old.content);
    expect(await db.ieltsTopicVersion.count({ where: { status: 'PUBLISHED' } })).toBe(1);
  });
});
