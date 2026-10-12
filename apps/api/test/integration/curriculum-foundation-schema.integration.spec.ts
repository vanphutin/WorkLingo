import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261013000100_curriculum_foundation';

it('adds foundation bindings without changing historical sessions and protects referenced revisions', async () => {
  const schema = `foundation_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-foundation-'));
  const prisma = path.join(root, 'prisma');
  mkdirSync(path.join(prisma, 'migrations'), { recursive: true });
  cpSync('prisma/schema.prisma', path.join(prisma, 'schema.prisma'));
  for (const entry of readdirSync('prisma/migrations')) {
    if (entry !== 'migration_lock.toml' && entry >= target) continue;
    cpSync(path.join('prisma/migrations', entry), path.join(prisma, 'migrations', entry), { recursive: true });
  }
  const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
  const run = (args: string[]) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 45_000,
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  };
  try {
    run(['migrate', 'deploy', '--schema', path.join(prisma, 'schema.prisma')]);
    const learner = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Legacy', passwordHash: 'test-only' } });
    const learningPath = await database.learningPath.create({ data: { slug: randomUUID(), name: 'Legacy' } });
    const level = await database.level.create({ data: { pathId: learningPath.id, code: randomUUID(), name: 'Legacy', cefrReference: 'A1', order: 1 } });
    const mission = await database.mission.create({ data: { levelId: level.id, slug: randomUUID(), title: 'Legacy', objective: 'Keep', order: 1 } });
    const lesson = await database.lesson.create({ data: { slug: randomUUID() } });
    const version = await database.lessonVersion.create({ data: { lessonId: lesson.id, version: 1, title: 'Legacy', sourceHash: randomUUID(), parsedContent: {} } });
    // Use raw old-session insert: the generated client will know the newly added column.
    const sessionId = randomUUID();
    await database.$executeRaw`INSERT INTO "LearningSession" ("id","learnerId","clientSessionId","missionId","lessonVersionId","durationMinutes","planSnapshot","updatedAt") VALUES (${sessionId}::uuid,${learner.id}::uuid,${randomUUID()}::uuid,${mission.id}::uuid,${version.id}::uuid,60,'{}',CURRENT_TIMESTAMP)`;
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);
    const sessions = await database.$queryRaw<Array<{ id: string; lessonVersionId: string; curriculumRevisionId: string | null }>>`SELECT "id","lessonVersionId","curriculumRevisionId" FROM "LearningSession"`;
    expect(sessions).toEqual([{ id: sessionId, lessonVersionId: version.id, curriculumRevisionId: null }]);
    const revisionId = randomUUID();
    await database.$executeRaw`INSERT INTO "CurriculumRevision" ("id","missionId","revision","snapshot") VALUES (${revisionId}::uuid,${mission.id}::uuid,1,'{}')`;
    await database.$executeRaw`INSERT INTO "CurriculumRevisionLesson" ("curriculumRevisionId","lessonVersionId","order") VALUES (${revisionId}::uuid,${version.id}::uuid,1)`;
    await expect(database.$executeRaw`DELETE FROM "LessonVersion" WHERE "id"=${version.id}::uuid`).rejects.toThrow();
    await database.$executeRaw`UPDATE "LearningSession" SET "curriculumRevisionId"=${revisionId}::uuid WHERE "id"=${sessionId}::uuid`;
    await expect(database.$executeRaw`DELETE FROM "CurriculumRevision" WHERE "id"=${revisionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`UPDATE "CurriculumRevision" SET "snapshot"='{"changed":true}' WHERE "id"=${revisionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "CurriculumRevision" ("id","missionId","revision","snapshot") VALUES (${randomUUID()}::uuid,${mission.id}::uuid,1,'{}')`).rejects.toThrow();
    expect(await database.lesson.count()).toBe(1);
    expect(await database.learningSession.count()).toBe(1);
  } finally {
    await database.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 60_000);
