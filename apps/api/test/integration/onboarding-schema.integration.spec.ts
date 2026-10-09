import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedFoundationCurriculum } from '../../src/curriculum/infrastructure/seed-foundation.js';

describe('Increment 5A1 onboarding and placement schema', () => {
  const schemaName = `onboarding_schema_${randomUUID().replaceAll('-', '')}`;
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

  it('creates purpose-bound placement persistence with ownership indexes', async () => {
    const enumRows = await database.$queryRaw<Array<{ typname: string }>>`
      SELECT typname
      FROM pg_type
      WHERE typname IN ('OnboardingStatus', 'OnboardingMethod', 'MissionPurpose', 'PlacementAttemptStatus');
    `;
    expect(new Set(enumRows.map((row) => row.typname))).toEqual(new Set([
      'MissionPurpose',
      'OnboardingMethod',
      'OnboardingStatus',
      'PlacementAttemptStatus',
    ]));

    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND indexname IN (
          'PlacementAttempt_learnerId_clientAttemptId_key',
          'PlacementAttempt_learningSessionId_key',
          'PlacementAttempt_learnerId_status_updatedAt_idx'
        );
    `;
    expect(new Set(indexes.map((row) => row.indexname))).toEqual(new Set([
      'PlacementAttempt_learnerId_clientAttemptId_key',
      'PlacementAttempt_learningSessionId_key',
      'PlacementAttempt_learnerId_status_updatedAt_idx',
    ]));
  });

  it('defaults a new learner to pending onboarding', async () => {
    const newLearner = await database.user.create({
      data: {
        displayName: 'New learner',
        email: `onboarding-${randomUUID()}@example.com`,
        passwordHash: 'test-hash',
        profile: { create: {} },
      },
      include: { profile: true },
    });

    expect(newLearner.profile?.onboardingStatus).toBe('PENDING');
    expect(newLearner.profile?.onboardingMethod).toBeNull();
  });

  it('binds a placement attempt to its learner, session, and immutable lesson version', async () => {
    await seedFoundationCurriculum(database);
    const learner = await database.user.create({
      data: {
        displayName: 'Placement learner',
        email: `placement-${randomUUID()}@example.com`,
        passwordHash: 'test-hash',
        profile: { create: {} },
      },
    });
    const mission = await database.mission.findFirstOrThrow({
      include: {
        lessons: { include: { lesson: true }, orderBy: { order: 'asc' }, take: 1 },
      },
      where: { status: 'PUBLISHED' },
    });
    const lessonVersionId = mission.lessons[0]!.lesson.currentPublishedVersionId!;
    const session = await database.learningSession.create({
      data: {
        clientSessionId: randomUUID(),
        durationMinutes: 45,
        learnerId: learner.id,
        lessonVersionId,
        missionId: mission.id,
        planSnapshot: {},
      },
    });
    const placementAttempt = await database.placementAttempt.create({
      data: {
        clientAttemptId: randomUUID(),
        learnerId: learner.id,
        learningSessionId: session.id,
        lessonVersionId,
        skillResults: {},
      },
    });

    expect(placementAttempt.learningSessionId).toBe(session.id);
    expect(placementAttempt.lessonVersionId).toBe(session.lessonVersionId);
  });
});
