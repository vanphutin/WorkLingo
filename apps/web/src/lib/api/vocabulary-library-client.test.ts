import { afterEach, describe, expect, it, vi } from 'vitest';
import { VocabularyLibraryClient, dryRunManifest } from './vocabulary-library-client';

const sourceId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const batchId = '33333333-3333-4333-8333-333333333333';
const source = { id: sourceId, providerName: 'Synthetic', title: 'Owned fixture', sourceUrl: 'https://example.org', languageCode: 'en', rightsStatus: 'APPROVED' as const, permissionReference: 'test-license', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'], attributionRequirements: '', revision: 1 };
function manifest(count = 1) {
  return { documentSha256: 'a'.repeat(64), pageCount: 1, cefrLevel: 'A1', parserVersion: 'fixture-v1', inventory: { pages: [{ pageIndex: 0, detectedKeys: Array.from({ length: count }, (_, i) => `topic-1:${i + 1}`), exceptions: [] }] }, rows: Array.from({ length: count }, (_, i) => ({ sourceEntryKey: `topic-1:${i + 1}`, topicInstanceKey: 'topic-1', originalTopic: 'Synthetic', topicSequence: 1, rowOrdinal: i + 1, pageIndex: 0, locations: [{ pageIndex: 0, bbox: [0, 0, 10, 10] }], rawWord: `word ${i}`, parsedWord: `word ${i}`, rawPos: 'n.', normalizedPos: 'NOUN', cefrLevel: 'A1' })) };
}
const batch = { id: batchId, documentId, parserVersion: 'fixture-v1', status: 'REGISTERED', revision: 1, detectedRows: 251, checkpoint: 0 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());
describe('vocabulary library client', () => {
  it('sends bounded encoded filters and authenticates requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ items: [], total: 0, page: 2, limit: 25 })); vi.stubGlobal('fetch', fetcher);
    await new VocabularyLibraryClient().entries({ page: 2, limit: 25, search: 'take & give', cefr: 'B1', pos: 'VERB', topicId: sourceId, programId: documentId, sourceId, reviewStatus: 'REVIEWED' });
    const [url, options] = fetcher.mock.calls[0]!;
    const query = new URL(url, 'https://example.org').searchParams;
    expect(query.get('search')).toBe('take & give'); expect(query.get('page')).toBe('2'); expect(query.get('programId')).toBe(documentId); expect(query.get('reviewStatus')).toBe('REVIEWED');
    expect(options.credentials).toBe('include');
    await expect(new VocabularyLibraryClient().entries({ page: 0, limit: 200 })).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed successful responses and preserves server rights errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ items: [{ id: sourceId }], total: 1, page: 1, limit: 25 })).mockResolvedValueOnce(json({ error: { code: 'BLOCKED_BY_RIGHTS', message: 'Authorization required' } }, 403)));
    const client = new VocabularyLibraryClient();
    await expect(client.entries()).rejects.toThrow();
    await expect(client.sources()).rejects.toMatchObject({ code: 'BLOCKED_BY_RIGHTS', status: 403 });
  });
  it('fails closed before writes for blocked sources, missing fields and reconciliation gaps', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(() => dryRunManifest(manifest(), { ...source, rightsStatus: 'PENDING' })).toThrow('BLOCKED_BY_RIGHTS');
    expect(() => dryRunManifest({ ...manifest(), rows: [] }, source)).toThrow();
    expect(() => dryRunManifest({ ...manifest(), rows: [{ ...manifest().rows[0], permittedDefinition: 'Restricted definition' }] }, source)).toThrow('BLOCKED_BY_RIGHTS');
    await expect(new VocabularyLibraryClient().importManifest({ ...source, rightsStatus: 'REVOKED' }, 'fixture.json', manifest())).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('dry-runs without requests and stages 251 authorized rows in revision-aware chunks', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ id: documentId })).mockResolvedValueOnce(json(batch)).mockResolvedValueOnce(json({ ...batch, revision: 2, checkpoint: 250, status: 'REVIEW_REQUIRED' })).mockResolvedValueOnce(json({ ...batch, revision: 3, checkpoint: 251, status: 'REVIEW_REQUIRED' })); vi.stubGlobal('fetch', fetcher);
    expect(dryRunManifest(manifest(251), source).rowCount).toBe(251); expect(fetcher).not.toHaveBeenCalled();
    const result = await new VocabularyLibraryClient().importManifest(source, 'fixture.json', manifest(251));
    expect(result.checkpoint).toBe(251);
    expect(fetcher.mock.calls.map(call => String(call[0]).split('/vocabulary')[1])).toEqual(['/documents', '/batches', `/batches/${batchId}/stage`, `/batches/${batchId}/stage`]);
    expect(JSON.parse(fetcher.mock.calls[2]![1].body).rows).toHaveLength(250);
    expect(JSON.parse(fetcher.mock.calls[3]![1].body)).toMatchObject({ revision: 2, rows: [{ rowOrdinal: 251 }] });
  });
  it('validates deliberate review decisions before sending them', async () => {
    const fetcher = vi.fn().mockResolvedValue(json(batch)); vi.stubGlobal('fetch', fetcher);
    const client = new VocabularyLibraryClient();
    await expect(client.review(batchId, { revision: 1, sourceEntryId: sourceId, decision: 'REJECT' })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    await client.review(batchId, { revision: 1, sourceEntryId: sourceId, decision: 'REUSE_SENSE', senseId: documentId });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toMatchObject({ decision: 'REUSE_SENSE', senseId: documentId, revision: 1 });
  });
  it('rejects an occurrence key that is not its topic instance and ordinal before writing metadata', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const input = manifest();
    input.inventory.pages[0]!.detectedKeys = ['forged-key']; input.rows[0]!.sourceEntryKey = 'forged-key';
    await expect(new VocabularyLibraryClient().importManifest(source, 'fixture.json', input)).rejects.toThrow('VOCABULARY_INCOMPLETE');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects a missing primary-page location and whitespace authorization in dry-run', () => {
    const input = manifest(); input.pageCount = 2; input.inventory.pages.push({ pageIndex: 1, detectedKeys: [], exceptions: [] }); input.rows[0]!.locations[0]!.pageIndex = 1;
    expect(() => dryRunManifest(input, source)).toThrow('VOCABULARY_INCOMPLETE');
    expect(() => dryRunManifest(manifest(), { ...source, permissionReference: '   ' })).toThrow('BLOCKED_BY_RIGHTS');
  });
});
