import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261014000200_ielts_full_mock';

it('adds immutable mock versions, version-bound attempts and reviewer history', async () => {
  const schema = `mock_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl); url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl }); const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-mock-')); const prisma = path.join(root, 'prisma'); mkdirSync(path.join(prisma, 'migrations'), { recursive: true });
  cpSync('prisma/schema.prisma', path.join(prisma, 'schema.prisma'));
  for (const entry of readdirSync('prisma/migrations')) { if (entry !== 'migration_lock.toml' && entry >= target) continue; cpSync(path.join('prisma/migrations', entry), path.join(prisma, 'migrations', entry), { recursive: true }); }
  const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
  const run = (args: string[]) => { const result = spawnSync(process.execPath, [cli, ...args], { cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 60_000 }); if (result.status !== 0) throw new Error(result.stderr || result.stdout); };
  try {
    run(['migrate', 'deploy', '--schema', path.join(prisma, 'schema.prisma')]);
    const learner = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Mock learner', passwordHash: 'test-only' } });
    const reviewer = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Reviewer', passwordHash: 'test-only', role: 'CONTENT_ADMIN' } });
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);
    const mockId = randomUUID(); const versionId = randomUUID(); const attemptId = randomUUID(); const content = JSON.stringify({ schemaVersion: 1 });
    await database.$executeRaw`INSERT INTO "IeltsMockTest" ("id","slug","draftContent","updatedAt") VALUES (${mockId}::uuid,'academic-1',${content}::jsonb,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsMockTestVersion" ("id","mockTestId","version","sourceHash","content") VALUES (${versionId}::uuid,${mockId}::uuid,1,'hash',${content}::jsonb)`;
    await database.$executeRaw`INSERT INTO "IeltsMockAttempt" ("id","learnerId","clientAttemptId","mockTestVersionId","mode","sectionDeadlineAt","updatedAt") VALUES (${attemptId}::uuid,${learner.id}::uuid,${randomUUID()}::uuid,${versionId}::uuid,'EXAM_SIMULATION',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsMockReview" ("attemptId","reviewerId","attemptRevision","evaluation") VALUES (${attemptId}::uuid,${reviewer.id}::uuid,1,'{}')`;
    await expect(database.$executeRaw`UPDATE "IeltsMockTestVersion" SET "content"='{}' WHERE "id"=${versionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "IeltsMockAttempt" ("learnerId","clientAttemptId","mockTestVersionId","mode","sectionDeadlineAt","updatedAt") VALUES (${learner.id}::uuid,${randomUUID()}::uuid,${versionId}::uuid,'OFFICIAL',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).rejects.toThrow();
  } finally { await database.$disconnect(); await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect(); rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
}, 90_000);
