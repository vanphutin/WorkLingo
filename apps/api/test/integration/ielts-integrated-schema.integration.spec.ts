import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261013000400_ielts_integrated_practice';
const timerTarget = '20261013000500_ielts_integrated_block_timer';

it('adds immutable configurable profiles and version-bound integrated sessions', async () => {
  const schema = `integrated_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl); url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-integrated-'));
  const prisma = path.join(root, 'prisma'); mkdirSync(path.join(prisma, 'migrations'), { recursive: true });
  cpSync('prisma/schema.prisma', path.join(prisma, 'schema.prisma'));
  for (const entry of readdirSync('prisma/migrations')) {
    if (entry !== 'migration_lock.toml' && entry >= target) continue;
    cpSync(path.join('prisma/migrations', entry), path.join(prisma, 'migrations', entry), { recursive: true });
  }
  const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
  const run = (args: string[]) => {
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 60_000 });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  };
  try {
    run(['migrate', 'deploy', '--schema', path.join(prisma, 'schema.prisma')]);
    const learner = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Legacy', passwordHash: 'test-only' } });
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);
    const profileId = randomUUID(); const profileVersionId = randomUUID();
    const content = JSON.stringify({ durationMinutes: 60, allocations: [{ skill: 'listening', targetMinutes: 15 }, { skill: 'reading', targetMinutes: 15 }, { skill: 'writing', targetMinutes: 20 }, { skill: 'speaking', targetMinutes: 10 }] });
    await database.$executeRaw`INSERT INTO "IeltsIntegratedProfile" ("id","durationMinutes","draftContent","updatedAt") VALUES (${profileId}::uuid,60,${content}::jsonb,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsIntegratedProfileVersion" ("id","profileId","version","durationMinutes","sourceHash","content") VALUES (${profileVersionId}::uuid,${profileId}::uuid,1,60,'hash',${content}::jsonb)`;
    await database.$executeRaw`UPDATE "IeltsIntegratedProfile" SET "currentPublishedVersionId"=${profileVersionId}::uuid,"status"='PUBLISHED' WHERE "id"=${profileId}::uuid`;
    await expect(database.$executeRaw`UPDATE "IeltsIntegratedProfileVersion" SET "content"='{}' WHERE "id"=${profileVersionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "IeltsIntegratedSession" ("learnerId","clientSessionId","profileVersionId","durationMinutes","difficulty","planSnapshot","updatedAt") VALUES (${learner.id}::uuid,${randomUUID()}::uuid,${profileVersionId}::uuid,45,'foundation','{}',CURRENT_TIMESTAMP)`).rejects.toThrow();
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', timerTarget, 'migration.sql'), '--url', url.toString()]);
    const timerColumns = await database.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema=${schema} AND table_name='IeltsIntegratedSessionBlock' AND column_name='startedAt'`;
    expect(timerColumns).toEqual([{ column_name: 'startedAt' }]);
    expect(await database.user.count()).toBe(1);
  } finally {
    await database.$disconnect(); await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect();
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 90_000);
