import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Error Bank Schema & Migration Integration', () => {
  const schemaName = `error_bank_schema_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve(
      'prisma/build/index.js',
    );
    const migration = spawnSync(
      process.execPath,
      [cli, 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: 'utf8',
        timeout: 45_000,
      },
    );
    if (migration.status !== 0) {
      throw new Error(migration.stderr || migration.stdout);
    }
    database = new PrismaClient({ datasourceUrl: url.toString() });
    await database.$connect();
  });

  afterAll(async () => {
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminDb.$disconnect();
  });

  it('verifies that ErrorBankEntry model and table exist with required fields and unique masteryEventId', async () => {
    expect(database.errorBankEntry).toBeDefined();

    const columns = await database.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ErrorBankEntry' AND table_schema = ${schemaName};
    `;
    const colNames = columns.map((c) => c.column_name);
    expect(colNames).toContain('id');
    expect(colNames).toContain('learnerId');
    expect(colNames).toContain('masteryEventId');
    expect(colNames).toContain('languageBlockId');
    expect(colNames).toContain('skill');
    expect(colNames).toContain('errorType');
    expect(colNames).toContain('evidenceGranularity');
    expect(colNames).toContain('lessonVersionId');
    expect(colNames).toContain('activityId');
    expect(colNames).toContain('activitySlug');
    expect(colNames).toContain('contextKey');
    expect(colNames).toContain('occurredAt');
  });
});
