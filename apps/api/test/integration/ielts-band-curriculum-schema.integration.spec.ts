import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261014000100_ielts_band_curriculum';

it('adds immutable band curriculum versions and owner-scoped journeys', async () => {
  const schema = `band_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const url = new URL(baseUrl); url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const database = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-band-'));
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
    const learner = await database.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Band learner', passwordHash: 'test-only' } });
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);
    const curriculumId = randomUUID(); const versionId = randomUUID(); const content = JSON.stringify({ schemaVersion: 1, stages: [] });
    await database.$executeRaw`INSERT INTO "IeltsBandCurriculum" ("id","draftContent","updatedAt") VALUES (${curriculumId}::uuid,${content}::jsonb,CURRENT_TIMESTAMP)`;
    await database.$executeRaw`INSERT INTO "IeltsBandCurriculumVersion" ("id","curriculumId","version","sourceHash","content") VALUES (${versionId}::uuid,${curriculumId}::uuid,1,'hash',${content}::jsonb)`;
    await database.$executeRaw`UPDATE "IeltsBandCurriculum" SET "currentPublishedVersionId"=${versionId}::uuid,"status"='PUBLISHED' WHERE "id"=${curriculumId}::uuid`;
    await expect(database.$executeRaw`UPDATE "IeltsBandCurriculumVersion" SET "content"='{}' WHERE "id"=${versionId}::uuid`).rejects.toThrow();
    await expect(database.$executeRaw`INSERT INTO "IeltsBandJourney" ("learnerId","clientJourneyId","curriculumVersionId","currentStageCode","targetBand","updatedAt") VALUES (${learner.id}::uuid,${randomUUID()}::uuid,${versionId}::uuid,'foundation_to_3',10,CURRENT_TIMESTAMP)`).rejects.toThrow();
    expect(await database.user.count()).toBe(1);
  } finally {
    await database.$disconnect(); await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.$disconnect();
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 90_000);
