import { describe, expect, it } from 'vitest';
import { batchDetailSchema, provenanceSchema } from './response-schemas';

const id = '11111111-1111-4111-8111-111111111111';
const source = { id, providerName: 'Fixture', title: 'Authorized source', sourceUrl: 'https://example.org/source', languageCode: 'en', rightsStatus: 'APPROVED', permissionReference: 'fixture-license', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'], attributionRequirements: 'Vocabulary from fixture publisher', revision: 1 };
const occurrence = { id, documentId: id, sourceEntryKey: 'topic:1', topicInstanceKey: 'topic', originalTopic: 'Work', topicSequence: 1, rowOrdinal: 1, pageIndex: 7, printedPageNumber: null, locations: [{ pageIndex: 7, bbox: [0, 101, 1, 105] }], rawWord: 'work', parsedWord: 'work', rawPos: 'noun', normalizedPos: 'NOUN', cefrLevel: 'A1', pronunciation: null, permittedDefinition: null, extractionConfidence: 1, warnings: [], sourceLineStart: 101, sourceLineEnd: 104 };

describe('vocabulary response compatibility', () => {
  it.each([{ start: 101, end: 104 }, { start: null, end: null }])('parses provenance with TXT lines or legacy PDF nulls: $start', ({ start, end }) => {
    const value = provenanceSchema.parse({ lexicalEntryId: id, senseId: id, decision: 'NEW_ENTRY', sourceEntry: { ...occurrence, sourceLineStart: start, sourceLineEnd: end, document: { id, originalFilename: start === null ? 'fixture.pdf' : 'fixture.txt', sha256: 'a'.repeat(64), source } } });
    expect(value.sourceEntry).toMatchObject({ sourceLineStart: start, sourceLineEnd: end });
    expect(value.sourceEntry.document.source.attributionRequirements).toBe('Vocabulary from fixture publisher');
  });

  it('parses batch rows with line provenance and resolution while stripping unrelated DB fields', () => {
    const value = batchDetailSchema.parse({ batch: { id, documentId: id, parserVersion: 'txt-v1', status: 'REVIEW_REQUIRED', revision: 1, detectedRows: 1, checkpoint: 1, document: { source, originalFilename: 'fixture.txt' } }, rows: [{ sourceEntryId: id, validationState: 'REVIEW_REQUIRED', rejectionReason: null, sourceEntry: { ...occurrence, resolution: null, createdAt: '2026-10-22' } }], total: 1, page: 1, limit: 25, reconciliation: { detected: 1, stored: 1, validated: 0, unresolved: 1, rejected: 0 } });
    expect(value.rows[0]?.sourceEntry).toMatchObject({ sourceLineStart: 101, sourceLineEnd: 104, resolution: null });
    expect(value.rows[0]?.sourceEntry).not.toHaveProperty('createdAt');
  });
});
