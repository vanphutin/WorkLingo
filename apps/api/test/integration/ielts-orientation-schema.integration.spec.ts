import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261013000200_ielts_orientation';

it('adds immutable orientation releases and version-bound learner progress without changing users', async () => {
  const schema = `orientation_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-orientation-'));
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

    const orientationId = randomUUID();
    const versionId = randomUUID();
    const progressId = randomUUID();
    const draft = JSON.stringify({ title: 'IELTS Orientation', description: 'Start here', slides: [] });
    await database.$executeRaw`INSERT INTO "IeltsOrientation" ("id","slug","draftContent","updatedAt") VALUES (${orientationId}::uuid,'ielts-orientation',${draft}::jsonb,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsOrientationVersion" ("id","orientationId","version","title","sourceHash","content") VALUES (${versionId}::uuid,${orientationId}::uuid,1,'IELTS Orientation','hash-1',${draft}::jsonb)`;
    await database.$executeRaw`UPDATE "IeltsOrientation" SET "currentPublishedVersionId"=${versionId}::uuid,"status"='PUBLISHED' WHERE "id"=${orientationId}::uuid`;
    await database.$executeRaw`INSERT INTO "OrientationProgress" ("id","learnerId","orientationVersionId","answers","updatedAt") VALUES (${progressId}::uuid,${learner.id}::uuid,${versionId}::uuid,'[]',CURRENT_TIMESTAMP)`;

    await expect(database.$executeRaw`UPDATE "IeltsOrientationVersion" SET "content"='{}' WHERE "id"=${versionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`DELETE FROM "IeltsOrientationVersion" WHERE "id"=${versionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "OrientationProgress" ("learnerId","orientationVersionId","answers","updatedAt") VALUES (${learner.id}::uuid,${versionId}::uuid,'[]',CURRENT_TIMESTAMP)`).rejects.toThrow();
    expect(await database.user.count()).toBe(1);
  } finally {
    await database.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 90_000);
