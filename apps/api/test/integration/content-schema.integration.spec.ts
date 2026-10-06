import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient, type Prisma } from '@prisma/client';
import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { seedFoundationCurriculum } from '../../src/curriculum/infrastructure/seed-foundation.js';

describe('Content authoring and publishing schema integration', () => {
  const schemaName = `content_schema_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve(
      'prisma/build/index.js',
    );
    const migration = spawnSync(
      process.execPath,
      [cli, 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: 'utf8',
        timeout: 45_000,
      },
    );
    if (migration.status !== 0) {
      throw new Error(migration.stderr || migration.stdout);
    }
    database = new PrismaClient({ datasourceUrl: url.toString() });
  }, 50_000);

  afterAll(async () => {
    await database?.$disconnect();
    await admin.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await admin.$disconnect();
  });

  it('preserves Foundation seed and parsed snapshot through immutable models', async () => {
    await seedFoundationCurriculum(database);

    const lesson = await database.lesson.findUniqueOrThrow({
      where: { slug: foundationMissionFixture.lesson.slug },
      include: {
        versions: {
          include: {
            wordBanks: {
              include: {
                wordBankVersion: {
                  include: {
                    languageBlocks: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(lesson.versions).toHaveLength(1);
    const version1 = lesson.versions[0]!;
    expect(version1.version).toBe(1);
    expect(version1.status).toBe('PUBLISHED');

    const parsed = lessonSnapshotSchema.parse(version1.parsedContent);
    expect(parsed.title).toBe(foundationMissionFixture.lesson.title);
    expect(parsed.wordBanks[0]!.slug).toBe('workplace-introductions');
  });

  it('allows draft-less and draft ContentImport records', async () => {
    const user = await database.user.create({
      data: {
        email: `author_${randomUUID()}@example.com`,
        displayName: 'Content Author',
        passwordHash: 'hash',
        role: 'CONTENT_ADMIN',
      },
    });

    const draftImport = await database.contentImport.create({
      data: {
        rawSource: 'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: draft-slug',
        sourceHash: createHash('sha256').update('draft').digest('hex'),
        status: 'DRAFT',
        draftRevision: 1,
        parserVersion: '1.0.0',
        createdById: user.id,
        updatedById: user.id,
      },
    });

    expect(draftImport.id).toBeDefined();
    expect(draftImport.lessonId).toBeNull();
    expect(draftImport.lessonVersionId).toBeNull();
  });

  it('enforces partial unique index: only one PUBLISHED version per lesson', async () => {
    const lesson = await database.lesson.findUniqueOrThrow({
      where: { slug: foundationMissionFixture.lesson.slug },
    });

    const published = await database.lessonVersion.findFirstOrThrow({
      where: { lessonId: lesson.id, status: 'PUBLISHED' },
    });

    // Attempting to create a second PUBLISHED version for the same lesson must violate the partial unique index
    await expect(
      database.lessonVersion.create({
        data: {
          lessonId: lesson.id,
          version: 2,
          title: 'Second Published Version',
          status: 'PUBLISHED',
          sourceHash: 'dummyhash2',
          parsedContent: published.parsedContent as Prisma.InputJsonValue,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects updates to published lesson snapshot, content, and activities via trigger', async () => {
    const lesson = await database.lesson.findUniqueOrThrow({
      where: { slug: foundationMissionFixture.lesson.slug },
    });
    const version = await database.lessonVersion.findFirstOrThrow({
      where: { lessonId: lesson.id, status: 'PUBLISHED' },
    });

    // Title update on PUBLISHED version fails
    await expect(
      database.lessonVersion.update({
        where: { id: version.id },
        data: { title: 'Mutated Title' },
      }),
    ).rejects.toThrow(/immutable/i);

    // ContentBlock modification on PUBLISHED version fails
    const content = await database.contentBlock.findFirstOrThrow({
      where: { lessonVersionId: version.id },
    });
    await expect(
      database.contentBlock.update({
        where: { id: content.id },
        data: { text: 'Mutated Text' },
      }),
    ).rejects.toThrow(/immutable/i);

    // Activity modification on PUBLISHED version fails
    const activity = await database.activity.findFirstOrThrow({
      where: { lessonVersionId: version.id },
    });
    await expect(
      database.activity.update({
        where: { id: activity.id },
        data: { slug: 'mutated-slug' },
      }),
    ).rejects.toThrow(/immutable/i);
  });

  it('allows legal PUBLISHED -> ARCHIVED transition and prevents updates to archived versions', async () => {
    const lesson = await database.lesson.findUniqueOrThrow({
      where: { slug: foundationMissionFixture.lesson.slug },
    });

    const version = await database.lessonVersion.findFirstOrThrow({
      where: { lessonId: lesson.id, status: 'PUBLISHED' },
    });

    // Legal transition PUBLISHED -> ARCHIVED succeeds
    await database.lessonVersion.update({
      where: { id: version.id },
      data: { status: 'ARCHIVED' },
    });

    const updated = await database.lessonVersion.findUniqueOrThrow({
      where: { id: version.id },
    });
    expect(updated.status).toBe('ARCHIVED');

    // Any subsequent modification to ARCHIVED version is rejected by database trigger
    await expect(
      database.lessonVersion.update({
        where: { id: version.id },
        data: { title: 'Modified Title After Archive' },
      }),
    ).rejects.toThrow(/immutable/i);
  });
});
