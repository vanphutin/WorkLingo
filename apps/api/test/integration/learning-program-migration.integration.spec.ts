import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MIGRATION_NAME = '20261012000100_learning_programs';
const INTERMEDIATE_PROGRAM_ID = '10000000-0000-4000-8000-000000000002';
const IDS = {
  activity: '20000000-0000-4000-8000-000000000009',
  attempt: '20000000-0000-4000-8000-000000000007',
  learner: '20000000-0000-4000-8000-000000000001',
  lesson: '20000000-0000-4000-8000-000000000004',
  lessonVersion: '20000000-0000-4000-8000-000000000005',
  level: '20000000-0000-4000-8000-000000000002',
  mission: '20000000-0000-4000-8000-000000000003',
  path: '20000000-0000-4000-8000-000000000000',
  session: '20000000-0000-4000-8000-000000000006',
} as const;

describe('LearningProgram migration', () => {
  const schemaName = `learning_program_migration_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const schemaUrl = new URL(baseUrl);
  schemaUrl.searchParams.set('schema', schemaName);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: schemaUrl.toString() });
  const sourcePrismaDir = path.resolve('prisma');
  const sourceMigrationDir = path.join(sourcePrismaDir, 'migrations', MIGRATION_NAME);
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'worklingo-program-migration-'));
  const temporaryPrismaDir = path.join(temporaryRoot, 'prisma');
  const temporaryMigrationsDir = path.join(temporaryPrismaDir, 'migrations');
  const temporarySchemaPath = path.join(temporaryPrismaDir, 'schema.prisma');

  function migrateDeploy(): void {
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(
      process.execPath,
      [cli, 'migrate', 'deploy', '--schema', temporarySchemaPath],
      {
        cwd: tmpdir(),
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: schemaUrl.toString() },
        timeout: 60_000,
      },
    );
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
  }

  beforeAll(async () => {
    mkdirSync(temporaryMigrationsDir, { recursive: true });
    cpSync(path.join(sourcePrismaDir, 'schema.prisma'), temporarySchemaPath);
    cpSync(
      path.join(sourcePrismaDir, 'migrations', 'migration_lock.toml'),
      path.join(temporaryMigrationsDir, 'migration_lock.toml'),
    );
    for (const migrationName of readdirSync(path.join(sourcePrismaDir, 'migrations'))) {
      if (migrationName >= MIGRATION_NAME || migrationName === 'migration_lock.toml') continue;
      cpSync(
        path.join(sourcePrismaDir, 'migrations', migrationName),
        path.join(temporaryMigrationsDir, migrationName),
        { recursive: true },
      );
    }
    migrateDeploy();
    await database.$connect();

    await database.$executeRawUnsafe(
      `INSERT INTO "User" ("id", "email", "displayName", "passwordHash", "updatedAt")
       VALUES ($1::uuid, 'migration-learner@example.test', 'Migration Learner', 'test-only-hash', CURRENT_TIMESTAMP)`,
      IDS.learner,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "LearningPath" ("id", "slug", "name", "status", "revision", "updatedAt")
       VALUES ($1::uuid, 'existing-workplace-path', 'Existing Workplace Path', 'PUBLISHED', 7, CURRENT_TIMESTAMP)`,
      IDS.path,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "Level" ("id", "pathId", "code", "name", "cefrReference", "order", "status", "revision", "updatedAt")
       VALUES ($1::uuid, $2::uuid, 'MIGRATION_LEVEL', 'Migration Level', 'B1', 1, 'PUBLISHED', 4, CURRENT_TIMESTAMP)`,
      IDS.level,
      IDS.path,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "Mission" ("id", "levelId", "slug", "title", "objective", "order", "purpose", "status", "revision", "updatedAt")
       VALUES ($1::uuid, $2::uuid, 'migration-mission', 'Migration Mission', 'Preserve migration history', 1, 'LEARNING', 'PUBLISHED', 3, CURRENT_TIMESTAMP)`,
      IDS.mission,
      IDS.level,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "Lesson" ("id", "slug", "updatedAt")
       VALUES ($1::uuid, 'migration-lesson', CURRENT_TIMESTAMP)`,
      IDS.lesson,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "LessonVersion" ("id", "lessonId", "version", "title", "status", "sourceHash", "parsedContent", "updatedAt")
       VALUES ($1::uuid, $2::uuid, 1, 'Migration Lesson', 'DRAFT', 'migration-source-hash', '{}'::jsonb, CURRENT_TIMESTAMP)`,
      IDS.lessonVersion,
      IDS.lesson,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "Activity" ("id", "lessonVersionId", "slug", "activityType", "learningBlock", "order", "skills", "contentReferences", "languageBlockReferences", "payload", "updatedAt")
       VALUES ($1::uuid, $2::uuid, 'migration-activity', 'reading', 'activate', 1, ARRAY['reading'::"ActivityType"], ARRAY[]::text[], ARRAY[]::text[], '{}'::jsonb, CURRENT_TIMESTAMP)`,
      IDS.activity,
      IDS.lessonVersion,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "LearningSession" ("id", "learnerId", "clientSessionId", "missionId", "lessonVersionId", "durationMinutes", "planSnapshot", "updatedAt")
       VALUES ($1::uuid, $2::uuid, '20000000-0000-4000-8000-000000000008'::uuid, $3::uuid, $4::uuid, 60, '{}'::jsonb, CURRENT_TIMESTAMP)`,
      IDS.session,
      IDS.learner,
      IDS.mission,
      IDS.lessonVersion,
    );
    await database.$executeRawUnsafe(
      `INSERT INTO "ActivityAttempt" ("id", "learnerId", "sessionId", "activityId", "clientAttemptId", "rawResponse", "evaluationStatus", "updatedAt")
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, '20000000-0000-4000-8000-000000000010'::uuid, '{}'::jsonb, 'SUBMITTED', CURRENT_TIMESTAMP)`,
      IDS.attempt,
      IDS.learner,
      IDS.session,
      IDS.activity,
    );
  }, 90_000);

  afterAll(async () => {
    await database.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
    rmSync(temporaryRoot, { force: true, recursive: true, maxRetries: 10, retryDelay: 200 });
  });

  it('backfills an existing path to Intermediate without changing historical identifiers', async () => {
    expect(existsSync(sourceMigrationDir)).toBe(true);
    if (!existsSync(sourceMigrationDir)) return;

    cpSync(
      sourceMigrationDir,
      path.join(temporaryMigrationsDir, MIGRATION_NAME),
      { recursive: true },
    );
    migrateDeploy();

    const [snapshot] = await database.$queryRawUnsafe<Array<{
      attemptId: string;
      lessonVersionId: string;
      levelId: string;
      missionId: string;
      pathId: string;
      programId: string;
      sessionId: string;
    }>>(
      `SELECT p."id" AS "pathId", p."programId", l."id" AS "levelId",
              m."id" AS "missionId", v."id" AS "lessonVersionId",
              s."id" AS "sessionId", a."id" AS "attemptId"
       FROM "LearningPath" p
       JOIN "Level" l ON l."pathId" = p."id"
       JOIN "Mission" m ON m."levelId" = l."id"
       JOIN "LearningSession" s ON s."missionId" = m."id"
       JOIN "LessonVersion" v ON v."id" = s."lessonVersionId"
       JOIN "ActivityAttempt" a ON a."sessionId" = s."id"
       WHERE p."id" = $1::uuid`,
      IDS.path,
    );

    expect(snapshot).toEqual({
      attemptId: IDS.attempt,
      lessonVersionId: IDS.lessonVersion,
      levelId: IDS.level,
      missionId: IDS.mission,
      pathId: IDS.path,
      programId: INTERMEDIATE_PROGRAM_ID,
      sessionId: IDS.session,
    });
  });
});
