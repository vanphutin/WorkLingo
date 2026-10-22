import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPanel } from './collections-panel';
import { EntriesPanel } from './entries-panel';
import { VocabularyLibraryClient } from '../../lib/api/vocabulary-library-client';

const id = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const source = { id, providerName: 'Synthetic', title: 'Authored source', sourceUrl: 'https://example.test', languageCode: 'en', rightsStatus: 'APPROVED', permissionReference: 'owned', allowedUses: ['EXTRACT', 'STORE'], allowedFields: ['FORM'], attributionRequirements: '', revision: 1 };
const sense = { id, definition: null, definitionLanguage: 'en', translation: null, editorialStatus: 'REVIEWED', rightsBasis: 'owned', sourceId: id };
const entry = { id, canonicalForm: 'Authored word', language: 'en', partOfSpeech: 'NOUN', entryType: 'WORD', editorialStatus: 'REVIEWED', senses: [sense], pronunciations: [], topics: [], cefrAssociations: [] };
const version = { id, collectionId: id, version: 1, status: 'PUBLISHED', _count: { members: 26, bindings: 26 } };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function network() {
  const requests: { path: string; page: number; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input, 'https://example.test'); const path = url.pathname; const page = Number(url.searchParams.get('page') ?? 1);
    requests.push({ path, page, body: init.body ? JSON.parse(String(init.body)) : {} });
    const list = (items: unknown[], total = 26) => json({ items, total, page, limit: 25 });
    if (init.method === 'POST') return json({ id });
    if (path.endsWith('/options')) return json({ programs: [{ id, name: 'Authored program' }], topics: [], page, limit: 25 });
    if (path.endsWith('/collections')) return list([{ id, name: 'Authored collection', type: 'TOPIC', ownerReference: 'editor' }], 1);
    if (path.endsWith('/versions')) return list([version], 1);
    if (path.endsWith('/members')) return list([{ id: page === 1 ? id : secondId, senseId: id, lexicalEntryId: id, position: page === 1 ? 0 : 25, sense, entry: { canonicalForm: page === 1 ? 'First member' : 'Later member' } }]);
    if (path.endsWith('/assignments')) return list([{ id: page === 1 ? id : secondId, memberId: id, programId: id, inclusionReason: page === 1 ? 'First reason' : 'Later reason', learningGoal: 'RECEPTIVE' }]);
    if (path.endsWith('/bindings')) return list([{ id, programId: page === 1 ? id : secondId, pathId: null, levelId: null, missionId: null, lessonVersionId: null, wordBankVersionId: null }]);
    if (path.endsWith('/entries')) return list([entry], 1);
    if (path.endsWith(`/entries/${id}`)) return json(entry);
    if (path.endsWith('/provenance')) return list([{ lexicalEntryId: id, senseId: id, decision: 'NEW_ENTRY', sourceEntry: { id: page === 1 ? id : secondId, documentId: id, sourceEntryKey: `t1:${page}`, topicInstanceKey: 't1', originalTopic: 'Authored topic', topicSequence: 1, rowOrdinal: page, pageIndex: 0, locations: [{ pageIndex: 0, bbox: [0, 0, 10, 10] }], rawWord: page === 1 ? 'First raw word' : 'Later raw word', parsedWord: 'Authored word', rawPos: 'n.', normalizedPos: 'NOUN', cefrLevel: 'A1', document: { id, originalFilename: 'synthetic.json', sha256: 'a'.repeat(64), source } } }]);
    return json({}, 404);
  }));
  return requests;
}
describe('Vocabulary pagination contracts and UI', () => {
  it('accepts bounded version summaries without embedded content', async () => {
    network();
    expect((await new VocabularyLibraryClient().versions(id)).items[0]).toEqual(version);
  });
  it('accepts publication and retry summaries without requiring or exposing members', async () => {
    const fetcher = vi.fn().mockImplementation(async () => json(version)); vi.stubGlobal('fetch', fetcher);
    const api = new VocabularyLibraryClient();
    expect(await api.publishVersion(id)).toEqual(version);
    expect(await api.publishBatch(id, { revision: 1, collectionName: 'Authored publication' })).toEqual(version);
    expect(fetcher.mock.calls).toHaveLength(2);
  });
  it('requests bounded members/provenance/assignment/binding pages and rejects oversized requests', async () => {
    const requests = network(); const api = new VocabularyLibraryClient();
    await api.members(id, { page: 2, limit: 25 }); await api.provenance(id, { page: 2, limit: 25 });
    await api.assignments(id, { page: 2, limit: 25 }); await api.bindings(id, { page: 2, limit: 25 });
    expect(requests.map(request => request.path.split('/vocabulary')[1])).toEqual([`/versions/${id}/members`, `/entries/${id}/provenance`, `/versions/${id}/assignments`, `/versions/${id}/bindings`]);
    expect(requests.every(request => request.page === 2)).toBe(true);
    await expect(api.members(id, { limit: 101 })).rejects.toThrow();
    await expect(api.provenance(id, { page: 0 })).rejects.toThrow();
    expect(requests).toHaveLength(4);
  });
  it('pages members and retains working assignment/binding actions for the selected version', async () => {
    const requests = network(); render(<CollectionsPanel selected={[]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Authored collection' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Version 1' }));
    const members = await screen.findByRole('region', { name: 'Member' });
    await within(members).findByText('First member');
    fireEvent.click(within(members).getByRole('button', { name: 'Next page' }));
    await within(members).findByText('Later member');
    expect(within(members).queryByText('First member')).not.toBeInTheDocument();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Member' }), { target: { value: secondId } });
    await screen.findByRole('option', { name: 'Authored program' });
    fireEvent.change(screen.getByLabelText('Assignment program'), { target: { value: id } });
    fireEvent.change(screen.getByLabelText('Inclusion reason'), { target: { value: 'Curated after paging to the later member.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save program assignment' }));
    await waitFor(() => expect(requests.find(request => request.path.endsWith('/assignments') && request.body.memberId)?.body).toMatchObject({ memberId: secondId, programId: id }));
    fireEvent.change(await screen.findByLabelText('Curriculum target ID'), { target: { value: id } });
    fireEvent.click(screen.getByRole('button', { name: 'Bind published version' }));
    await waitFor(() => expect(requests.find(request => request.path.endsWith('/bindings') && request.body.programId)?.body).toEqual({ programId: id }));
    const assignments = screen.getByRole('region', { name: 'Program assignments' });
    fireEvent.click(within(assignments).getByRole('button', { name: 'Next page' }));
    await within(assignments).findByText(/Later reason/u);
    const bindings = screen.getByRole('region', { name: 'Curriculum bindings' });
    fireEvent.click(within(bindings).getByRole('button', { name: 'Next page' }));
    await within(bindings).findByText(`programId: ${secondId}`);
    expect(requests.some(request => request.path.endsWith('/members') && request.page === 2)).toBe(true);
  });
  it('loads raw provenance independently and can reach later immutable occurrences', async () => {
    const requests = network(); render(<EntriesPanel selected={[]} setSelected={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Authored word' }));
    const provenance = await screen.findByRole('region', { name: 'Source provenance' });
    await within(provenance).findByText('First raw word');
    fireEvent.click(within(provenance).getByRole('button', { name: 'Next page' }));
    await within(provenance).findByText('Later raw word');
    expect(within(provenance).queryByText('First raw word')).not.toBeInTheDocument();
    expect(requests.some(request => request.path.endsWith('/provenance') && request.page === 2)).toBe(true);
  });
  it('rejects oversized successful pages and preserves a current rights denial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ items: Array.from({ length: 101 }, () => ({ id, senseId: id, lexicalEntryId: id, position: 0 })), total: 101, page: 1, limit: 100 })).mockResolvedValueOnce(json({ code: 'BLOCKED_BY_RIGHTS', message: 'Current source authorization was revoked.' }, 422)));
    const api = new VocabularyLibraryClient();
    await expect(api.members(id, { limit: 100 })).rejects.toThrow();
    await expect(api.provenance(id)).rejects.toMatchObject({ code: 'BLOCKED_BY_RIGHTS', status: 422 });
  });
});
