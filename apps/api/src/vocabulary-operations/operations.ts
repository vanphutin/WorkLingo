import { vocabularyManifestSchema } from '@worklingo/contracts';

export function assertIsolatedTarget(value: string) {
  const url = new URL(value);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !/^\/[a-z0-9_]+_test$/u.test(url.pathname) || url.port === '55432') throw new Error('An explicit local isolated *_test database is required.');
}
export const sourceRegistry = [
  { cefrLevel: 'A1', referencePages: 31, sourceUrl: 'https://help.langeek.co/wp-content/uploads/2025/04/English-wordlist-A1.pdf' },
  { cefrLevel: 'A2', referencePages: 74, sourceUrl: 'https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-A2.pdf' },
  { cefrLevel: 'B1', referencePages: 85, sourceUrl: 'https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-B1.pdf' },
  { cefrLevel: 'B2', referencePages: 102, sourceUrl: 'https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-B2.pdf' },
  { cefrLevel: 'C1', referencePages: 113, sourceUrl: 'https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-C1.pdf' },
].map(source => ({ ...source, status: 'BLOCKED_BY_RIGHTS' as const }));

/** Report identifiers/counts only; never echo definitions or raw source content. */
export function reconcileManifest(raw: unknown) {
  const manifest = vocabularyManifestSchema.parse(raw);
  const pages = [...manifest.inventory.pages].sort((a, b) => a.pageIndex - b.pageIndex);
  const pageCoverage = pages.length === manifest.pageCount && pages.every((page, index) => page.pageIndex === index);
  const detected = pages.flatMap(page => page.detectedKeys);
  const parsed = manifest.rows.map(row => row.sourceEntryKey);
  const expectedSet = new Set(detected); const parsedSet = new Set(parsed);
  const missingKeys = detected.filter(key => !parsedSet.has(key));
  const unexpectedKeys = parsed.filter(key => !expectedSet.has(key));
  const duplicateSourceKeys = detected.length - expectedSet.size + parsed.length - parsedSet.size;
  const invalidLocations = manifest.rows.filter(row => row.cefrLevel !== manifest.cefrLevel || row.sourceEntryKey !== `${row.topicInstanceKey}:${row.rowOrdinal}` || !pages.find(page => page.pageIndex === row.pageIndex)?.detectedKeys.includes(row.sourceEntryKey) || !row.locations.some(location => location.pageIndex === row.pageIndex) || row.locations.some(location => location.pageIndex >= manifest.pageCount)).length;
  const unresolvedRows = manifest.rows.filter(row => row.warnings.length || row.normalizedPos === 'UNKNOWN' || row.extractionConfidence < 1).length;
  const exceptions = pages.reduce((sum, page) => sum + page.exceptions.length, 0);
  return { documentSha256: manifest.documentSha256, parserVersion: manifest.parserVersion, cefrLevel: manifest.cefrLevel, pageCount: manifest.pageCount, pageCoverage, vocabularyPages: pages.filter(page => page.detectedKeys.length).length, topics: new Set(manifest.rows.map(row => row.topicInstanceKey)).size, detectedRows: detected.length, parsedRows: parsed.length, validatedRows: manifest.rows.length - unresolvedRows, unresolvedRows, rejectedRows: 0, canonicalLinks: 0, duplicateSourceKeys, invalidLocations, exceptions, missingKeys, unexpectedKeys, status: pageCoverage && detected.length > 0 && !missingKeys.length && !unexpectedKeys.length && !duplicateSourceKeys && !invalidLocations && !unresolvedRows && !exceptions ? 'VALIDATED_NOT_REVIEWED' : 'INCOMPLETE' };
}
