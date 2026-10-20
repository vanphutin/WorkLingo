import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { IeltsMockCatalog, IeltsMockDashboardCard, IeltsMockPlayer } from './ielts-mock';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
}

vi.mock('../../lib/api/ielts-mock-client', () => ({ ieltsMockClient: { catalog: vi.fn(), start: vi.fn(), get: vi.fn(), save: vi.fn(), submit: vi.fn(), report: vi.fn(), pause: vi.fn(), resume: vi.fn(), review: vi.fn(), recordings: vi.fn(), playback: vi.fn(), currentPlayback: vi.fn(), uploadRecording: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

describe('IeltsMockDashboardCard', () => {
  it('offers exactly the two V3 choices and explains an unqualified simulation', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ flowVersion: 'v3', eligible: true, lockedReason: null, mocks: [{ id: crypto.randomUUID(), title: 'Practice paper', variant: 'ACADEMIC', version: 1, allowedModes: ['PRACTICE'], activeAttemptId: null }] });
    render(<IeltsMockCatalog />);
    const mode = await screen.findByLabelText('Test mode');
    expect(mode.closest('main')).toHaveClass('exam-surface', 'mock-page');
    expect(mode).toHaveValue('PRACTICE');
    expect(screen.queryByRole('option', { name: 'Learning' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Exam simulation' })).toBeDisabled();
    expect(screen.getByText('A reviewed simulation paper is not available yet.')).toBeVisible();
  });
  it('requires explicit equipment checks and rule confirmation before a new V3 attempt', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ flowVersion: 'v3', eligible: true, lockedReason: null, mocks: [{ id: crypto.randomUUID(), title: 'Practice', variant: 'ACADEMIC', version: 1, allowedModes: ['PRACTICE'], activeAttemptId: null }] });
    render(<IeltsMockCatalog />);
    const before = vi.mocked(ieltsMockClient.start).mock.calls.length;
    fireEvent.click(await screen.findByRole('button', { name: 'Start full mock' }));
    expect(await screen.findByRole('heading', { name: 'Check your equipment before starting' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Confirm and start' })).toBeDisabled();
    expect(ieltsMockClient.start).toHaveBeenCalledTimes(before);
  });
  it('shows real Speaking recording controls and prevents a text-only V3 submission', async () => {
    const id = crypto.randomUUID();
    vi.mocked(ieltsMockClient.recordings).mockResolvedValue([]);
    vi.mocked(ieltsMockClient.get).mockResolvedValue({ policyVersion: 'v2', elapsedMs: 0, pausedAt: null, id, mockTestVersionId: crypto.randomUUID(), mockTestVersion: 1, title: 'Practice paper', mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'SPEAKING', revision: 4, responses: {}, submittedSections: ['LISTENING','READING','WRITING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date().toISOString(), startedAt: new Date().toISOString(), submittedAt: null, sectionContent: { listening: [], reading: [], writing: [], speaking: [{ part: 1, title: 'Interview', prompts: ['Where do you live?'], preparationSeconds: 0, responseSeconds: 240 }] } });
    render(<IeltsMockPlayer attemptId={id} />);
    expect(await screen.findByRole('button', { name: 'Record answer' })).toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit full mock' })).toBeDisabled();
  });
  it('pauses a V3 practice attempt without submitting the current section', async () => {
    const attempt = { policyVersion: 'v2' as const, elapsedMs: 20_000, pausedAt: null, id: crypto.randomUUID(), mockTestVersionId: crypto.randomUUID(), mockTestVersion: 1, title: 'Practice paper', mode: 'PRACTICE' as const, status: 'IN_PROGRESS' as const, currentSection: 'READING' as const, revision: 2, responses: {}, submittedSections: ['LISTENING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date(Date.now() - 1000).toISOString(), startedAt: new Date().toISOString(), submittedAt: null, sectionContent: { listening: [], reading: [], writing: [], speaking: [] } };
    vi.mocked(ieltsMockClient.get).mockResolvedValue(attempt);
    vi.mocked(ieltsMockClient.pause).mockResolvedValue({ ...attempt, pausedAt: new Date().toISOString(), revision: 3 });
    render(<IeltsMockPlayer attemptId={attempt.id} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Pause practice' }));
    expect(await screen.findByRole('button', { name: 'Resume practice' })).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent('Elapsed time');
    expect(screen.getByRole('button', { name: 'Save progress' })).toBeDisabled();
  });
  it('opens a practice-only Beta mock in a supported mode without a disabled default action', async () => {
    const id = crypto.randomUUID();
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: true, lockedReason: null, mocks: [
      { id, title: 'Original Beta practice', variant: 'ACADEMIC', version: 1, allowedModes: ['LEARNING', 'PRACTICE'], activeAttemptId: null },
    ] });
    vi.mocked(ieltsMockClient.start).mockReturnValue(new Promise(() => undefined));
    render(<IeltsMockCatalog />);
    const start = await screen.findByRole('button', { name: 'Start full mock' });
    expect(start).toBeEnabled();
    expect(screen.getByLabelText('Test mode')).toHaveValue('LEARNING');
    expect(screen.queryByRole('option', { name: 'Exam simulation' })).not.toBeInTheDocument();
    fireEvent.click(start);
    expect(ieltsMockClient.start).toHaveBeenCalledWith({ mockTestId: id, mode: 'LEARNING', clientAttemptId: expect.any(String) });
  });
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
    vi.mocked(ieltsMockClient.get).mockResolvedValue({ id: 'attempt', mockTestVersionId: 'version', mockTestVersion: 1, policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null, title: 'Academic Mock', mode: 'PRACTICE', status: 'COMPLETED', currentSection: 'COMPLETE', revision: 5, responses: {}, submittedSections: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date().toISOString(), startedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), sectionContent: { listening: [], reading: [], writing: [], speaking: [] } });
    vi.mocked(ieltsMockClient.report).mockRejectedValue(new TypeError('Network failure'));
    render(<LocaleProvider initialLocale="vi"><IeltsMockPlayer attemptId="attempt" /></LocaleProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối. Kiểm tra kết nối rồi thử lại.');
    expect(screen.queryByRole('button', { name: 'Nộp phần này' })).toBeNull();
  });
  it('preserves English passages and answers when localized controls switch', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    vi.mocked(ieltsMockClient.get).mockResolvedValue({
      id, mockTestVersionId: '22222222-2222-4222-8222-222222222222', mockTestVersion: 1,
      policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null, title: 'Academic Mock', mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'READING', revision: 1,
      responses: { 'question-1': 'My saved answer' }, submittedSections: ['LISTENING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date(Date.now() + 60_000).toISOString(), startedAt: new Date().toISOString(), submittedAt: null,
      sectionContent: { listening: [], reading: [{ section: 1, title: 'English passage', passage: 'Preserve this supplied English passage.', questions: [{ id: 'question-1', order: 1, type: 'short_answer', prompt: 'What is the main idea?', options: [], competencyTags: ['reading_detail'] }] }], writing: [], speaking: [] },
    });
    render(<LocaleProvider initialLocale="vi"><SwitchLocale /><IeltsMockPlayer attemptId={id} /></LocaleProvider>);
    expect(await screen.findByRole('button', { name: 'Lưu tiến độ' })).toBeVisible();
    expect(screen.getByText('Preserve this supplied English passage.')).toHaveAttribute('lang', 'en');
    const answer = screen.getByRole('textbox');
    expect(answer).toHaveValue('My saved answer');
    expect(screen.getByText('Đã trả lời')).toBeVisible();
    fireEvent.change(answer, { target: { value: '' } });
    expect(screen.getByText('Chưa trả lời')).toBeVisible();
    fireEvent.change(answer, { target: { value: 'My saved answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('button', { name: 'Save progress' })).toBeVisible();
    expect(screen.getByRole('textbox')).toBe(answer);
    expect(answer).toHaveValue('My saved answer');
  });

  it('formats mock bands in Vietnamese and preserves the authored report disclosure', async () => {
    vi.mocked(ieltsMockClient.get).mockResolvedValue({ id: 'attempt', mockTestVersionId: 'version', mockTestVersion: 1, policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null, title: 'Academic Mock', mode: 'PRACTICE', status: 'COMPLETED', currentSection: 'COMPLETE', revision: 5, responses: {}, submittedSections: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: new Date().toISOString(), startedAt: new Date().toISOString(), submittedAt: new Date().toISOString(), sectionContent: { listening: [], reading: [], writing: [], speaking: [] } });
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
      policyVersion: 'legacy-v1', elapsedMs: 0, pausedAt: null, title: 'Academic Mock', mode: 'EXAM_SIMULATION', status: 'IN_PROGRESS', currentSection: 'LISTENING', revision: 1,
      responses: {}, submittedSections: [], sectionStartedAt: new Date().toISOString(), sectionDeadlineAt: future, startedAt: new Date().toISOString(), submittedAt: null,
      sectionContent: { listening: [{ part: 1, audioUrl: '/audio/part-1', questions: [] }], reading: [], writing: [], speaking: [] },
    });
    const { container } = render(<IeltsMockPlayer attemptId="11111111-1111-4111-8111-111111111111" />);

    const audio = await screen.findByText('Listening Part 1');
    expect(screen.getByText('Version 1 · Exam simulation')).toBeVisible();
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

it('recovers a committed save with a lost response while retaining newer local writing',async()=>{
  const attempt={id:crypto.randomUUID(),mockTestVersionId:crypto.randomUUID(),mockTestVersion:1,policyVersion:'v2' as const,elapsedMs:0,pausedAt:null,title:'Writing practice',mode:'PRACTICE' as const,status:'IN_PROGRESS' as const,currentSection:'WRITING' as const,revision:1,responses:{'writing-1':'initial'},submittedSections:['LISTENING','READING'],sectionStartedAt:new Date().toISOString(),sectionDeadlineAt:new Date().toISOString(),startedAt:new Date().toISOString(),submittedAt:null,sectionContent:{listening:[],reading:[],writing:[{task:1 as const,title:'Report',prompt:'Write your report.',minimumWords:150}],speaking:[]}};
  vi.mocked(ieltsMockClient.get).mockResolvedValueOnce(attempt).mockResolvedValue({...attempt,revision:2,responses:{'writing-1':'first draft'}});
  vi.mocked(ieltsMockClient.save).mockReset().mockRejectedValueOnce(new TypeError('response lost')).mockImplementation(async(_id,input)=>({...attempt,revision:3,responses:input.responses}));
  render(<IeltsMockPlayer attemptId={attempt.id}/>);
  const field=await screen.findByRole('textbox');fireEvent.change(field,{target:{value:'first draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Save progress'}));
  fireEvent.change(field,{target:{value:'newer local writing'}});
  await waitFor(()=>expect(ieltsMockClient.get).toHaveBeenLastCalledWith(attempt.id));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save progress'})).toBeEnabled());
  expect(field).toHaveValue('newer local writing');
  fireEvent.click(screen.getByRole('button',{name:'Save progress'}));
  await waitFor(()=>expect(ieltsMockClient.save).toHaveBeenLastCalledWith(attempt.id,{expectedRevision:2,responses:{'writing-1':'newer local writing'}}));
});
