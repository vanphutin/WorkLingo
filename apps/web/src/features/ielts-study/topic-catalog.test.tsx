import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { ieltsStudyClient } from '../../lib/api/ielts-study-client';
import { TopicCatalog } from './topic-catalog';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../../lib/api/ielts-study-client', () => ({ ieltsStudyClient: { catalog: vi.fn(), start: vi.fn(), progress: vi.fn() } }));
const topicVersionId = '11111111-1111-4111-8111-111111111111';
const topic = { id: topicVersionId, topicVersionId, title: 'Education', description: 'Discuss learning in context.', activeSessionId: null, packs: [{ slug: 'ielts-education-foundation', difficulty: 'foundation' as const, supportedDurations: [90, 120] as (90 | 120 | 150)[], chunkCount: 12, contexts: [{ slug: 'ielts-course-advice', title: 'Choosing a course' }, { slug: 'ielts-study-group', title: 'Planning a study group' }], sampleChunks: [{ expression: 'entry requirements', meaning: 'điều kiện đầu vào', pronunciation: '/ˈentri/', example: 'Check the entry requirements before applying.' }] }] };
const progress = { completedSessionCount: 0, practicedChunkCount: 0, masteredChunkCount: 0, pendingEvaluationCount: 0, dueReviewCount: 0, skills: [] };
describe('IELTS topic catalogue', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ieltsStudyClient.catalog).mockResolvedValue({ topics: [topic], recommendations: [{ topicVersionId, reason: 'CHOOSE_YOUR_FIRST_TOPIC' }] }); vi.mocked(ieltsStudyClient.progress).mockResolvedValue(progress); });
  afterEach(cleanup);
  it('previews actual vocabulary, offers only authored durations and starts 90 minutes by default', async () => {
    vi.mocked(ieltsStudyClient.start).mockResolvedValue({ id: 'owned-session' } as never);
    render(<LocaleProvider initialLocale="vi"><TopicCatalog /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn chủ đề Education' }));
    expect(screen.getByText('entry requirements')).toBeVisible();
    expect(screen.getByText('Choosing a course')).toBeVisible();
    expect(screen.getByRole('option', { name: '150 phút' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu buổi học 90 phút' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/sessions/owned-session'));
    expect(ieltsStudyClient.start).toHaveBeenCalledWith({ clientSessionId: expect.any(String), topicVersionId, packSlug: 'ielts-education-foundation', durationMinutes: 90 });
  });
  it('retries an uncertain start using its same UUID', async () => {
    vi.mocked(ieltsStudyClient.start).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ id: 'same-session' } as never);
    render(<TopicCatalog />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose topic Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start 90-minute session' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Start 90-minute session' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/sessions/same-session'));
    expect(vi.mocked(ieltsStudyClient.start).mock.calls[1]![0]).toEqual(vi.mocked(ieltsStudyClient.start).mock.calls[0]![0]);
  });
  it('resumes an owned topic session and gives an empty catalogue a real next step', async () => {
    vi.mocked(ieltsStudyClient.catalog).mockResolvedValueOnce({ topics: [{ ...topic, activeSessionId: 'resume-id' }], recommendations: [] });
    const view = render(<TopicCatalog />);
    expect(await screen.findByRole('link', { name: 'Resume Education' })).toHaveAttribute('href', '/sessions/resume-id');
    view.unmount();
    vi.mocked(ieltsStudyClient.catalog).mockResolvedValue({ topics: [], recommendations: [] });
    render(<TopicCatalog />);
    expect(await screen.findByRole('link', { name: 'Explore IELTS introduction' })).toHaveAttribute('href', '/ielts/introduction');
  });
});
