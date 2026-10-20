import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

const target = '20261015000200_ielts_flow_v3';

it('upgrades legacy IELTS without changing answers, 60-minute plans, reports or grants', async () => {
  const schema = `ielts_v3_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL!;
  const url = new URL(baseUrl); url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-ielts-v3-'));
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
    const learner = await db.user.create({ data: { email: `${randomUUID()}@test.local`, displayName: 'Legacy learner', passwordHash: 'test-only' } });
    await db.learnerProfile.create({ data: { userId: learner.id, ieltsEarlyAccess: true, onboardingStatus: 'COMPLETE' } });
    const orientationId = randomUUID(), orientationVersionId = randomUUID();
    await db.$executeRaw`INSERT INTO "IeltsOrientation" ("id","slug","draftContent","updatedAt") VALUES (${orientationId}::uuid,'intro','{}',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "IeltsOrientationVersion" ("id","orientationId","version","title","sourceHash","content") VALUES (${orientationVersionId}::uuid,${orientationId}::uuid,1,'Original intro','old-hash','{}')`;
    await db.$executeRaw`INSERT INTO "OrientationProgress" ("learnerId","orientationVersionId","answers","updatedAt") VALUES (${learner.id}::uuid,${orientationVersionId}::uuid,'[{"slideId":"old","answer":"preserve"}]',CURRENT_TIMESTAMP)`;
    const profileId = randomUUID(), profileVersionId = randomUUID();
    await db.$executeRaw`INSERT INTO "IeltsIntegratedProfile" ("id","durationMinutes","draftContent","updatedAt") VALUES (${profileId}::uuid,60,'{}',CURRENT_TIMESTAMP)`;
    await db.$executeRaw`INSERT INTO "IeltsIntegratedProfileVersion" ("id","profileId","version","durationMinutes","sourceHash","content") VALUES (${profileVersionId}::uuid,${profileId}::uuid,1,60,'old-profile','{}')`;
    await db.$executeRaw`INSERT INTO "IeltsIntegratedSession" ("learnerId","clientSessionId","profileVersionId","durationMinutes","difficulty","planSnapshot","updatedAt") VALUES (${learner.id}::uuid,${randomUUID()}::uuid,${profileVersionId}::uuid,60,'foundation','{"legacy":true}',CURRENT_TIMESTAMP)`;
    const mockId = randomUUID(), mockVersionId = randomUUID();
    await db.$executeRaw`INSERT INTO "IeltsMockTest" ("id","slug","draftContent") VALUES (${mockId}::uuid,'legacy-mock','{}')`;
    await db.$executeRaw`INSERT INTO "IeltsMockTestVersion" ("id","mockTestId","version","sourceHash","content") VALUES (${mockVersionId}::uuid,${mockId}::uuid,1,'old-paper','{}')`;
    for (const mode of ['LEARNING', 'EXAM_SIMULATION']) {
      await db.$executeRaw`INSERT INTO "IeltsMockAttempt" ("learnerId","clientAttemptId","mockTestVersionId","mode","sectionDeadlineAt","responses","reportSnapshot") VALUES (${learner.id}::uuid,${randomUUID()}::uuid,${mockVersionId}::uuid,${mode},CURRENT_TIMESTAMP + interval '20 minutes','{"q1":"original answer"}','{"legacyReport":true}')`;
    }
    const snapshot = async () => ({
      profiles: await db.$queryRaw`SELECT * FROM "LearnerProfile"`,
      orientation: await db.$queryRaw`SELECT * FROM "OrientationProgress"`,
      sessions: await db.$queryRaw`SELECT * FROM "IeltsIntegratedSession"`,
      attempts: await db.$queryRaw`SELECT "id","mode","responses","reportSnapshot","sectionDeadlineAt","revision" FROM "IeltsMockAttempt" ORDER BY "id"`,
    });
    const before = await snapshot();
    run(['db', 'execute', '--file', path.resolve('prisma/migrations', target, 'migration.sql'), '--url', url.toString()]);
    expect(await snapshot()).toEqual(before);
    expect(await db.$queryRaw`SELECT "policyVersion","elapsedMs","pausedAt" FROM "IeltsMockAttempt"`).toEqual([
      { policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null }, { policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null },
    ]);
    run(['db','execute','--file',path.resolve('prisma/migrations/20261015000300_ielts_mock_media/migration.sql'),'--url',url.toString()]);
    const [oldAttempt]=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM "IeltsMockAttempt" ORDER BY id LIMIT 1`;
    const leaseId=randomUUID();
    await db.$executeRaw`INSERT INTO "IeltsMockPlayback" (id,"attemptId","assetId","clientPlayId","durationSeconds","createdAt","expiresAt") VALUES (${leaseId}::uuid,${oldAttempt!.id}::uuid,${randomUUID()}::uuid,${randomUUID()}::uuid,20,TIMESTAMP '2026-10-15 10:00:00',TIMESTAMP '2026-10-15 10:01:00')`;
    run(['db','execute','--file',path.resolve('prisma/migrations/20261015000400_ielts_playback_activation/migration.sql'),'--url',url.toString()]);
    const [lease]=await db.$queryRaw<Array<{createdAt:Date;activatedAt:Date}>>`SELECT "createdAt","activatedAt" FROM "IeltsMockPlayback" WHERE id=${leaseId}::uuid`;
    expect(lease!.activatedAt).toEqual(lease!.createdAt);
    expect(await snapshot()).toEqual(before);
    expect(await db.$queryRaw`SELECT count(*)::int AS n FROM "IeltsIntroductionVisit"`).toEqual([{ n: 0 }]);
    await db.$executeRaw`INSERT INTO "IeltsIntroductionVisit" ("learnerId","orientationVersionId") VALUES (${learner.id}::uuid,${orientationVersionId}::uuid)`;
    await expect(db.$executeRaw`INSERT INTO "IeltsIntroductionVisit" ("learnerId","orientationVersionId") VALUES (${learner.id}::uuid,${orientationVersionId}::uuid)`).rejects.toThrow();
    await expect(db.$executeRaw`INSERT INTO "IeltsIntroductionVisit" ("learnerId","orientationVersionId") VALUES (${learner.id}::uuid,${randomUUID()}::uuid)`).rejects.toThrow();
    const topicId = randomUUID(), topicVersionId = randomUUID();
    await db.$executeRaw`INSERT INTO "IeltsTopic" ("id","slug","draftContent") VALUES (${topicId}::uuid,'education','{}')`;
    await db.$executeRaw`INSERT INTO "IeltsTopicVersion" ("id","topicId","version","content","sourceHash") VALUES (${topicVersionId}::uuid,${topicId}::uuid,1,'{"title":"Education"}','topic-hash')`;
    await expect(db.$executeRaw`UPDATE "IeltsTopicVersion" SET "content"='{}' WHERE "id"=${topicVersionId}::uuid`).rejects.toThrow();
    await expect(db.$executeRaw`INSERT INTO "IeltsTopicSession" ("sessionId","topicVersionId","packSlug") VALUES (${randomUUID()}::uuid,${topicVersionId}::uuid,'foundation')`).rejects.toThrow();
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
    // mkdtemp creates this exact test-owned directory; no user paths enter cleanup.
    rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}, 90_000);
