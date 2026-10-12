import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';

const TARGET = '20261012000200_learner_program_enrollment';
const INTERMEDIATE = '10000000-0000-4000-8000-000000000002';

describe('Program enrollment migration', () => {
  it('preserves complete learner levels and session history while pending learners stay unassigned', async () => {
    expect(existsSync(path.join('prisma/migrations', TARGET, 'migration.sql'))).toBe(true);
    await rehearse(async (database, apply) => {
      const archived = await createLevel(database, INTERMEDIATE, 'ARCHIVED');
      const learner = await createLearner(database, 'COMPLETE', archived.id);
      const pending = await createLearner(database, 'PENDING', archived.id);
      const mission = await database.mission.create({ data: {
        levelId: archived.id, slug: randomUUID(), title: 'Legacy mission', objective: 'Preserve', order: 0,
      } });
      const lesson = await database.lesson.create({ data: { slug: randomUUID() } });
      const version = await database.lessonVersion.create({ data: {
        lessonId: lesson.id, version: 1, title: 'Legacy lesson', sourceHash: randomUUID(), parsedContent: {},
      } });
      const session = await database.learningSession.create({ data: {
        learnerId: learner, clientSessionId: randomUUID(), missionId: mission.id,
        lessonVersionId: version.id, durationMinutes: 60, planSnapshot: {}, currentCheckpoint: 3,
      } });
      await apply();
      const rows = await database.$queryRawUnsafe<Array<{ learnerId: string; currentLevelId: string; revision: number }>>(
        'SELECT "learnerId", "currentLevelId", "revision" FROM "LearnerProgramEnrollment"',
      );
      expect(rows).toEqual([{ learnerId: learner, currentLevelId: archived.id, revision: 1 }]);
      const profiles = await database.$queryRawUnsafe<Array<{ userId: string; activeProgramId: string | null }>>(
        'SELECT "userId", "activeProgramId" FROM "LearnerProfile"',
      );
      expect(profiles).toEqual(expect.arrayContaining([
        { userId: learner, activeProgramId: INTERMEDIATE }, { userId: pending, activeProgramId: null },
      ]));
      expect(await database.learningSession.findUnique({ where: { id: session.id } })).toMatchObject({
        id: session.id, missionId: mission.id, lessonVersionId: version.id, currentCheckpoint: 3,
      });
    });
  }, 60_000);

  it.each(['missing', 'foreign'] as const)('aborts atomically when a complete learner level is %s', async (kind) => {
    await rehearse(async (database, apply) => {
      const level = await createLevel(database, kind === 'foreign'
        ? '10000000-0000-4000-8000-000000000004' : INTERMEDIATE, 'PUBLISHED');
      const learner = await createLearner(database, 'COMPLETE', level.id);
      if (kind === 'missing') {
        await database.$executeRaw`UPDATE "LearnerProfile" SET "currentLevelCode" = 'DOES_NOT_EXIST' WHERE "userId" = ${learner}::uuid`;
      }
      await expect(apply()).rejects.toThrow('Cannot migrate program enrollment');
      const columns = await database.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'LearnerProfile' AND column_name = 'activeProgramId'
      `;
      expect(columns[0]?.count).toBe(0n);
      const tables = await database.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'LearnerProgramEnrollment'
      `;
      expect(tables[0]?.count).toBe(0n);
    });
  }, 60_000);
});

async function createLevel(database: PrismaClient, programId: string, status: 'ARCHIVED' | 'PUBLISHED') {
  const learningPath = await database.learningPath.create({ data: {
    slug: randomUUID(), name: 'Legacy path', programId,
  } });
  return database.level.create({ data: {
    pathId: learningPath.id, code: randomUUID(), name: 'Legacy level', cefrReference: 'B1', order: 0, status,
  } });
}

async function createLearner(database: PrismaClient, status: 'PENDING' | 'COMPLETE', levelId: string) {
  const user = await database.user.create({ data: {
    email: `${randomUUID()}@example.test`, displayName: 'Legacy learner', passwordHash: 'test-only',
  } });
  const level = await database.level.findUniqueOrThrow({ where: { id: levelId } });
  // Raw SQL intentionally creates the old profile shape before the migration under test.
  await database.$executeRaw`
    INSERT INTO "LearnerProfile" ("userId", "currentLevelCode", "onboardingStatus", "updatedAt")
    VALUES (${user.id}::uuid, ${level.code}, ${status}::"OnboardingStatus", CURRENT_TIMESTAMP)
  `;
  return user.id;
}

async function rehearse(run: (database: PrismaClient, apply: () => Promise<void>) => Promise<void>) {
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const schema = `enrollment_migration_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'worklingo-enrollment-'));
  const temporaryPrisma = path.join(temporaryRoot, 'prisma');
  const migrations = path.join(temporaryPrisma, 'migrations');
  mkdirSync(migrations, { recursive: true });
  cpSync('prisma/schema.prisma', path.join(temporaryPrisma, 'schema.prisma'));
  for (const entry of readdirSync('prisma/migrations')) {
    if (entry !== 'migration_lock.toml' && entry >= TARGET) continue;
    cpSync(path.join('prisma/migrations', entry), path.join(migrations, entry), { recursive: true });
  }
  const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
  try {
    const result = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--schema', path.join(temporaryPrisma, 'schema.prisma')], {
      cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 45_000,
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    await run(database, async () => {
      const source = path.resolve('prisma/migrations', TARGET, 'migration.sql');
      expect(existsSync(source)).toBe(true);
      const execution = spawnSync(process.execPath, [cli, 'db', 'execute', '--file', source, '--url', url.toString()], {
        cwd: tmpdir(), encoding: 'utf8', timeout: 30_000,
      });
      if (execution.status !== 0) throw new Error(execution.stderr || execution.stdout);
    });
  } finally {
    await database.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
