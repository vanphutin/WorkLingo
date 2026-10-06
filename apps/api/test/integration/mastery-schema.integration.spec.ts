import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Mastery Schema and Migration Integration', () => {
  const schemaName = `mastery_schema_test_${randomUUID().replaceAll('-', '')}`;
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

  it('proves that MasteryRecord and MasteryEvent models and enum types exist in database', async () => {
    expect(database.masteryRecord).toBeDefined();
    expect(database.masteryEvent).toBeDefined();

    const enumTypes = await database.$queryRaw<Array<{ typname: string }>>`
      SELECT typname FROM pg_type WHERE typname IN ('MasteryState', 'MasteryEventType');
    `;
    const names = enumTypes.map((e) => e.typname);
    expect(names).toContain('MasteryState');
    expect(names).toContain('MasteryEventType');
  });

  it('backfills stable blocks for lessons published before mastery was introduced', async () => {
    const slug = `historical-${randomUUID()}`;
    const bank = await database.wordBank.create({
      data: { slug: `historical-bank-${randomUUID()}`, name: 'Historical Bank' },
    });
    const bankVersion = await database.wordBankVersion.create({
      data: { wordBankId: bank.id, name: bank.name, sourceHash: randomUUID(), version: 1 },
    });
    await database.languageBlockVersion.create({
      data: {
        wordBankVersionId: bankVersion.id,
        slug,
        canonicalForm: 'follow up',
        meaning: 'theo dõi',
        pronunciation: '/ˈfɒləʊ ʌp/',
        collocations: ['follow up with'],
        grammarPattern: 'follow up with + person',
        examples: ['Please follow up with the customer.'],
        commonErrors: [],
        cefrLevel: 'B1',
        transferContexts: ['customer service'],
      },
    });
    await expect(database.languageBlock.findUnique({ where: { slug } })).resolves.toBeNull();

    const backfillSql = readFileSync(
      path.resolve('prisma/migrations/20261006000300_mastery_canonical_backfill/migration.sql'),
      'utf8',
    );
    await database.$executeRawUnsafe(backfillSql);

    await expect(database.languageBlock.findUnique({ where: { slug } })).resolves.toMatchObject({
      slug,
      wordBankId: bank.id,
      canonicalForm: 'follow up',
    });
  });
});
