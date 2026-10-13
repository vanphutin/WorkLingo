import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261013000300_ielts_bridge';

it('adds immutable bridge releases and module-bound learner progress without changing users', async () => {
  const schema = `bridge_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-bridge-'));
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
      cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 60_000,
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  };

  try {
    run(['migrate', 'deploy', '--schema', path.join(prisma, 'schema.prisma')]);
    const learner = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Legacy', passwordHash: 'test-only' } });
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);

    const listeningModuleId = randomUUID();
    const readingModuleId = randomUUID();
    const listeningVersionId = randomUUID();
    const replacementVersionId = randomUUID();
    const readingVersionId = randomUUID();
    const content = JSON.stringify({ title: 'Bridge module', stages: [] });

    await database.$executeRaw`INSERT INTO "IeltsBridgeModule" ("id","slug","draftContent","updatedAt") VALUES (${listeningModuleId}::uuid,'listening-form-completion',${content}::jsonb,CURRENT_TIMESTAMP), (${readingModuleId}::uuid,'reading-tfng',${content}::jsonb,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsBridgeModuleVersion" ("id","moduleId","version","title","skill","questionType","required","sourceHash","content") VALUES (${listeningVersionId}::uuid,${listeningModuleId}::uuid,1,'Form completion','LISTENING','listening_form_completion',TRUE,'hash-1',${content}::jsonb), (${replacementVersionId}::uuid,${listeningModuleId}::uuid,2,'Form completion v2','LISTENING','listening_form_completion',TRUE,'hash-2',${content}::jsonb), (${readingVersionId}::uuid,${readingModuleId}::uuid,1,'TFNG','READING','reading_tfng',TRUE,'hash-3',${content}::jsonb)`;
    await database.$executeRaw`UPDATE "IeltsBridgeModule" SET "currentPublishedVersionId"=${listeningVersionId}::uuid,"status"='PUBLISHED' WHERE "id"=${listeningModuleId}::uuid`;
    await database.$executeRaw`INSERT INTO "IeltsBridgeProgress" ("learnerId","moduleId","moduleVersionId","stageResults","updatedAt") VALUES (${learner.id}::uuid,${listeningModuleId}::uuid,${listeningVersionId}::uuid,'[]',CURRENT_TIMESTAMP)`;

    await expect(database.$executeRaw`UPDATE "IeltsBridgeModuleVersion" SET "content"='{}' WHERE "id"=${listeningVersionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`DELETE FROM "IeltsBridgeModuleVersion" WHERE "id"=${replacementVersionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`UPDATE "IeltsBridgeModule" SET "currentPublishedVersionId"=${readingVersionId}::uuid WHERE "id"=${listeningModuleId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "IeltsBridgeProgress" ("learnerId","moduleId","moduleVersionId","stageResults","updatedAt") VALUES (${learner.id}::uuid,${listeningModuleId}::uuid,${replacementVersionId}::uuid,'[]',CURRENT_TIMESTAMP)`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "IeltsBridgeProgress" ("learnerId","moduleId","moduleVersionId","stageResults","updatedAt") VALUES (${learner.id}::uuid,${listeningModuleId}::uuid,${readingVersionId}::uuid,'[]',CURRENT_TIMESTAMP)`).rejects.toThrow();

    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE schemaname=${schema} AND tablename IN ('IeltsBridgeModuleVersion','IeltsBridgeProgress')`;
    expect(indexes.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
      'IeltsBridgeModuleVersion_moduleId_status_idx',
      'IeltsBridgeProgress_learnerId_moduleId_key',
      'IeltsBridgeProgress_moduleVersionId_moduleId_idx',
      'IeltsBridgeProgress_learnerId_completedAt_idx',
    ]));
    expect(await database.user.count()).toBe(1);
  } finally {
    await database.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 90_000);
