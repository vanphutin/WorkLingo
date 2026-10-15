import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import { IeltsMockWorkspace } from './ielts-mock-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

vi.mock('../../lib/api/admin-ielts-mock-client', () => ({ adminIeltsMockClient: { list: vi.fn(), pending: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn(), review: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('IeltsMockWorkspace pagination', () => {
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
