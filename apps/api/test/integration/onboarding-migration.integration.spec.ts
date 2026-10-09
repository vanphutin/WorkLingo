import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cutoffMigration = '20261009000100_system_seeded_audio';
const onboardingMigration = '20261009000200_increment_5a1_onboarding_placement';

describe('Increment 5A1 migration upgrade rehearsal', () => {
  const schemaName = `onboarding_upgrade_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let database: PrismaClient;
  let tempPrismaRoot: string;
  let schemaUrl: string;

  function deploy(): void {
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'migrate',
        'deploy',
        '--config',
        path.join(tempPrismaRoot, 'prisma.config.ts'),
        '--schema',
        path.join(tempPrismaRoot, 'schema.prisma'),
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: schemaUrl },
        timeout: 45_000,
      },
    );
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  }

  beforeAll(async () => {
    tempPrismaRoot = await mkdtemp(path.join(tmpdir(), 'worklingo-onboarding-upgrade-'));
    const tempMigrations = path.join(tempPrismaRoot, 'migrations');
    await mkdir(tempMigrations, { recursive: true });
    const sourceMigrations = path.resolve('prisma/migrations');
    const migrationNames = await readdir(sourceMigrations);
    for (const name of migrationNames.filter((entry) => /^\d/u.test(entry) && entry <= cutoffMigration)) {
      await cp(path.join(sourceMigrations, name), path.join(tempMigrations, name), { recursive: true });
    }
    await cp(path.join(sourceMigrations, 'migration_lock.toml'), path.join(tempMigrations, 'migration_lock.toml'));
    await writeFile(path.join(tempPrismaRoot, 'schema.prisma'), [
      'generator client {',
      '  provider = "prisma-client-js"',
      '}',
      'datasource db {',
      '  provider = "postgresql"',
      '  url = env("DATABASE_URL")',
      '}',
      '',
    ].join('\n'), 'utf8');
    await writeFile(path.join(tempPrismaRoot, 'prisma.config.ts'), [
      "import { defineConfig } from 'prisma/config';",
      '',
      'export default defineConfig({',
      "  schema: 'schema.prisma',",
      "  migrations: { path: 'migrations' },",
      '});',
      '',
    ].join('\n'), 'utf8');

    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    schemaUrl = url.toString();
    deploy();
    database = new PrismaClient({ datasourceUrl: schemaUrl });
    await database.$connect();
  }, 60_000);

  afterAll(async () => {
    await database?.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await admin.$disconnect();
    if (tempPrismaRoot) await rm(tempPrismaRoot, { force: true, recursive: true });
  });

  it('migrates an existing learner to complete without changing their level', async () => {
    const learnerId = randomUUID();
    await database.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."User" ("id", "email", "displayName", "passwordHash", "updatedAt")
      VALUES ('${learnerId}', 'existing-${learnerId}@example.com', 'Existing learner', 'test-hash', CURRENT_TIMESTAMP)
    `);
    await database.$executeRawUnsafe(`
      INSERT INTO "${schemaName}"."LearnerProfile" ("userId", "currentLevelCode", "updatedAt")
      VALUES ('${learnerId}', 'INTERMEDIATE_2', CURRENT_TIMESTAMP)
    `);

    const sourceMigration = path.resolve('prisma/migrations', onboardingMigration);
    expect(existsSync(sourceMigration)).toBe(true);
    await cp(sourceMigration, path.join(tempPrismaRoot, 'migrations', onboardingMigration), { recursive: true });
    deploy();

    const [profile] = await database.$queryRawUnsafe<Array<{
      currentLevelCode: string;
      onboardingMethod: string | null;
      onboardingStatus: string;
    }>>(`
      SELECT "currentLevelCode", "onboardingMethod"::text, "onboardingStatus"::text
      FROM "${schemaName}"."LearnerProfile"
      WHERE "userId" = '${learnerId}'
    `);

    expect(profile).toEqual({
      currentLevelCode: 'INTERMEDIATE_2',
      onboardingMethod: 'MIGRATED',
      onboardingStatus: 'COMPLETE',
    });

    const migrationSql = await readFile(path.join(sourceMigration, 'migration.sql'), 'utf8');
    expect(migrationSql).toContain("SET DEFAULT 'PENDING'");
  }, 60_000);
});
