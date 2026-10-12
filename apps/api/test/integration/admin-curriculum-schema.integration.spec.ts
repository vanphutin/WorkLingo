import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Admin Curriculum and Audit Schema Integration', () => {
  const schemaName = `admin_curriculum_schema_${randomUUID().replaceAll('-', '')}`;
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

  it('persists revision field defaulting to 1 on LearningPath, Level, Mission, and MissionLesson, and Level.status ContentStatus', async () => {
    // 1. Check LearningPath revision
    const path = await database.learningPath.create({
      data: {
        name: 'General Business English',
        slug: `path-${randomUUID()}`,
      },
    });
    expect(path.revision).toBe(1);
    expect(path.status).toBe('DRAFT');
    expect(path.programId).toBe('10000000-0000-4000-8000-000000000002');

    // 2. Check Level revision and status
    const level = await database.level.create({
      data: {
        cefrReference: 'A1',
        code: `LVL_${randomUUID().slice(0, 8).toUpperCase()}`,
        name: 'Foundation Level 1',
        order: 1,
        pathId: path.id,
      },
    });
    expect(level.revision).toBe(1);
    expect(level.status).toBe('DRAFT');

    // 3. Check Mission revision and purpose
    const mission = await database.mission.create({
      data: {
        levelId: level.id,
        objective: 'Practice greetings',
        order: 1,
        slug: `mission-${randomUUID()}`,
        title: 'Meeting Team',
      },
    });
    expect(mission.revision).toBe(1);
    expect(mission.purpose).toBe('LEARNING');
    expect(mission.status).toBe('DRAFT');

    // 4. Check MissionLesson revision
    const lesson = await database.lesson.create({
      data: {
        slug: `lesson-${randomUUID()}`,
      },
    });
    const missionLesson = await database.missionLesson.create({
      data: {
        lessonId: lesson.id,
        missionId: mission.id,
        order: 1,
      },
    });
    expect(missionLesson.revision).toBe(1);
  });

  it('proves AuditLog indexes for cursor and filtering exist in the database schema', async () => {
    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND tablename = 'AuditLog';
    `;
    const indexNames = indexes.map((row) => row.indexname);
    expect(indexNames).toContain('AuditLog_createdAt_id_idx');
    expect(indexNames).toContain('AuditLog_action_createdAt_idx');
    expect(indexNames).toContain('AuditLog_resourceType_createdAt_idx');
    expect(indexNames).toContain('AuditLog_actorId_createdAt_idx');
  });
});
