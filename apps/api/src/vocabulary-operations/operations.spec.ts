import { describe, expect, it } from 'vitest';
import { assertIsolatedTarget, reconcileManifest, sourceRegistry } from './operations.js';

describe('Vocabulary operational safeguards', () => {
  it('rejects application and remote targets before creating a database client', () => {
    expect(() => assertIsolatedTarget('postgresql://test:test@127.0.0.1:55432/worklingo')).toThrow();
    expect(() => assertIsolatedTarget('postgresql://test:test@example.org:5432/vocabulary_test')).toThrow();
    expect(() => assertIsolatedTarget('postgresql://test:test@127.0.0.1:55439/vocabulary_test')).not.toThrow();
  });
  it('registers metadata for five blocked sources without fabricated PDF hashes or row counts', () => {
    expect(sourceRegistry.map(source => [source.cefrLevel, source.referencePages])).toEqual([['A1', 31], ['A2', 74], ['B1', 85], ['B2', 102], ['C1', 113]]);
    expect(sourceRegistry.every(source => source.status === 'BLOCKED_BY_RIGHTS')).toBe(true);
  });
  it('reports a missing independent source identifier as incomplete', () => {
    const result = reconcileManifest({ documentSha256: 'a'.repeat(64), pageCount: 1, cefrLevel: 'A1', parserVersion: 'synthetic/1', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }] }, rows: [] });
    expect(result.status).toBe('INCOMPLETE');
    expect(result.missingKeys).toEqual(['topic-1:1']);
    expect(result.detectedRows).toBe(1); expect(result.parsedRows).toBe(0);
  });
  it('does not accept repeated page coverage as a complete document', () => {
    const result = reconcileManifest({ documentSha256: 'a'.repeat(64), pageCount: 2, cefrLevel: 'A1', parserVersion: 'synthetic/1', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }, { pageIndex: 0, detectedKeys: ['topic-2:1'], exceptions: [] }] }, rows: [] });
    expect(result.pageCoverage).toBe(false);
    expect(result.status).toBe('INCOMPLETE');
  });
});
