import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

describe('Master vocabulary additive schema', () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('An isolated *_test database is required');
  const db = new PrismaClient({ datasourceUrl: url });
  afterAll(() => db.$disconnect());

  it('provides independently versioned sources, senses, occurrences and legacy links', async () => {
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    expect(tables.map(row => row.tablename)).toEqual(expect.arrayContaining([
      'VocabularySource', 'VocabularyDocument', 'VocabularyBatch', 'VocabularySourceEntry',
      'LexicalEntry', 'LexicalSense', 'VocabularyLegacyLink', 'VocabularyCollectionVersion',
    ]));
  });

  it('enforces source occurrence identity and immutable raw provenance', async () => {
    const id = randomUUID();
    await db.$executeRaw`INSERT INTO "VocabularySource" (id, "providerName", title, "sourceUrl", "rightsStatus", "permissionReference", "allowedUses", "allowedFields", "updatedAt") VALUES (${id}::uuid, 'Synthetic', 'Schema fixture', ${`https://example.test/${id}`}, 'APPROVED', 'independently-authored-fixture', ARRAY['EXTRACT','STORE'], ARRAY['FORM'], now())`;
    const doc = randomUUID();
    await db.$executeRaw`INSERT INTO "VocabularyDocument" (id,"sourceId","cefrLevel","originalFilename",sha256,"pageCount") VALUES (${doc}::uuid,${id}::uuid,'A1','synthetic.pdf',${'a'.repeat(64)},1)`;
    const entry = randomUUID();
    await db.$executeRaw`INSERT INTO "VocabularySourceEntry" (id,"documentId","sourceEntryKey","topicInstanceKey","originalTopic","topicSequence","rowOrdinal","pageIndex",locations,"rawWord","parsedWord","rawPos","normalizedPos","cefrLevel","sourceContentHash") VALUES (${entry}::uuid,${doc}::uuid,'topic-1:1','topic-1','Synthetic',1,1,0,'[]','test','test','noun','NOUN','A1',${'b'.repeat(64)})`;
    await expect(db.$executeRaw`UPDATE "VocabularySourceEntry" SET "rawWord"='changed' WHERE id=${entry}::uuid`).rejects.toThrow();
    await expect(db.$executeRaw`DELETE FROM "VocabularySourceEntry" WHERE id=${entry}::uuid`).rejects.toThrow();
    await expect(db.$executeRaw`INSERT INTO "VocabularySourceEntry" (id,"documentId","sourceEntryKey","topicInstanceKey","originalTopic","topicSequence","rowOrdinal","pageIndex","printedPageNumber",locations,"rawWord","parsedWord","rawPos","normalizedPos","cefrLevel",pronunciation,"permittedDefinition","extractionConfidence",warnings,"sourceContentHash","createdAt") SELECT ${randomUUID()}::uuid, "documentId", "sourceEntryKey", "topicInstanceKey", "originalTopic", "topicSequence", "rowOrdinal", "pageIndex", "printedPageNumber", locations, "rawWord", "parsedWord", "rawPos", "normalizedPos", "cefrLevel", pronunciation, "permittedDefinition", "extractionConfidence", warnings, "sourceContentHash", "createdAt" FROM "VocabularySourceEntry" WHERE id=${entry}::uuid`).rejects.toThrow(/23505|already exists/iu);
    const rows = await db.$queryRaw<Array<{ rawWord: string }>>`SELECT "rawWord" FROM "VocabularySourceEntry" WHERE id=${entry}::uuid`;
    expect(rows).toEqual([{ rawWord: 'test' }]);
  });
});
