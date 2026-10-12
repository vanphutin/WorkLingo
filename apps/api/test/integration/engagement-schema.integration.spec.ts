import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Increment 5A2 engagement and consistency schema', () => {
  const schemaName = `engagement_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: url.toString() },
      timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.$connect();
  }, 50_000);

  afterAll(async () => {
    await database?.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
  });

  it('proves engagement projection tables, enums, defaults, and uniqueness constraints', async () => {
    // 1. Check EngagementWeekStatus enum
    const enumRows = await database.$queryRaw<Array<{ typname: string }>>`
      SELECT typname
      FROM pg_type
      WHERE typname = 'EngagementWeekStatus';
    `;
    expect(new Set(enumRows.map((row) => row.typname))).toEqual(new Set(['EngagementWeekStatus']));

    // 2. Check indexes and unique constraints
    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND indexname IN (
          'LearnerStudyDay_learnerId_dateKey_key',
          'LearnerStudySession_sessionId_key',
          'LearnerEngagementWeek_learnerId_weekStartKey_key'
        );
    `;
    const indexNames = indexes.map((row) => row.indexname);
    expect(indexNames).toContain('LearnerStudyDay_learnerId_dateKey_key');
    expect(indexNames).toContain('LearnerStudySession_sessionId_key');
    expect(indexNames).toContain('LearnerEngagementWeek_learnerId_weekStartKey_key');

    // 3. Check LearnerProfile default weeklyTargetDays is 3
    const user = await database.user.create({
      data: {
        displayName: 'Engagement Schema Learner',
        email: `engagement-${randomUUID()}@example.com`,
        passwordHash: 'dummy-hash',
        profile: {
          create: {},
        },
      },
      include: {
        profile: true,
      },
    });

    expect((user.profile as Record<string, unknown> | null)?.['weeklyTargetDays']).toBe(3);

    // 4. Check uniqueness constraint enforcement for LearnerStudyDay (learnerId, dateKey)
    await (database as unknown as { learnerStudyDay: { create: (args: unknown) => Promise<unknown> } }).learnerStudyDay.create({
      data: {
        completedSessionCount: 1,
        dateKey: '2026-10-12',
        firstCompletedAt: new Date(),
        lastCompletedAt: new Date(),
        learnerId: user.id,
        timezone: 'Asia/Ho_Chi_Minh',
      },
    });

    await expect(
      (database as unknown as { learnerStudyDay: { create: (args: unknown) => Promise<unknown> } }).learnerStudyDay.create({
        data: {
          completedSessionCount: 2,
          dateKey: '2026-10-12',
          firstCompletedAt: new Date(),
          lastCompletedAt: new Date(),
          learnerId: user.id,
          timezone: 'Asia/Ho_Chi_Minh',
        },
      }),
    ).rejects.toThrow();

    // 5. Check uniqueness constraint enforcement for LearnerEngagementWeek (learnerId, weekStartKey)
    await (database as unknown as { learnerEngagementWeek: { create: (args: unknown) => Promise<unknown> } }).learnerEngagementWeek.create({
      data: {
        learnerId: user.id,
        status: 'ACTIVE',
        targetDays: 3,
        timezone: 'Asia/Ho_Chi_Minh',
        weekStartKey: '2026-10-12',
      },
    });

    await expect(
      (database as unknown as { learnerEngagementWeek: { create: (args: unknown) => Promise<unknown> } }).learnerEngagementWeek.create({
        data: {
          learnerId: user.id,
          status: 'MET',
          targetDays: 4,
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-12',
        },
      }),
    ).rejects.toThrow();
  });
});
