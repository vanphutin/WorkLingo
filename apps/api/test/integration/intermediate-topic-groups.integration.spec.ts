import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { defaultTopicPlan } from '@worklingo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/common/database/prisma.service.js';
import { TopicGroupsService } from '../../src/intermediate-topics/topic-groups.service.js';
import { topicSource } from '../../src/intermediate-topics/topic-test.fixture.js';

describe('Intermediate topic groups on PostgreSQL', () => {
  const schemaName = `topic_groups_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL!;
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;
  let service: TopicGroupsService;
  let actor: string;

  beforeAll(async () => {
    const url = new URL(baseUrl); url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    database = new PrismaClient({ datasourceUrl: url.toString() });
    service = new TopicGroupsService(database as PrismaService);
    actor = (await database.user.create({ data: { email: `${randomUUID()}@example.test`, displayName: 'Topic test admin', passwordHash: 'test-only', role: 'CONTENT_ADMIN' } })).id;
  }, 50_000);

  afterAll(async () => {
    await database?.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
  });

  const draft = (lessonId?: string) => database.contentImport.create({ data: {
    rawSource: topicSource, sourceHash: 'group-test-source', draftRevision: 7,
    createdById: actor, updatedById: actor, ...(lessonId ? { lessonId } : {}),
  } });

  it('groups multiple drafts and rejects normalized duplicate names without changing source revisions', async () => {
    const group = await service.create({ name: ' Restaurant  ', description: 'Dining' });
    await expect(service.create({ name: 'restaurant', description: '' })).rejects.toMatchObject({ status: 409 });
    const a = await draft(), b = await draft();
    await service.assign(a.id, { groupId: group.id, expectedRevision: 0 });
    const result = await service.assign(b.id, { groupId: group.id, expectedRevision: 0 });
    expect(result.groups.find(g => g.id === group.id)?.lessonCount).toBe(2);
    expect(await database.contentImport.findMany({ where: { id: { in: [a.id, b.id] } }, select: { draftRevision: true, sourceHash: true } }))
      .toEqual([{ draftRevision: 7, sourceHash: 'group-test-source' }, { draftRevision: 7, sourceHash: 'group-test-source' }]);
    await expect(service.update(group.id, { name: 'Updated', description: '', expectedRevision: 2 })).rejects.toMatchObject({ status: 409 });
  });

  it('serializes concurrent assignments and rejects the stale administrator write', async () => {
    const a = await service.create({ name: 'Travel', description: '' });
    const b = await service.create({ name: 'Meetings', description: '' });
    const source = await draft();
    const results = await Promise.allSettled([
      service.assign(source.id, { groupId: a.id, expectedRevision: 0 }),
      service.assign(source.id, { groupId: b.id, expectedRevision: 0 }),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: { status: 409 } });
    expect(await database.contentImport.findUnique({ where: { id: source.id } })).toMatchObject({ topicGroupRevision: 1, draftRevision: 7 });
  });

  it('detaches every version on deletion and preserves lessons, drafts and human duration approval', async () => {
    const group = await service.create({ name: 'Office', description: '' });
    const lesson = await database.lesson.create({ data: { slug: `topic-group-${randomUUID()}` } });
    const a = await draft(lesson.id), b = await draft(lesson.id);
    const review = await database.intermediateTopicReview.create({ data: { contentImportId: a.id, sourceHash: a.sourceHash,
      draftRevision: a.draftRevision, revision: 4, approvedPlan: defaultTopicPlan(60), approvedAt: new Date(), approvedById: actor } });
    await service.assign(a.id, { groupId: group.id, expectedRevision: 0 });
    expect((await service.catalog()).groups.find(g => g.id === group.id)?.lessonCount).toBe(1);
    await service.remove(group.id, { expectedRevision: group.revision });
    expect(await database.lesson.findUnique({ where: { id: lesson.id } })).toMatchObject({ topicGroupId: null });
    const imports = await database.contentImport.findMany({ where: { id: { in: [a.id, b.id] } } });
    expect(imports).toHaveLength(2);
    expect(imports.every(i => i.topicGroupId === null && i.topicGroupRevision === 2 && i.draftRevision === 7)).toBe(true);
    expect(await database.intermediateTopicReview.findUnique({ where: { contentImportId: a.id } })).toEqual(review);
    await expect(database.lesson.update({ where: { id: lesson.id }, data: { topicGroupId: randomUUID() } })).rejects.toMatchObject({ code: 'P2003' });
  });
});
