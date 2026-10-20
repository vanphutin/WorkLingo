import { describe, expect, it } from 'vitest';
import { vocabularyPublicationSelectionSchema } from './vocabulary-publication.contracts.ts';
describe('Vocabulary publication decisions', () => {
  it('requires an ID only for reuse and rejects automatic or duplicate decisions', () => {
    expect(vocabularyPublicationSelectionSchema.safeParse({ reviewHash: 'hash', choices: [{ sourceSlug: 'book', action: 'reuse' }] }).success).toBe(false);
    expect(vocabularyPublicationSelectionSchema.safeParse({ reviewHash: 'hash', choices: [{ sourceSlug: 'book', action: 'new' }] }).success).toBe(true);
    expect(vocabularyPublicationSelectionSchema.safeParse({ reviewHash: 'hash', choices: [{ sourceSlug: 'book', action: 'new' }, { sourceSlug: 'book', action: 'new' }] }).success).toBe(false);
  });
});
