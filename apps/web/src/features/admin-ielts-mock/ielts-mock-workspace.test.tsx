import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import { IeltsMockWorkspace } from './ielts-mock-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

vi.mock('../../lib/api/admin-ielts-mock-client', () => ({ adminIeltsMockClient: { list: vi.fn(), pending: vi.fn(), create: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn(), review: vi.fn() } }));
vi.mock('../../lib/api/admin-content-lifecycle-client', () => ({ adminContentLifecycleClient: { remove: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const paper = { id: '11111111-1111-4111-8111-111111111111', slug: 'paper-one', status: 'DRAFT' as const, draftRevision: 3, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: '2026-10-18T00:00:00.000Z' };
describe('Mock structured authoring', () => {
  beforeEach(() => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [paper, { ...paper, id: 'paper-two', slug: 'paper-two' }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending).mockResolvedValue({ items: [], nextCursor: null });
  });
  it('reconciles the selected paper after reload and renews lifecycle confirmation', async () => {
    const fresh = { ...paper, draftRevision: 4, status: 'PUBLISHED' as const };
    vi.mocked(adminIeltsMockClient.list).mockResolvedValueOnce({ items: [paper], nextCursor: null }).mockResolvedValueOnce({ items: [fresh], nextCursor: null }).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValueOnce(new Error('Lifecycle changed')).mockResolvedValue({ id: paper.id, action: 'archived' });
    render(<IeltsMockWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Archive mock' }));
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
    await waitFor(() => expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(2));
    expect(adminContentLifecycleClient.remove).toHaveBeenLastCalledWith('mock', paper.id, expect.objectContaining({ expectedRevision: 4, expectedAction: 'archived' }));
  });
  it('finds a later-page selection on reload before reconciling its current revision', async () => {
    const later = { ...paper, id: 'paper-later', slug: 'paper-later' };
    const fresh = { ...later, draftRevision: 4, status: 'PUBLISHED' as const };
    vi.mocked(adminIeltsMockClient.list)
      .mockResolvedValueOnce({ items: [paper], nextCursor: 'page-two' })
      .mockResolvedValueOnce({ items: [later], nextCursor: null })
      .mockResolvedValueOnce({ items: [paper], nextCursor: 'page-two' })
      .mockResolvedValueOnce({ items: [fresh], nextCursor: null });
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValue(new Error('Lifecycle changed'));
    render(<IeltsMockWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Load more mocks' }));
    await screen.findByRole('option', { name: 'paper-later' });
    fireEvent.change(screen.getByLabelText('Select mock'), { target: { value: later.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    expect(await screen.findByRole('button', { name: 'Archive mock' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'paper-later' })).toBeVisible();
    expect(adminIeltsMockClient.list).toHaveBeenLastCalledWith('page-two');
  });
  it('reconciles a successfully loaded paper even when the review queue is unavailable', async () => {
    const fresh = { ...paper, draftRevision: 4, status: 'PUBLISHED' as const };
    vi.mocked(adminIeltsMockClient.list).mockResolvedValueOnce({ items: [paper], nextCursor: null }).mockResolvedValue({ items: [fresh], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending).mockResolvedValueOnce({ items: [], nextCursor: null }).mockRejectedValue(new Error('Review queue offline'));
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValue(new Error('Lifecycle changed'));
    render(<IeltsMockWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    expect(await screen.findByRole('button', { name: 'Archive mock' })).toBeVisible();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm delete' })).not.toBeInTheDocument();
  });
  it('keeps a dirty paper at its original revision until the author explicitly loads the latest', async () => {
    const fresh = { ...paper, draftRevision: 4, draft: { ...paper.draft, title: 'Server title' } };
    vi.mocked(adminIeltsMockClient.list).mockResolvedValueOnce({ items: [paper], nextCursor: null }).mockResolvedValue({ items: [fresh], nextCursor: null });
    vi.mocked(adminIeltsMockClient.save).mockRejectedValue(new Error('Revision changed'));
    render(<IeltsMockWorkspace />);
    fireEvent.change(await screen.findByLabelText('Paper title'), { target: { value: 'Unsaved paper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Paper title')).toHaveValue('Unsaved paper');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(adminIeltsMockClient.save).toHaveBeenCalledTimes(2));
    expect(adminIeltsMockClient.save).toHaveBeenLastCalledWith(paper.id, expect.objectContaining({ expectedRevision: 3 }));
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Paper title')).toHaveValue('Server title');
  });
  it('selects the first mock after StrictMode effect replay', async () => {
    render(<StrictMode><IeltsMockWorkspace /></StrictMode>);
    expect(await screen.findByLabelText('Paper title')).toHaveValue(INITIAL_IELTS_ACADEMIC_MOCK.title);
    expect(screen.getByRole('heading', { name: 'paper-one' })).toBeVisible();
  });
  it('creates a full four-skill draft from the new paper template without seeded rows', async () => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(adminIeltsMockClient.create).mockResolvedValue({ ...paper, slug: 'created-paper' });
    render(<IeltsMockWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'New mock paper' }));
    fireEvent.change(screen.getByLabelText('Paper title'), { target: { value: 'New author paper' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    expect(await screen.findByRole('heading', { name: 'created-paper' })).toBeVisible();
    const input = vi.mocked(adminIeltsMockClient.create).mock.calls[0]![0];
    expect(input).toEqual(expect.objectContaining({ idempotencyKey: expect.any(String), content: expect.objectContaining({ title: 'New author paper', listening: expect.objectContaining({ parts: expect.any(Array) }), reading: expect.objectContaining({ passages: expect.any(Array) }), writing: expect.objectContaining({ tasks: expect.any(Array) }), speaking: expect.objectContaining({ parts: expect.any(Array) }) }) }));
    expect(adminIeltsMockClient.publish).not.toHaveBeenCalled();
  });
  it('guards dirty selection and retains edited fields on cancellation', async () => {
    render(<IeltsMockWorkspace />);
    fireEvent.change(await screen.findByLabelText('Paper title'), { target: { value: 'Unsaved paper' } });
    fireEvent.change(screen.getByLabelText('Select mock'), { target: { value: 'paper-two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Paper title')).toHaveValue('Unsaved paper');
    fireEvent.change(screen.getByLabelText('Select mock'), { target: { value: 'paper-two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('heading', { name: 'paper-two' })).toBeVisible();
  });
  it('retains version 2 qualification and media IDs when saving a labeled field', async () => {
    const v2 = { ...INITIAL_IELTS_ACADEMIC_MOCK, schemaVersion: 2 as const, allowedModes: ['PRACTICE' as const], qualification: { reviewedBy: 'Teacher One', reviewedAt: '2026-10-18T00:00:00.000Z', evidenceRevision: 'review-2', qualifiedModes: ['PRACTICE' as const] }, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map(part => ({ ...part, audioAssetId: '22222222-2222-4222-8222-222222222222', transcript: 'Retain this authored listening transcript.' })) } };
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [{ ...paper, draft: v2 }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.save).mockResolvedValue({ ...paper, draft: v2, draftRevision: 4 });
    render(<IeltsMockWorkspace />);
    fireEvent.change(await screen.findByLabelText('Paper title'), { target: { value: 'Edited v2 paper' } });
    expect(screen.getByLabelText('Reviewed by')).toHaveValue('Teacher One');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(adminIeltsMockClient.save).toHaveBeenCalled());
    const input = vi.mocked(adminIeltsMockClient.save).mock.calls[0]![1];
    expect(input.content).toEqual({ ...v2, title: 'Edited v2 paper' });
    expect(input.expectedRevision).toBe(3);
  });
  it('rejects invalid imports and leaves existing paper fields intact', async () => {
    render(<IeltsMockWorkspace />);
    await screen.findByLabelText('Paper title');
    fireEvent.click(screen.getByText('Import / export mock JSON'));
    fireEvent.change(screen.getByLabelText('Format 1 JSON content'), { target: { value: '{"schemaVersion":3}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import mock JSON' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid JSON');
    expect(screen.getByLabelText('Paper title')).toHaveValue(INITIAL_IELTS_ACADEMIC_MOCK.title);
    expect(screen.getByRole('button', { name: 'Validate' })).toBeDisabled();
  });
  it.each([false, true])('confirms named removal, then refreshes mocks (history: %s)', async history => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValueOnce({ items: [{ ...paper, versions: history ? [{ id: 'v1', version: 1, status: 'ARCHIVED', publishedAt: paper.updatedAt, archivedAt: paper.updatedAt }] : [] }], nextCursor: null }).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: paper.id, action: history ? 'archived' : 'deleted' });
    render(<IeltsMockWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: history ? 'Archive mock' : 'Delete draft' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(INITIAL_IELTS_ACADEMIC_MOCK.title);
    expect(adminContentLifecycleClient.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: history ? 'Confirm archive' : 'Confirm delete' }));
    expect(await screen.findByText('No authored mocks found.')).toBeVisible();
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledWith('mock', paper.id, expect.objectContaining({ expectedRevision: 3, expectedAction: history ? 'archived' : 'deleted' }));
  });
});

describe('IeltsMockWorkspace pagination', () => {
  it('provides owned recording playback to the teacher and blocks a V2 review missing a part', async () => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending).mockResolvedValue({ items: [{ id: 'attempt-2', learnerId: 'learner', revision: 1, responses: {}, submittedAt: null, mockTestVersion: { version: 2 }, policyVersion: 'v2', recordings: [{ id: 'audio-1', part: 1, durationSeconds: 20, createdAt: new Date().toISOString() }] }], nextCursor: null });
    render(<IeltsMockWorkspace />);
    const player = await screen.findByLabelText('Recorded Speaking part 1');
    expect(player).toHaveAttribute('src', '/api/v1/admin/ielts-mock-attempts/attempt-2/recordings/audio-1/content');
    fireEvent.change(screen.getByLabelText('Required next action'), { target: { value: 'Practice fluency' } });
    expect(screen.getByRole('button', { name: 'Complete teacher review' })).toBeDisabled();
  });
  it('shows Vietnamese loading before the pending workspace requests complete', async () => {
    vi.mocked(adminIeltsMockClient.list).mockReturnValue(new Promise(() => undefined));
    vi.mocked(adminIeltsMockClient.pending).mockReturnValue(new Promise(() => undefined));
    render(<LocaleProvider initialLocale="vi"><IeltsMockWorkspace /></LocaleProvider>);
    expect(await screen.findByText('Đang tải không gian bài thi thử...')).not.toBeNull();
    expect(screen.queryByText('Chưa có bài thi thử được biên soạn.')).toBeNull();
  });

  it('displays failed mock validation in Vietnamese with the technical field path and blocks publication', async () => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [{ id: '11111111-1111-4111-8111-111111111111', slug: 'mock-one', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending).mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(adminIeltsMockClient.validate).mockResolvedValue({ mockTestId: '11111111-1111-4111-8111-111111111111', draftRevision: 1, status: 'DRAFT', canPublish: false, issues: [{ path: 'writing.task1.prompt', message: 'Too small: expected string to have >=1 characters' }] });
    render(<LocaleProvider initialLocale="vi"><IeltsMockWorkspace /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Kiểm tra' }));
    expect(await screen.findByText('Nội dung bài thi thử không hợp lệ. Hãy kiểm tra trường này.')).not.toBeNull();
    expect(screen.getByText('writing.task1.prompt')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Xuất bản' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('Đã kiểm tra bản nháp.')).toBeNull();
  });

  it('preserves source and teacher feedback drafts while localizing the review controls', async () => {
    vi.mocked(adminIeltsMockClient.list).mockResolvedValue({ items: [{ id: 'mock-1', slug: 'mock-one', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending).mockResolvedValue({ items: [{ id: 'attempt-2', learnerId: 'learner', revision: 1, responses: { answer: 'My English response' }, submittedAt: null, mockTestVersion: { version: 2 } }], nextCursor: null });
    render(<LocaleProvider initialLocale="vi"><LocaleToggle /><IeltsMockWorkspace /></LocaleProvider>);
    const feedback = await screen.findByLabelText('Điểm mạnh');
    const source = screen.getByLabelText('Nội dung JSON định dạng 1');
    fireEvent.change(feedback, { target: { value: 'Keep this teacher feedback' } });
    fireEvent.change(source, { target: { value: '{unsaved English source' } });
    expect(screen.getByText(/My English response/)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Hoàn tất chấm bài' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByLabelText('Strengths')).toBe(feedback);
    expect((feedback as HTMLTextAreaElement).value).toBe('Keep this teacher feedback');
    expect(screen.getByLabelText('Format 1 JSON content')).toBe(source);
    expect((source as HTMLTextAreaElement).value).toBe('{unsaved English source');
  });
  it('loads subsequent mock and review pages when explicit next offsets exist', async () => {
    vi.mocked(adminIeltsMockClient.list)
      .mockResolvedValueOnce({ items: [{ id: 'mock-1', slug: 'mock-one', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: 'mock-cursor' })
      .mockResolvedValueOnce({ items: [{ id: 'mock-2', slug: 'mock-two', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending)
      .mockResolvedValueOnce({ items: [], nextCursor: 'review-cursor' })
      .mockResolvedValueOnce({ items: [{ id: 'attempt-2', learnerId: 'learner', revision: 1, responses: {}, submittedAt: null, mockTestVersion: { version: 2 } }], nextCursor: null });
    render(<IeltsMockWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Load more mocks' }));
    await waitFor(() => expect(adminIeltsMockClient.list).toHaveBeenLastCalledWith('mock-cursor'));
    expect(await screen.findByRole('option', { name: 'mock-two' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Load more reviews' }));
    await waitFor(() => expect(adminIeltsMockClient.pending).toHaveBeenLastCalledWith('review-cursor'));
    expect(await screen.findByRole('heading', { name: 'Attempt attempt- · version 2' })).not.toBeNull();
  });
});
