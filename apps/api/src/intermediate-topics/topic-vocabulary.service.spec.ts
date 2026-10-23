import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { TopicVocabularyService } from './topic-vocabulary.service.js';
describe('Bounded, approved vocabulary for AI difficulty', () => {
  it.each([['easy', ['A1']], ['medium', ['A2', 'A1']], ['hard', ['B1', 'A2', 'A1']]] as const)('uses only the permitted levels for %s', async (difficulty, levels) => {
    const queries: unknown[] = [];
    const findMany = vi.fn(async (query: { where: { sourceEntry: { cefrLevel: string } }; take: number }) => {
      queries.push(query);
      return Array.from({ length: query.take }, (_, i) => ({ sourceEntryId: `${query.where.sourceEntry.cefrLevel}-${i}`, lexicalEntryId: `${query.where.sourceEntry.cefrLevel}-${i}`, senseId: `${query.where.sourceEntry.cefrLevel}-${i}`,
        entry: { canonicalForm: `word-${query.where.sourceEntry.cefrLevel}-${i}` }, sense: { definition: 'Fixture definition' },
        sourceEntry: { cefrLevel: query.where.sourceEntry.cefrLevel, document: { source: { attributionRequirements: 'Fixture' } } } }));
    });
    const module = await Test.createTestingModule({ providers: [TopicVocabularyService, { provide: PrismaService, useValue: { vocabularyEntryResolution: { findMany } } }] }).compile();
    const result = await module.get(TopicVocabularyService).select('topic-id', difficulty);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result.length).toBeGreaterThan(0);
    expect([...new Set(result.map(row => row.cefrLevel))]).toEqual([...levels]);
    for (const query of queries) expect(query).toMatchObject({ where: { sourceEntry: { warnings: { isEmpty: true }, batches: { some: { validationState: 'VALIDATED' } }, document: { source: { rightsStatus: 'APPROVED', allowedUses: { hasEvery: ['EXTRACT', 'STORE', 'MODIFY', 'TRANSLATE'] } } } }, sense: { editorialStatus: 'REVIEWED' }, entry: { editorialStatus: 'REVIEWED' } } });
  });
  it('does not label an A1-only pool as hard when B1 is unavailable', async () => {
    const findMany = vi.fn(async (query: { where: { sourceEntry: { cefrLevel: string } } }) => query.where.sourceEntry.cefrLevel === 'A1' ? [{ sourceEntryId: 'source', lexicalEntryId: 'entry', senseId: 'sense', entry: { canonicalForm: 'hello' }, sense: { definition: 'Greeting' }, sourceEntry: { cefrLevel: 'A1', document: { source: { attributionRequirements: '' } } } }] : []);
    const module = await Test.createTestingModule({ providers: [TopicVocabularyService, { provide: PrismaService, useValue: { vocabularyEntryResolution: { findMany } } }] }).compile();
    await expect(module.get(TopicVocabularyService).select('topic-id', 'hard')).rejects.toMatchObject({ status: 422 });
  });
  it('fails clearly when the selected difficulty has no reviewed library vocabulary', async () => {
    const module = await Test.createTestingModule({ providers: [TopicVocabularyService, { provide: PrismaService, useValue: { vocabularyEntryResolution: { findMany: vi.fn(async () => []) } } }] }).compile();
    await expect(module.get(TopicVocabularyService).select('topic-id', 'easy')).rejects.toMatchObject({ status: 422, response: { code: 'TOPIC_VOCABULARY_UNAVAILABLE' } });
  });
});
