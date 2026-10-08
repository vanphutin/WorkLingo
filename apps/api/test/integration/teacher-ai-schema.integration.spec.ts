import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Teacher AI schema and migration integration', () => {
  const schemaName = `teacher_ai_schema_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;
  let schemaCreated = false;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: url.toString() },
      encoding: 'utf8',
      timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.$connect();
    schemaCreated = true;
  }, 50_000);

  afterAll(async () => {
    await database?.$disconnect();
    if (schemaCreated) {
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    }
    await admin.$disconnect();
  });

  it('creates the recording, evaluation, draft, and job-attempt tables', async () => {
    const rows = await database.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}
        AND table_name IN ('Recording', 'EvaluationResult', 'ActivityDraft', 'JobAttempt')
      ORDER BY table_name;
    `;

    expect(rows.map((row) => row.table_name)).toEqual([
      'ActivityDraft', 'EvaluationResult', 'JobAttempt', 'Recording',
    ]);
  });

  it('enforces immutable identities and generalized job idempotency', async () => {
    const indexes = await database.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND indexname IN (
          'Recording_attemptId_key',
          'EvaluationResult_attemptId_rubricVersion_key',
          'ActivityDraft_learnerId_sessionId_activityId_key',
          'Job_idempotencyKey_key'
        );
    `;
    expect(new Set(indexes.map((row) => row.indexname))).toEqual(new Set([
      'Recording_attemptId_key',
      'EvaluationResult_attemptId_rubricVersion_key',
      'ActivityDraft_learnerId_sessionId_activityId_key',
      'Job_idempotencyKey_key',
    ]));

    const columns = await database.$queryRaw<Array<{ column_name: string; is_nullable: string }>>`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = ${schemaName}
        AND table_name = 'Job'
        AND column_name IN (
          'idempotencyKey', 'attemptCount', 'maxAttempts', 'availableAt',
          'leaseOwner', 'leaseExpiresAt', 'retryable', 'errorCode', 'errorSummary'
        );
    `;
    expect(columns).toHaveLength(9);
    expect(columns.find((column) => column.column_name === 'idempotencyKey')?.is_nullable).toBe('NO');
  });

  it('uses the required cascade and restrictive ownership relations', async () => {
    const foreignKeys = await database.$queryRaw<Array<{
      table_name: string;
      foreign_table_name: string;
      delete_rule: string;
    }>>`
      SELECT
        tc.table_name,
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_schema = tc.constraint_schema
       AND rc.constraint_name = tc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_schema = tc.constraint_schema
       AND ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_schema = ${schemaName}
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('Recording', 'EvaluationResult', 'ActivityDraft', 'JobAttempt');
    `;

    expect(foreignKeys).toEqual(expect.arrayContaining([
      { table_name: 'Recording', foreign_table_name: 'ActivityAttempt', delete_rule: 'CASCADE' },
      { table_name: 'Recording', foreign_table_name: 'Activity', delete_rule: 'RESTRICT' },
      { table_name: 'EvaluationResult', foreign_table_name: 'ActivityAttempt', delete_rule: 'CASCADE' },
      { table_name: 'EvaluationResult', foreign_table_name: 'LessonVersion', delete_rule: 'RESTRICT' },
      { table_name: 'ActivityDraft', foreign_table_name: 'Activity', delete_rule: 'RESTRICT' },
      { table_name: 'JobAttempt', foreign_table_name: 'Job', delete_rule: 'CASCADE' },
    ]));
  });

  it('keeps existing content-audio rows readable', async () => {
    const adminUser = await database.user.create({
      data: {
        email: `teacher-ai-${randomUUID()}@example.com`,
        displayName: 'Teacher AI migration admin',
        passwordHash: 'test-hash',
        role: 'CONTENT_ADMIN',
      },
    });
    const contentImport = await database.contentImport.create({
      data: {
        rawSource: 'FORMAT: WorkLingoLesson/1.0',
        sourceHash: randomUUID(),
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
    });
    const audio = await database.audioArtifact.create({
      data: {
        contentImportId: contentImport.id,
        audioScriptSlug: 'migration-check',
        scriptHash: randomUUID(),
        adapterName: 'fake',
        voiceConfig: {},
        mimeType: 'audio/wav',
        byteSize: 44,
        checksum: randomUUID(),
        storageKey: `migration/${randomUUID()}.wav`,
        status: 'READY',
      },
    });

    await expect(database.audioArtifact.findUnique({ where: { id: audio.id } }))
      .resolves.toMatchObject({ id: audio.id, status: 'READY' });
  });
});
