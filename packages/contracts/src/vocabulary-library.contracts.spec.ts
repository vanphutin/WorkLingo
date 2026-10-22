import { describe, expect, it } from 'vitest';
import { vocabularyInventorySchema, vocabularyQuerySchema, vocabularySourceInputSchema, vocabularyStageSchema } from './vocabulary-library.contracts.ts';

describe('Master vocabulary boundary contracts', () => {
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
