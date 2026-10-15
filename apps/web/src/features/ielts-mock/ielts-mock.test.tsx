import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { IeltsMockCatalog, IeltsMockDashboardCard, IeltsMockPlayer } from './ielts-mock';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
}

vi.mock('../../lib/api/ielts-mock-client', () => ({ ieltsMockClient: { catalog: vi.fn(), get: vi.fn(), save: vi.fn(), submit: vi.fn(), report: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

describe('IeltsMockDashboardCard', () => {
  it('explains an empty eligible mock catalog in Vietnamese', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: true, lockedReason: null, mocks: [] });
    render(<LocaleProvider initialLocale="vi"><IeltsMockCatalog /></LocaleProvider>);
    expect(await screen.findByText('Chưa có bài thi thử đầy đủ nào khả dụng.')).toBeVisible();
  });
  it('localizes the catalog and dashboard gate', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    render(<LocaleProvider initialLocale="vi"><IeltsMockCatalog /><IeltsMockDashboardCard /></LocaleProvider>);
    expect(await screen.findByRole('heading', { name: 'Bài thi thử đang khóa' })).toBeVisible();
    expect(screen.getAllByText('Bắt đầu Lộ trình Band IELTS trước khi làm bài thi thử đầy đủ.')).toHaveLength(2);
  });
  it('explains the Band Pathway gate and does not offer a start link', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    render(<IeltsMockDashboardCard />);
    expect(await screen.findByText('Start your IELTS Band Pathway before taking a full mock.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('IeltsMockPlayer', () => {
  it('shows a localized report failure without exposing completed-section submission controls', async () => {
    vi.mocked(ieltsMockClient.get).mockResolvedValue({ id: 'attempt', mockTestVersionId: 'version', mockTestVersion: 1, title: 'Academic Mock', mode: 'PRACTICE', status: 'COMPLETED', currentSection: 'COMPLETE', revision: 5, responses: {}, submittedSections: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date().toISOString(), startedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), sectionContent: { listening: [], reading: [], writing: [], speaking: [] } });
    vi.mocked(ieltsMockClient.report).mockRejectedValue(new TypeError('Network failure'));
    render(<LocaleProvider initialLocale="vi"><IeltsMockPlayer attemptId="attempt" /></LocaleProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối. Kiểm tra kết nối rồi thử lại.');
    expect(screen.queryByRole('button', { name: 'Nộp phần này' })).toBeNull();
  });
  it('preserves English passages and answers when localized controls switch', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    vi.mocked(ieltsMockClient.get).mockResolvedValue({
      id, mockTestVersionId: '22222222-2222-4222-8222-222222222222', mockTestVersion: 1,
      title: 'Academic Mock', mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'READING', revision: 1,
      responses: { 'question-1': 'My saved answer' }, submittedSections: ['LISTENING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date(Date.now() + 60_000).toISOString(), startedAt: new Date().toISOString(), submittedAt: null,
      sectionContent: { listening: [], reading: [{ section: 1, title: 'English passage', passage: 'Preserve this supplied English passage.', questions: [{ id: 'question-1', order: 1, type: 'short_answer', prompt: 'What is the main idea?', options: [], competencyTags: ['reading_detail'] }] }], writing: [], speaking: [] },
    });
    render(<LocaleProvider initialLocale="vi"><SwitchLocale /><IeltsMockPlayer attemptId={id} /></LocaleProvider>);
    expect(await screen.findByRole('button', { name: 'Lưu tiến độ' })).toBeVisible();
    expect(screen.getByText('Preserve this supplied English passage.')).toHaveAttribute('lang', 'en');
    const answer = screen.getByRole('textbox');
    expect(answer).toHaveValue('My saved answer');
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('button', { name: 'Save progress' })).toBeVisible();
    expect(screen.getByRole('textbox')).toBe(answer);
    expect(answer).toHaveValue('My saved answer');
  });

  it('formats mock bands in Vietnamese and preserves the authored report disclosure', async () => {
    vi.mocked(ieltsMockClient.get).mockResolvedValue({ id: 'attempt', mockTestVersionId: 'version', mockTestVersion: 1, title: 'Academic Mock', mode: 'PRACTICE', status: 'COMPLETED', currentSection: 'COMPLETE', revision: 5, responses: {}, submittedSections: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date().toISOString(), startedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), sectionContent: { listening: [], reading: [], writing: [], speaking: [] } });
    vi.mocked(ieltsMockClient.report).mockResolvedValue({ attemptId: 'attempt', status: 'COMPLETED', scoringPolicyVersion: 1, disclosure: 'Authored disclosure remains unchanged.', skills: { listening: { status: 'SCORED', rawScore: 30, mockBand: 6.5 }, reading: { status: 'SCORED', rawScore: 30, mockBand: 6.5 }, writing: { status: 'TEACHER_REVIEWED', rawScore: null, mockBand: 6.5 }, speaking: { status: 'TEACHER_REVIEWED', rawScore: null, mockBand: 6.5 } }, overallMockBand: 6.5, strengths: [], gaps: [], nextActions: ['Teacher-authored action'], completedAt: new Date().toISOString() });
    render(<LocaleProvider initialLocale="vi"><IeltsMockPlayer attemptId="attempt" /></LocaleProvider>);
    expect(await screen.findByRole('heading', { name: 'Band tổng thể bài thi thử 6,5' })).toBeVisible();
    expect(screen.getByText('Authored disclosure remains unchanged.')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('Teacher-authored action')).toHaveAttribute('lang', 'en');
  });
  it('does not preload exam audio and removes it after the allowed play', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    vi.mocked(ieltsMockClient.get).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', mockTestVersionId: '22222222-2222-4222-8222-222222222222', mockTestVersion: 1,
      title: 'Academic Mock', mode: 'EXAM_SIMULATION', status: 'IN_PROGRESS', currentSection: 'LISTENING', revision: 1,
      responses: {}, submittedSections: [], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: future, startedAt: new Date().toISOString(), submittedAt: null,
      sectionContent: { listening: [{ part: 1, audioUrl: '/audio/part-1', questions: [] }], reading: [], writing: [], speaking: [] },
    });
    const { container } = render(<IeltsMockPlayer attemptId="11111111-1111-4111-8111-111111111111" />);

    const audio = await screen.findByText('Listening Part 1');
    expect(audio.getAttribute('preload')).toBe('none');
    (audio as HTMLAudioElement).currentTime = 5;
    fireEvent.timeUpdate(audio);
    (audio as HTMLAudioElement).currentTime = 1;
    fireEvent.seeking(audio);
    expect((audio as HTMLAudioElement).currentTime).toBe(5);
    fireEvent.ended(audio);
    expect(container.querySelector('audio')).toBeNull();
    expect(screen.getByText('Listening Part 1 completed. Replay is disabled in Exam Simulation.')).not.toBeNull();
  });
});
