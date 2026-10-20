import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ieltsTopicAdminClient } from '../../lib/api/ielts-topic-admin-client';
import { TopicEditor } from './topic-editor';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';

vi.mock('../../lib/api/ielts-topic-admin-client', () => ({ ieltsTopicAdminClient: { list: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
vi.mock('../../lib/api/admin-content-lifecycle-client', () => ({ adminContentLifecycleClient: { remove: vi.fn() } }));
const topic = { id: '11111111-1111-4111-8111-111111111111', slug: 'ielts-education', status: 'DRAFT' as const, draftRevision: 2, draft: { schemaVersion: 1 as const, title: 'Education', description: 'Contextual education vocabulary.', packs: [] }, currentPublishedVersionId: null, versions: [], updatedAt: '2026-10-15T00:00:00.000Z' };
describe('TopicEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ieltsTopicAdminClient.list).mockResolvedValue([topic]); });
  afterEach(cleanup);
  it('ignores a cancelled initial load that completes after a StrictMode removal', async () => {
    let resolveOld!: (items: typeof topic[]) => void;
    const oldLoad = new Promise<typeof topic[]>(resolve => { resolveOld = resolve; });
    vi.mocked(ieltsTopicAdminClient.list).mockReturnValueOnce(oldLoad).mockResolvedValueOnce([topic]).mockResolvedValue([]);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: topic.id, action: 'deleted' });
    render(<StrictMode><TopicEditor /></StrictMode>);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Education' })).not.toBeInTheDocument());
    await act(async () => { resolveOld([topic]); });
    expect(screen.queryByRole('button', { name: 'Education' })).not.toBeInTheDocument();
  });
  it('reports refresh failure after deletion and removes the deleted row immediately', async () => {
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([topic]).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: topic.id, action: 'deleted' });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Education' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload topics' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
  it('keeps a successful save and reports a failed list refresh', async () => {
    const draft = { ...topic.draft, packs: [{ slug: 'ielts-education', difficulty: 'developing' as const, curriculumRevisionId: topic.id,
      focusChunkSlugs: Array.from({ length: 12 }, (_, i) => `ielts-phrase-${i + 1}`),
      contexts: [{ slug: 'ielts-school', title: 'School setting' }, { slug: 'ielts-office', title: 'Office setting' }] }] };
    const saved = { ...topic, draftRevision: 3, draft: { ...draft, title: 'Saved title' } };
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([{ ...topic, draft }]).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(ieltsTopicAdminClient.save).mockResolvedValue(saved);
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.change(screen.getByLabelText('Topic title'), { target: { value: 'Saved title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Topic title')).toHaveValue('Saved title');
    expect(screen.getByRole('button', { name: 'Saved title' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByText('Draft revision 3')).toBeVisible();
  });
  it('reloads selected metadata after a lifecycle conflict and requires a new confirmation', async () => {
    const fresh = { ...topic, draftRevision: 3, status: 'PUBLISHED' as const, currentPublishedVersionId: 'version-one' };
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([topic]).mockResolvedValueOnce([fresh]).mockResolvedValue([]);
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValueOnce(new Error('Lifecycle changed')).mockResolvedValue({ id: topic.id, action: 'archived' });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload topics' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Archive topic' }));
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
    await waitFor(() => expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(2));
    expect(adminContentLifecycleClient.remove).toHaveBeenLastCalledWith('topic', topic.id, expect.objectContaining({ expectedRevision: 3, expectedAction: 'archived' }));
  });
  it('requires an explicit choice before replacing dirty content with a reloaded revision', async () => {
    const fresh = { ...topic, draftRevision: 3, draft: { ...topic.draft, title: 'Server title' } };
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([topic]).mockResolvedValue([fresh]);
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValue(new Error('Revision changed'));
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.change(screen.getByLabelText('Topic title'), { target: { value: 'Unsaved title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload topics' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Topic title')).toHaveValue('Unsaved title');
    fireEvent.click(screen.getByRole('button', { name: 'Server title' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Topic title')).toHaveValue('Server title');
  });
  it('updates selected publication history after publish so the next removal archives', async () => {
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([topic]).mockResolvedValue([{ ...topic, status: 'PUBLISHED', currentPublishedVersionId: 'version-one', versions: [{ id: 'version-one', version: 1, status: 'PUBLISHED', publishedAt: topic.updatedAt }] }]);
    vi.mocked(ieltsTopicAdminClient.validate).mockResolvedValue({ canPublish: true, supportedDurations: [90], qualifiedModes: [], issues: [] });
    vi.mocked(ieltsTopicAdminClient.publish).mockResolvedValue({ topicId: topic.id, topicVersionId: 'version-one', version: 1, publishedAt: topic.updatedAt });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate content' }));
    await screen.findByText('Content ready to publish');
    fireEvent.click(screen.getByRole('button', { name: 'Publish topic' }));
    expect(await screen.findByRole('button', { name: 'Archive topic' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Delete draft' })).not.toBeInTheDocument();
  });
  it('authors a new topic with pack, context and phrase fields without mandatory JSON', async () => {
    render(<TopicEditor />);
    const newTopicButton = await screen.findByRole('button', { name: 'New topic' });
    await waitFor(() => expect(newTopicButton).toBeEnabled());
    fireEvent.click(newTopicButton);
    fireEvent.change(screen.getByLabelText('Topic title'), { target: { value: 'Workplace learning' } });
    expect(screen.getByLabelText('Description')).toBeVisible();
    expect(screen.getByLabelText('Published curriculum revision ID')).toBeVisible();
    expect(screen.getAllByLabelText('Context title')).toHaveLength(2);
    expect(screen.getAllByLabelText('Phrase slug')).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeDisabled();
  });
  it('protects dirty edits when selecting another topic and explicitly discards on confirmation', async () => {
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValue([topic, { ...topic, id: 'two', draft: { ...topic.draft, title: 'Travel' } }]);
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.change(screen.getByLabelText('Topic title'), { target: { value: 'Unsaved title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Travel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Topic title')).toHaveValue('Unsaved title');
    fireEvent.click(screen.getByRole('button', { name: 'Travel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Topic title')).toHaveValue('Travel');
  });
  it('rejects an import with unknown fields without replacing the topic fields', async () => {
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByText('Import / export topic JSON'));
    fireEvent.change(screen.getByLabelText('Topic manifest (JSON)'), { target: { value: JSON.stringify({ ...topic.draft, unknownMedia: 'do-not-drop' }) } });
    fireEvent.click(screen.getByRole('button', { name: 'Import topic JSON' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported manifest fields/);
    expect(screen.getByLabelText('Topic title')).toHaveValue('Education');
    expect(ieltsTopicAdminClient.save).not.toHaveBeenCalled();
  });
  it.each([false, true])('confirms named removal and refreshes list (published history: %s)', async history => {
    vi.mocked(ieltsTopicAdminClient.list).mockResolvedValueOnce([{ ...topic, versions: history ? [{ id: 'version', version: 1, status: 'ARCHIVED', publishedAt: topic.updatedAt }] : [] }]).mockResolvedValue([]);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: topic.id, action: history ? 'archived' : 'deleted' });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: history ? 'Archive topic' : 'Delete draft' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Education');
    expect(adminContentLifecycleClient.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: history ? 'Confirm archive' : 'Confirm delete' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Education' })).not.toBeInTheDocument());
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledWith('topic', topic.id, expect.objectContaining({ expectedRevision: 2, expectedAction: history ? 'archived' : 'deleted' }));
  });
  it('shows exact content qualification issues and blocks publication', async () => {
    vi.mocked(ieltsTopicAdminClient.validate).mockResolvedValue({ canPublish: false, supportedDurations: [], qualifiedModes: [], issues: [{ code: 'IELTS_TOPIC_CHUNK_CONTEXT', path: 'education.chunk-one', message: 'Use this chunk in both situations.' }] });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate content' }));
    expect(await screen.findByText('Use this chunk in both situations.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeDisabled();
  });
  it('requires revalidation after editing a previously valid draft', async () => {
    vi.mocked(ieltsTopicAdminClient.validate).mockResolvedValue({ canPublish: true, supportedDurations: [90, 120, 150], qualifiedModes: [], issues: [] });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate content' }));
    expect(await screen.findByText('90 / 120 / 150')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Topic manifest (JSON)'), { target: { value: '{}' } });
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeDisabled();
  });
});
