import { describe, expect, it } from 'vitest';
import { vocabularyDocumentInputSchema, vocabularyInventorySchema, vocabularyQuerySchema, vocabularySourceInputSchema, vocabularyStageSchema, vocabularySourceRowSchema } from './vocabulary-library.contracts.ts';

describe('Master vocabulary boundary contracts', () => {
  it('retains TXT line provenance without confusing logical sections with PDF pages', () => {
    const document = { sourceId: '00000000-0000-4000-8000-000000000001', cefrLevel: 'A1', originalFilename: 'fixture.txt', sha256: 'a'.repeat(64), pageCount: 1, sourceFormat: 'TXT' };
    expect(vocabularyDocumentInputSchema.parse(document).sourceFormat).toBe('TXT');
    const row = { sourceEntryKey: 'topic-1:1', topicInstanceKey: 'topic-1', originalTopic: 'Fixture', topicSequence: 1, rowOrdinal: 1, pageIndex: 0, locations: [{ pageIndex: 0, bbox: [0, 10, 1, 13] }], rawWord: 'fixture', parsedWord: 'fixture', rawPos: '(n.)', normalizedPos: 'NOUN', cefrLevel: 'A1', sourceLineStart: 10, sourceLineEnd: 12 };
    expect(vocabularySourceRowSchema.parse(row)).toMatchObject({ sourceLineStart: 10, sourceLineEnd: 12 });
    expect(vocabularySourceRowSchema.safeParse({ ...row, sourceLineEnd: 9 }).success).toBe(false);
    expect(vocabularySourceRowSchema.safeParse({ ...row, sourceLineEnd: undefined }).success).toBe(false);
    expect(vocabularySourceRowSchema.safeParse({ ...row, sourceLineStart: null, sourceLineEnd: null }).success).toBe(true);
  });
  it('bounds pagination and rejects unknown query parameters', () => {
    expect(vocabularyQuerySchema.parse({ page: '2', limit: '25' })).toMatchObject({ page: 2, limit: 25 });
    expect(vocabularyQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(vocabularyQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(vocabularyQuerySchema.safeParse({ includeAll: true }).success).toBe(false);
  });
  it('registers metadata without letting the client approve its own rights', () => {
    const source = { providerName: 'Synthetic', title: 'Fixture', sourceUrl: 'https://example.test/fixture' };
    expect(vocabularySourceInputSchema.safeParse(source).success).toBe(true);
    expect(vocabularySourceInputSchema.safeParse({ ...source, rightsStatus: 'APPROVED' }).success).toBe(false);
  });
  it('requires explicit page coverage rather than trusting a total count', () => {
    expect(vocabularyInventorySchema.safeParse({ pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }] }).success).toBe(true);
    expect(vocabularyInventorySchema.safeParse({ detectedRows: 1 }).success).toBe(false);
  });
  it('bounds each staging request to 250 source rows', () => {
    expect(vocabularyStageSchema.safeParse({ revision: 1, rows: [] }).success).toBe(false);
  });
  it('retains an evidenced source pronunciation dialect and defaults absent evidence to und', () => {
    const source = { providerName: 'Synthetic', title: 'Dialect fixture', sourceUrl: 'https://example.test/dialect' };
    expect(vocabularySourceInputSchema.parse(source)).toMatchObject({ pronunciationDialect: 'und' });
    expect(vocabularySourceInputSchema.parse({ ...source, pronunciationDialect: 'en-US' })).toMatchObject({ pronunciationDialect: 'en-US' });
    expect(vocabularySourceInputSchema.safeParse({ ...source, pronunciationDialect: 'invented' }).success).toBe(false);
  });
});
