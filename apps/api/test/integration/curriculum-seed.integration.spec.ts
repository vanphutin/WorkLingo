import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClient, type Prisma } from '@prisma/client';
import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../src/common/database/prisma.service.js';
import { CurriculumService } from '../../src/curriculum/application/curriculum.service.js';
import { CurriculumModule } from '../../src/curriculum/curriculum.module.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { seedFoundationCurriculum } from '../../src/curriculum/infrastructure/seed-foundation.js';

// Database persistence and the application read/write boundary are approved Task 4 seams.
describe('Foundation curriculum seed', () => {
  const schemaName = `curriculum_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let moduleRef: TestingModule | undefined;
  let database: PrismaService;
  let curriculum: CurriculumService;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url.toString() }, encoding: 'utf8', timeout: 30_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    moduleRef = await Test.createTestingModule({ imports: [CurriculumModule] })
      .overrideProvider(PrismaService)
      .useValue(new PrismaService({ datasourceUrl: url.toString() }))
      .compile();
    await moduleRef.init();
    database = moduleRef.get(PrismaService);
    curriculum = moduleRef.get(CurriculumService);
  }, 40_000);

  beforeEach(async () => {
    // Reset curriculum only inside this test's generated schema.
    const tables = ['LearningPath', 'Level', 'Mission', 'Lesson', 'LessonVersion',
      'MissionLesson', 'ContentBlock', 'Activity', 'WordBank', 'LanguageBlock', 'LessonVersionWordBank'];
    await database.$executeRawUnsafe(`TRUNCATE ${tables.map((name) => `"${schemaName}"."${name}"`).join(', ')} CASCADE`);
  });

  afterAll(async () => {
    await moduleRef?.close();
    // Only this generated test schema is removed. Never truncate the learner database.
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
  });

  it('can seed twice without duplicating curriculum or changing activity identities', async () => {
    await seedFoundationCurriculum(database);
    const first = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    await seedFoundationCurriculum(database);
    const second = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');

    expect(second).toEqual(first);
    expect(first.title).toBe('Introduce yourself to a new colleague');
    expect(first.lessonVersion.version).toBe(1);
    expect(new Set(first.lessonVersion.activities.flatMap((a) => a.skills)))
      .toEqual(new Set(['reading', 'listening', 'speaking', 'writing']));
    expect(first.lessonVersion.activities.map((a) => a.slug)).toEqual([
      'recall-introduction', 'understand-welcome', 'understand-colleague',
      'shadow-introduction', 'write-first-message',
    ]);
    await expect(database.learningPath.count()).resolves.toBe(1);
    await expect(database.level.count()).resolves.toBe(1);
    await expect(database.mission.count()).resolves.toBe(1);
    await expect(database.lesson.count()).resolves.toBe(1);
    await expect(database.lessonVersion.count()).resolves.toBe(1);
    await expect(database.activity.count()).resolves.toBe(5);
    await expect(database.languageBlock.count()).resolves.toBe(4);
  });

  it('rejects edits to a published lesson through the curriculum service', async () => {
    await seedFoundationCurriculum(database);
    const before = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    await expect(curriculum.updateLessonVersion(before.lessonVersion.id, { title: 'Changed lesson' }))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(curriculum.getPublishedMissionForLevel('FOUNDATION_1')).resolves.toEqual(before);
  });

  it('updates a draft snapshot and selects the next published version without changing version one', async () => {
    await seedFoundationCurriculum(database);
    const original = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    const stored = await database.lessonVersion.findUniqueOrThrow({ where: { id: original.lessonVersion.id } });
    const snapshot = lessonSnapshotSchema.parse(stored.parsedContent);
    snapshot.contentBlocks.forEach((block) => { block.id = randomUUID(); });
    snapshot.activities.forEach((activity) => { activity.id = randomUUID(); });
    const draft = await database.lessonVersion.create({ data: {
      lessonId: stored.lessonId, version: 2, title: stored.title, sourceHash: stored.sourceHash,
      parsedContent: snapshot as Prisma.InputJsonValue,
      contentBlocks: { create: snapshot.contentBlocks.map((block, order) => ({
        id: block.id, slug: block.slug, type: block.type, text: block.text, order,
        metadata: block.audio ? { audio: block.audio } : {},
      })) },
      activities: { create: snapshot.activities.map((activity) => ({
        ...activity, payload: activity.payload as Prisma.InputJsonValue,
      })) },
      wordBanks: { create: snapshot.wordBanks.map((bank) => ({ wordBankId: bank.id })) },
    } });
    await curriculum.updateLessonVersion(draft.id, { title: 'Introductions on a project call' });
    await database.lessonVersion.update({ where: { id: draft.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    const latest = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    expect(latest.lessonVersion).toMatchObject({ id: draft.id, version: 2, title: 'Introductions on a project call' });
    for (const activity of latest.lessonVersion.activities) {
      await expect(database.activity.findUniqueOrThrow({ where: { id: activity.id } }))
        .resolves.toMatchObject({ lessonVersionId: draft.id });
    }
    await expect(database.lessonVersion.findUniqueOrThrow({ where: { id: stored.id } })).resolves.toEqual(stored);
  });

  it('protects published snapshots and child records even when writing directly to PostgreSQL', async () => {
    await seedFoundationCurriculum(database);
    const version = await database.lessonVersion.findFirstOrThrow({ where: { version: 1 } });
    const activity = await database.activity.findFirstOrThrow({ where: { lessonVersionId: version.id } });
    const block = await database.contentBlock.findFirstOrThrow({ where: { lessonVersionId: version.id } });
    const bank = await database.lessonVersionWordBank.findFirstOrThrow({ where: { lessonVersionId: version.id } });
    await expect(database.lessonVersion.update({ where: { id: version.id }, data: { title: 'Bypass' } })).rejects.toThrow(/immutable/iu);
    await expect(database.lessonVersion.delete({ where: { id: version.id } })).rejects.toThrow(/immutable/iu);
    await expect(database.activity.update({ where: { id: activity.id }, data: { payload: {} } })).rejects.toThrow(/immutable/iu);
    await expect(database.activity.delete({ where: { id: activity.id } })).rejects.toThrow(/immutable/iu);
    await expect(database.contentBlock.update({ where: { id: block.id }, data: { text: 'Bypass' } })).rejects.toThrow(/immutable/iu);
    await expect(database.lessonVersionWordBank.delete({ where: { lessonVersionId_wordBankId: bank } })).rejects.toThrow(/immutable/iu);
    await expect(database.activity.create({ data: {
      ...activity, payload: activity.payload as Prisma.InputJsonValue,
      id: randomUUID(), slug: 'injected', order: 99,
    } })).rejects.toThrow(/immutable/iu);
  });

  it('rejects empty draft titles without changing the stored lesson', async () => {
    await seedFoundationCurriculum(database);
    const stored = await database.lessonVersion.findFirstOrThrow({ where: { version: 1 } });
    const draft = await database.lessonVersion.create({ data: {
      lessonId: stored.lessonId, version: 3, title: stored.title, sourceHash: stored.sourceHash,
      parsedContent: stored.parsedContent!,
    } });
    await expect(curriculum.updateLessonVersion(draft.id, { title: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(database.lessonVersion.findUniqueOrThrow({ where: { id: draft.id } })).resolves.toEqual(draft);
  });

  it('reports a missing published level or lesson version with a typed not-found error', async () => {
    await expect(curriculum.getPublishedMissionForLevel('UNKNOWN_LEVEL')).rejects.toBeInstanceOf(NotFoundException);
    await expect(curriculum.updateLessonVersion(randomUUID(), { title: 'New title' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps published language examples unchanged when the reusable Word Bank evolves', async () => {
    await seedFoundationCurriculum(database);
    const before = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    await database.languageBlock.update({ where: { slug: 'my-name-is' }, data: { meaning: 'New bank meaning' } });
    await expect(curriculum.getPublishedMissionForLevel('FOUNDATION_1')).resolves.toEqual(before);
  });

  it('serializes concurrent seed calls without creating duplicate versions', async () => {
    await Promise.all([seedFoundationCurriculum(database), seedFoundationCurriculum(database)]);
    await expect(database.lessonVersion.count({ where: { version: 1 } })).resolves.toBe(1);
    await expect(database.activity.count()).resolves.toBe(5);
    await expect(database.contentBlock.count()).resolves.toBe(2);
    const first = await curriculum.getPublishedMissionForLevel('FOUNDATION_1');
    await seedFoundationCurriculum(database);
    await expect(curriculum.getPublishedMissionForLevel('FOUNDATION_1')).resolves.toEqual(first);
  });

  it('rejects a published snapshot whose activities belong to another version', async () => {
    await seedFoundationCurriculum(database);
    const original = await database.lessonVersion.findFirstOrThrow({ where: { version: 1 } });
    await database.lessonVersion.create({ data: {
      lessonId: original.lessonId, version: 2, title: original.title,
      sourceHash: original.sourceHash, parsedContent: original.parsedContent!,
      status: 'PUBLISHED', publishedAt: new Date(),
    } });
    await expect(curriculum.getPublishedMissionForLevel('FOUNDATION_1')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['level', 'mission', 'languageBlock'] as const)(
    'rejects a reused %s slug owned by a different parent and rolls back the seed', async (entity) => {
      if (entity === 'languageBlock') {
        const bank = await database.wordBank.create({ data: { slug: 'unrelated-bank', name: 'Other bank' } });
        const block = foundationMissionFixture.lesson.wordBanks[0].languageBlocks[0];
        await database.languageBlock.create({ data: {
          ...block, wordBankId: bank.id,
          collocations: [...block.collocations], examples: [...block.examples],
          commonErrors: [...block.commonErrors], transferContexts: [...block.transferContexts],
        } });
      } else {
        const path = await database.learningPath.create({ data: { slug: 'unrelated-path', name: 'Other path' } });
        const level = await database.level.create({ data: {
          pathId: path.id, code: entity === 'level' ? 'FOUNDATION_1' : 'OTHER_LEVEL',
          name: 'Other level', cefrReference: 'A1', order: 0,
        } });
        if (entity === 'mission') {
          await database.mission.create({ data: {
            slug: foundationMissionFixture.slug, levelId: level.id,
            title: 'Other mission', objective: 'Other objective', order: 0,
          } });
        }
      }
      await expect(seedFoundationCurriculum(database)).rejects.toBeInstanceOf(ConflictException);
      await expect(database.lessonVersion.count()).resolves.toBe(0);
      await expect(database.lesson.count()).resolves.toBe(0);
    },
  );

  it('preserves database-generated UUIDs for existing auth tables after curriculum migration', async () => {
    const [user] = await database.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}"."User" ("email", "displayName", "passwordHash", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING "id"`,
      'database-default@example.test', 'Database default test', 'test-only-placeholder-hash',
    );
    expect(user?.id).toMatch(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);
    const [session] = await database.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "${schemaName}"."UserSession" ("userId", "tokenHash", "expiresAt", "updatedAt")
       VALUES ($1::uuid, $2, CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP) RETURNING "id"`,
      user!.id, 'test-only-placeholder-token-hash',
    );
    expect(session?.id).toMatch(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u);
  });
});
