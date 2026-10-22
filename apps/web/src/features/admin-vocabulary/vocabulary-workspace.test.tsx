import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { VocabularyWorkspace } from './vocabulary-workspace';

const sourceId = '11111111-1111-4111-8111-111111111111';
const entryId = '22222222-2222-4222-8222-222222222222';
const senseId = '33333333-3333-4333-8333-333333333333';
const batchId = '44444444-4444-4444-8444-444444444444';
const source = { id: sourceId, providerName: 'Synthetic', title: 'Fixture source', sourceUrl: 'https://example.org/fixture', languageCode: 'en', rightsStatus: 'PENDING', permissionReference: null, allowedUses: [], allowedFields: [], attributionRequirements: '', revision: 1 };
const approved = { ...source, rightsStatus: 'APPROVED', permissionReference: 'owned-content', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'] };
const sense = { id: senseId, definition: 'A synthetic sense', definitionLanguage: 'en', translation: null, editorialStatus: 'REVIEWED', rightsBasis: 'owned-content', sourceId };
const entry = { id: entryId, canonicalForm: 'fixture word', language: 'en', partOfSpeech: 'NOUN', entryType: 'WORD', editorialStatus: 'REVIEWED', senses: [sense], pronunciations: [{ id: sourceId, ipa: '/test/', dialect: 'en-US', sourceId, rightsBasis: 'owned-content' }], topics: [], cefrAssociations: [{ cefrLevel: 'A1' }] };
const batch = { id: batchId, documentId: sourceId, parserVersion: 'v1', revision: 1, status: 'REVIEW_REQUIRED', detectedRows: 26, checkpoint: 26, document: { originalFilename: 'fixture.json', cefrLevel: 'A1', source: approved } };
const row = { id: sourceId, documentId: sourceId, sourceEntryKey: 'r1', topicInstanceKey: 't1', originalTopic: 'Fixture topic', topicSequence: 1, rowOrdinal: 1, pageIndex: 0, locations: [{ pageIndex: 0, bbox: [0, 0, 10, 10] }], rawWord: 'fixture word', parsedWord: 'fixture word', rawPos: 'n.', normalizedPos: 'NOUN', cefrLevel: 'A1', printedPageNumber: null, pronunciation: null, permittedDefinition: null, extractionConfidence: 1, warnings: [], resolution: null };
const collection = { id: entryId, name: 'Fixture collection', type: 'TOPIC', ownerReference: 'editor' };
const version = { id: batchId, collectionId: entryId, version: 1, status: 'PUBLISHED', members: [{ id: sourceId, senseId, lexicalEntryId: entryId, position: 0, sense, entry: { canonicalForm: 'fixture word' }, assignments: [] }], bindings: [] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
type Handler = (url: URL, init: RequestInit) => Response | undefined;
function network(custom?: Handler) {
  const requests: { url: URL; body: Record<string, unknown>; method: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (path: string, init: RequestInit = {}) => {
    const url = new URL(path, 'http://localhost'); requests.push({ url, body: init.body ? JSON.parse(String(init.body)) : {}, method: init.method ?? 'GET' });
    const result = custom?.(url, init); if (result) return result;
    const page = Number(url.searchParams.get('page') ?? 1);
    const list = (items: unknown[], total = items.length) => json({ items, total, page, limit: 25 });
    if (url.pathname.endsWith('/options')) return json({ programs: [{ id: sourceId, name: 'Existing program' }], topics: [{ id: entryId, name: 'Existing topic' }], page: 1, limit: 25 });
    if (url.pathname.endsWith('/entries')) return list([{ ...entry, canonicalForm: page === 1 ? 'fixture word' : 'second page word' }], 26);
    if (url.pathname.endsWith(`/entries/${entryId}`)) return json(entry);
    if (url.pathname.endsWith(`/entries/${entryId}/provenance`)) return list([{ lexicalEntryId: entryId, senseId, decision: 'NEW_ENTRY', sourceEntry: { ...row, document: { id: sourceId, originalFilename: 'fixture.json', sha256: 'a'.repeat(64), source: approved } } }]);
    if (url.pathname.endsWith('/sources')) return list([source]);
    if (url.pathname.endsWith('/batches')) return list([batch]);
    if (url.pathname.endsWith(`/batches/${batchId}`)) return json({ batch, rows: [{ sourceEntryId: sourceId, validationState: 'REVIEW_REQUIRED', rejectionReason: null, sourceEntry: { ...row, parsedWord: page === 1 ? 'fixture word' : 'next review row' } }], total: 26, page, limit: 25, reconciliation: { detected: 26, stored: 26, validated: 0, unresolved: 26, rejected: 0 } });
    if (url.pathname.endsWith('/review')) return json({ ...batch, revision: 2 });
    if (url.pathname.endsWith('/collections')) return list([collection]);
    if (url.pathname.endsWith('/versions')) return list([{ id: version.id, collectionId: version.collectionId, version: version.version, status: version.status, _count: { members: 1, bindings: 0 } }]);
    if (url.pathname.endsWith(`/versions/${batchId}/members`)) return list(version.members);
    if (init.method !== 'POST' && (url.pathname.endsWith(`/versions/${batchId}/assignments`) || url.pathname.endsWith(`/versions/${batchId}/bindings`))) return list([]);
    if (url.pathname.endsWith('/assignments') || url.pathname.endsWith('/bindings')) return json({ id: sourceId });
    return json({ code: 'NOT_FOUND' }, 404);
  }));
  return requests;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('vocabulary workspace', () => {
  it('sends a source-hash-bound correction for one uncertain occurrence without changing raw provenance', async () => {
    const requests = network((url, init) => url.pathname.endsWith('/batches/'+batchId) && init.method !== 'POST' ? json({ batch, rows: [{ sourceEntryId: sourceId, validationState: 'REVIEW_REQUIRED', rejectionReason: null, sourceEntry: { ...row, sourceContentHash: 'b'.repeat(64), normalizedPos: 'UNKNOWN', warnings: ['Ambiguous extraction'] } }], total: 1, page: 1, limit: 25, reconciliation: { detected: 1, stored: 1, validated: 0, unresolved: 1, rejected: 0 } }) : undefined);
    render(<VocabularyWorkspace />); fireEvent.click(screen.getByRole('button', { name: 'Import batches' }));
    fireEvent.click(await screen.findByRole('button', { name: 'fixture.json' }));
    await screen.findByText('Ambiguous extraction', { exact: false });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select fixture word' }));
    fireEvent.change(screen.getByLabelText('Corrected expression'), { target: { value: 'corrected word' } });
    fireEvent.change(screen.getByLabelText('Corrected part of speech'), { target: { value: 'NOUN' } });
    fireEvent.change(screen.getByLabelText('Correction evidence'), { target: { value: 'Checked original source page and verified the expression.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply review' }));
    await waitFor(() => expect(requests.find(item => item.url.pathname.endsWith('/review'))?.body.correction).toEqual({ parsedWord: 'corrected word', normalizedPos: 'NOUN', reason: 'Checked original source page and verified the expression.', sourceContentHash: 'b'.repeat(64) }));
  });
  it('searches independent dimensions, paginates and clears page selection on query change', async () => {
    const requests = network(); render(<VocabularyWorkspace />);
    await screen.findByRole('button', { name: 'fixture word' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select fixture word' })); expect(screen.getByText('1 selected senses')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await screen.findByRole('button', { name: 'second page word' });
    fireEvent.change(screen.getByLabelText('Search vocabulary'), { target: { value: 'take & give' } });
    fireEvent.change(screen.getByLabelText('CEFR'), { target: { value: 'B1' } });
    fireEvent.change(screen.getByLabelText('Part of speech'), { target: { value: 'VERB' } });
    fireEvent.change(screen.getByLabelText('Program'), { target: { value: sourceId } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(requests.at(-1)?.url.searchParams.get('search')).toBe('take & give'));
    expect(requests.at(-1)?.url.searchParams.get('page')).toBe('1'); expect(requests.at(-1)?.url.searchParams.get('cefr')).toBe('B1'); expect(requests.at(-1)?.url.searchParams.get('pos')).toBe('VERB'); expect(requests.at(-1)?.url.searchParams.get('programId')).toBe(sourceId);
    expect(screen.getByText('0 selected senses')).toBeInTheDocument();
  });
  it('shows sense, pronunciation and immutable source provenance', async () => {
    network(); render(<VocabularyWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'fixture word' }));
    const detail = await screen.findByRole('region', { name: 'Entry details' });
    expect(await within(detail).findByText('/test/')).toBeInTheDocument(); expect(within(detail).getByText('A synthetic sense')).toBeInTheDocument(); expect(await within(detail).findByText('fixture.json')).toBeInTheDocument(); expect(detail).toHaveTextContent('Fixture topic');
  });
  it('recovers a failed list through retry', async () => {
    let fail = true; network(url => url.pathname.endsWith('/entries') && fail ? json({ code: 'NETWORK_ERROR' }, 503) : undefined); render(<VocabularyWorkspace />);
    expect(await screen.findByRole('alert')).toBeInTheDocument(); fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await screen.findByRole('button', { name: 'fixture word' });
  });
  it('keeps blocked source metadata visible and prevents import before authorization', async () => {
    network(); render(<LocaleProvider initialLocale="vi"><VocabularyWorkspace /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Nguồn và quyền sử dụng' }));
    await screen.findByText('Fixture source'); expect(screen.getByText('Chờ cấp quyền')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nhập bản kê JSON' }));
    expect(screen.getByRole('button', { name: 'Nhập các dòng đã xác thực' })).toBeDisabled(); expect(screen.getByText(/Chưa có quyền sử dụng/)).toBeInTheDocument();
  });
  it('paginates source rows and sends explicit reuse with the current batch revision', async () => {
    const requests = network(); render(<VocabularyWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Import batches' })); fireEvent.click(await screen.findByRole('button', { name: 'fixture.json' }));
    const review = await screen.findByRole('region', { name: 'Batch review' });
    await waitFor(() => expect(review).toHaveTextContent('26 unresolved'));
    fireEvent.click(within(review).getByRole('button', { name: 'Next page' })); await within(review).findByText('next review row');
    fireEvent.click(within(review).getByRole('checkbox', { name: 'Select next review row' }));
    fireEvent.change(within(review).getByLabelText('Review decision'), { target: { value: 'REUSE_SENSE' } });
    fireEvent.change(within(review).getByLabelText('Existing sense ID'), { target: { value: senseId } });
    fireEvent.click(within(review).getByRole('button', { name: 'Apply review' }));
    await waitFor(() => expect(requests.find(item => item.url.pathname.endsWith('/review'))?.body).toMatchObject({ sourceEntryId: sourceId, revision: 1, decision: 'REUSE_SENSE', senseId }));
  });
  it('does not send rejection without a substantive reason', async () => {
    const requests = network(); render(<VocabularyWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Import batches' })); fireEvent.click(await screen.findByRole('button', { name: 'fixture.json' }));
    const review = await screen.findByRole('region', { name: 'Batch review' });
    fireEvent.click(await within(review).findByRole('checkbox', { name: 'Select fixture word' }));
    fireEvent.change(within(review).getByLabelText('Review decision'), { target: { value: 'REJECT' } });
    fireEvent.click(within(review).getByRole('button', { name: 'Apply review' }));
    expect(requests.filter(item => item.url.pathname.endsWith('/review'))).toHaveLength(0);
    fireEvent.change(within(review).getByLabelText('Rejection reason'), { target: { value: 'Verified repeated page header' } });
    fireEvent.click(within(review).getByRole('button', { name: 'Apply review' }));
    await waitFor(() => expect(requests.find(item => item.url.pathname.endsWith('/review'))?.body).toMatchObject({ decision: 'REJECT', rejectionReason: 'Verified repeated page header' }));
  });
  it('creates a reviewed lexical kind with an explicit existing topic association', async () => {
    const requests = network(); render(<VocabularyWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Import batches' })); fireEvent.click(await screen.findByRole('button', { name: 'fixture.json' }));
    const review = await screen.findByRole('region', { name: 'Batch review' });
    fireEvent.click(await within(review).findByRole('checkbox', { name: 'Select fixture word' }));
    fireEvent.change(within(review).getByLabelText('Entry kind'), { target: { value: 'PHRASAL_VERB' } });
    await within(review).findByRole('option', { name: 'Existing topic' });
    fireEvent.change(within(review).getByLabelText('Topic'), { target: { value: entryId } });
    fireEvent.click(within(review).getByRole('button', { name: 'Apply review' }));
    await waitFor(() => expect(requests.find(item => item.url.pathname.endsWith('/review'))?.body).toMatchObject({ decision: 'NEW_ENTRY', entryType: 'PHRASAL_VERB', topicGroupIds: [entryId] }));
  });
  it('shows published members and assigns an explicit program and curriculum binding', async () => {
    const requests = network(); render(<VocabularyWorkspace />); fireEvent.click(screen.getByRole('button', { name: 'Collections' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fixture collection' }));
    const versions = await screen.findByRole('region', { name: 'Collection versions' });
    fireEvent.click(within(versions).getByRole('button', { name: 'Version 1' }));
    fireEvent.change(await screen.findByRole('combobox', { name: 'Member' }), { target: { value: sourceId } });
    await screen.findByRole('option', { name: 'Existing program' });
    fireEvent.change(screen.getByLabelText('Assignment program'), { target: { value: sourceId } });
    fireEvent.change(screen.getByLabelText('Inclusion reason'), { target: { value: 'Needed for workplace introductions' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save program assignment' }));
    await waitFor(() => expect(requests.find(item => item.method === 'POST' && item.url.pathname.endsWith('/assignments'))?.body).toMatchObject({ memberId: sourceId, programId: sourceId, inclusionReason: 'Needed for workplace introductions' }));
    fireEvent.change(await screen.findByLabelText('Curriculum target ID'), { target: { value: sourceId } }); fireEvent.click(screen.getByRole('button', { name: 'Bind published version' }));
    await waitFor(() => expect(requests.find(item => item.method === 'POST' && item.url.pathname.endsWith('/bindings'))?.body).toEqual({ programId: sourceId }));
  });
  it('requires dry-run again after edits and shows revoked rights without a false import success', async () => {
    const input = { documentSha256: 'a'.repeat(64), pageCount: 1, cefrLevel: 'A1', parserVersion: 'v1', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['t1:1'], exceptions: [] }] }, rows: [{ sourceEntryKey: 't1:1', topicInstanceKey: 't1', originalTopic: 'Fixture topic', topicSequence: 1, rowOrdinal: 1, pageIndex: 0, locations: [{ pageIndex: 0, bbox: [0, 0, 10, 10] }], rawWord: 'fixture word', parsedWord: 'fixture word', rawPos: 'n.', normalizedPos: 'NOUN', cefrLevel: 'A1' }] };
    const requests = network((url, init) => {
      if (url.pathname.endsWith('/sources')) return json({ items: [approved], total: 1, page: 1, limit: 25 });
      if (url.pathname.endsWith('/documents')) return json({ id: sourceId });
      if (url.pathname.endsWith('/batches') && init.method === 'POST') return json({ ...batch, detectedRows: 1, checkpoint: 0 });
      if (url.pathname.endsWith('/stage')) return json({ code: 'BLOCKED_BY_RIGHTS', message: 'Revoked' }, 422);
      return undefined;
    });
    render(<VocabularyWorkspace />); fireEvent.click(screen.getByRole('button', { name: 'Import JSON manifest' }));
    await screen.findByRole('option', { name: 'Fixture source' });
    fireEvent.change(screen.getByLabelText('Source title'), { target: { value: sourceId } });
    fireEvent.change(screen.getByLabelText('Source document filename'), { target: { value: 'fixture-source.pdf' } });
    fireEvent.change(screen.getByLabelText('Authorized JSON manifest'), { target: { value: JSON.stringify(input) } });
    expect(screen.getByRole('button', { name: 'Import validated rows' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Validate dry-run' }));
    expect(screen.getByRole('button', { name: 'Import validated rows' })).toBeEnabled();
    expect(requests.filter(item => item.method === 'POST')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Authorized JSON manifest'), { target: { value: JSON.stringify(input, null, 2) } });
    expect(screen.getByRole('button', { name: 'Import validated rows' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Validate dry-run' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import validated rows' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Authorization is missing');
    expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
    expect(requests.filter(item => item.url.pathname.endsWith('/stage'))).toHaveLength(1);
  });
});
