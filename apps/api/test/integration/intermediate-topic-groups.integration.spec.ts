import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { defaultTopicPlan } from '@worklingo/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/common/database/prisma.service.js';
import { TopicGroupsService } from '../../src/intermediate-topics/topic-groups.service.js';
import { topicSource } from '../../src/intermediate-topics/topic-test.fixture.js';
import { ContentImportsService } from '../../src/content-authoring/application/content-imports.service.js';
import { seedIntermediateTopicCatalog } from '../../src/intermediate-topics/seed-topic-catalog.js';

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

  it('backfills legacy normalized names into the unique registry using the actual additive migration', async () => {
    // Replay only the group-table DDL and the additive migration in a disposable
    // schema. Both creation and cleanup roll back if any assertion fails.
    const legacySchema = `${schemaName}_legacy`;
    const oldMigration = await readFile(path.resolve('prisma/migrations/20261019100000_intermediate_topic_groups/migration.sql'), 'utf8');
    const catalogMigration = await readFile(path.resolve('prisma/migrations/20261019110000_intermediate_topic_catalog/migration.sql'), 'utf8');
    const legacyId = randomUUID();
    await database.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${legacySchema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${legacySchema}"`);
      await tx.$executeRawUnsafe(`DO $legacy$ BEGIN ${oldMigration.slice(0, oldMigration.indexOf('ALTER TABLE'))} END $legacy$;`);
      await tx.$executeRaw`INSERT INTO "IntermediateTopicGroup" ("id", "name", "normalizedName", "description", "updatedAt")
        VALUES (${legacyId}::uuid, 'Work life', 'work life', 'Keep my description', NOW())`;
      await tx.$executeRawUnsafe(`DO $catalog$ BEGIN ${catalogMigration} END $catalog$;`);
      expect(await tx.$queryRaw`SELECT "normalizedName", "groupId" FROM "IntermediateTopicGroupName"`)
        .toEqual([{ normalizedName: 'work life', groupId: legacyId }]);
      expect(await tx.$queryRaw`SELECT "id", "name", "nameEn", "aliases", "catalogKey", "description" FROM "IntermediateTopicGroup"`)
        .toEqual([{ id: legacyId, name: 'Work life', nameEn: null, aliases: [], catalogKey: null, description: 'Keep my description' }]);
      await tx.$executeRawUnsafe(`DROP SCHEMA "${legacySchema}" CASCADE`);
    });
  });

  it('reserves bilingual names atomically, preserves omitted metadata, releases aliases and cascades the registry', async () => {
    const a = await service.create({ name: 'Thực đơn', nameEn: 'Menu planning', aliases: ['meal planning'], description: 'Custom' });
    const b = await service.create({ name: 'Kitchen', nameEn: 'Cooking', aliases: ['Cookery'], description: '' });
    await expect(service.update(a.id, { name: 'Changed', nameEn: ' ＣＯＯＫＩＮＧ ', aliases: ['new alias'], description: '', expectedRevision: 1 })).rejects.toMatchObject({ status: 409 });
    expect(await database.intermediateTopicGroup.findUnique({ where: { id: a.id } })).toMatchObject({ name: 'Thực đơn', revision: 1 });
    expect(await database.intermediateTopicGroupName.findUnique({ where: { normalizedName: 'new alias' } })).toBeNull();
    await service.update(a.id, { name: 'Meal choices', description: 'Changed', expectedRevision: 1, nameEn: undefined, aliases: undefined });
    await expect(service.create({ name: 'meal   planning', description: '' })).rejects.toMatchObject({ status: 409 });
    await service.update(a.id, { name: 'Meal choices', nameEn: null, aliases: [], description: '', expectedRevision: 2 });
    expect(await service.create({ name: 'Menu planning', description: '' })).toMatchObject({ name: 'Menu planning' });
    await service.remove(b.id, { expectedRevision: 1 });
    expect(await database.intermediateTopicGroupName.count({ where: { groupId: b.id } })).toBe(0);
  });

  it('creates draft and assignment atomically and leaves no draft on missing or invalid groups', async () => {
    const imports = new ContentImportsService(database as PrismaService);
    const group = await service.create({ name: 'New lesson mapping', description: '' });
    const before = await database.contentImport.count();
    await expect(imports.create(actor, topicSource, randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(imports.create(actor, 'INVALID SOURCE', group.id)).rejects.toMatchObject({ status: 400 });
    expect(await database.contentImport.count()).toBe(before);
    const assigned = await imports.create(actor, topicSource, group.id);
    expect(assigned).toMatchObject({ topicGroupId: group.id, topicGroupRevision: 1, draftRevision: 1, rawSource: topicSource });
    expect(await imports.create(actor, 'INVALID SOURCE')).toMatchObject({ topicGroupId: null, topicGroupRevision: 0 });
    expect(await database.contentImport.count()).toBe(before + 2);
  });

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

  it('seeds all categories repeatably while preserving custom names, IDs and subsequent edits', async () => {
    const existing = await database.intermediateTopicGroup.findUniqueOrThrow({ where: { normalizedName: 'restaurant' } });
    const first = await seedIntermediateTopicCatalog(database);
    expect(first.created + first.reused + first.skipped).toBe(150);
    expect(first.skipped).toBe(0);
    const adopted = await database.intermediateTopicGroup.findUniqueOrThrow({ where: { catalogKey: 'restaurants' } });
    expect(adopted).toMatchObject({ id: existing.id, name: existing.name, description: existing.description });
    const edited = await service.update(adopted.id, { name: 'Administrator edited dining', nameEn: null, aliases: [], description: 'Keep this', expectedRevision: adopted.revision });
    const snapshot = await database.intermediateTopicGroup.findMany({ orderBy: { id: 'asc' } });
    expect(await seedIntermediateTopicCatalog(database)).toEqual({ created: 0, reused: 150, skipped: 0, conflicts: [] });
    expect(await database.intermediateTopicGroup.findMany({ orderBy: { id: 'asc' } })).toEqual(snapshot);
    expect(edited).toMatchObject({ name: 'Administrator edited dining', nameEn: null, aliases: [] });
  }, 30_000);
});
