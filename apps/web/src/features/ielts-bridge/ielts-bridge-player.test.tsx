import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import { IeltsBridgePlayer } from './ielts-bridge-player';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
}

vi.mock('../../lib/api/ielts-bridge-client', () => ({ ieltsBridgeClient: { start: vi.fn(), updateProgress: vi.fn() } }));
const moduleId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const stageTypes = ['introduction', 'assessment_purpose', 'analysed_example', 'guided_model', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice', 'feedback', 'review'] as const;
const stages = stageTypes.map((type, index) => ({ slug: `stage-${index + 1}`, type, title: `Stage ${index + 1}`, instruction: `Instruction ${index + 1}`, strategySteps: [], timeLimitSeconds: type === 'timed_practice' ? 60 : null, task: type === 'timed_practice' ? { kind: 'single_choice' as const, prompt: 'Choose the answer', options: ['A', 'B'] } : { kind: 'instruction' as const }, feedback: null }));
const module = { id: versionId, moduleId, version: 1, title: 'Listening foundations', description: 'Description', skill: 'listening' as const, questionType: 'listening_form_completion' as const, stages };
const baseProgress = { moduleId, moduleVersionId: versionId, currentStageIndex: 0, revision: 1, startedAt: new Date().toISOString(), completedAt: null, timedStageStartedAt: null, timedStageDeadlineAt: null, stageResults: [] };

describe('IeltsBridgePlayer', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ieltsBridgeClient.start).mockResolvedValue({ module, progress: baseProgress }); });
  afterEach(cleanup);

  it('localizes the stage and response requirements without replacing English drafts on locale change', async () => {
    vi.mocked(ieltsBridgeClient.start).mockResolvedValue({ module: { ...module, stages: stages.map((stage, index) => index === 0 ? { ...stage, task: { kind: 'short_text', prompt: 'Describe your routine.', minWords: 100 } } : stage) }, progress: baseProgress });
    render(<LocaleProvider initialLocale="vi"><SwitchLocale /><IeltsBridgePlayer moduleId={moduleId} /></LocaleProvider>);
    expect(await screen.findByRole('button', { name: 'Nộp giai đoạn' })).toBeDisabled();
    expect(screen.getByText('Tối thiểu 100 từ.')).toBeVisible();
    expect(screen.getByText('Giới thiệu')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Stage 1' })).toHaveAttribute('lang', 'en');
    const draft = screen.getByRole('textbox');
    fireEvent.change(draft, { target: { value: 'My English answer.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('textbox')).toBe(draft);
    expect(draft).toHaveValue('My English answer.');
    expect(screen.getByRole('button', { name: 'Submit stage' })).toBeEnabled();
  });

  it('resumes the pinned stage and advances with optimistic revision', async () => {
    vi.mocked(ieltsBridgeClient.updateProgress).mockResolvedValue({ progress: { ...baseProgress, currentStageIndex: 1, revision: 2, stageResults: [{ stageSlug: 'stage-1', correct: null, timedOut: false, submittedAt: new Date().toISOString() }] }, feedbackMessage: 'Keep building the routine.' });
    render(<IeltsBridgePlayer moduleId={moduleId} />);
    expect(await screen.findByRole('heading', { name: 'Stage 1' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Complete stage' }));
    await waitFor(() => expect(ieltsBridgeClient.updateProgress).toHaveBeenCalledWith(moduleId, { expectedRevision: 1, stageIndex: 0, completeStage: true }));
    expect(await screen.findByRole('heading', { name: 'Stage 2' })).not.toBeNull();
  });

  it('requires an explicit timer start before a timed answer can be submitted', async () => {
    vi.mocked(ieltsBridgeClient.start).mockResolvedValue({ module, progress: { ...baseProgress, currentStageIndex: 7, revision: 4 } });
    vi.mocked(ieltsBridgeClient.updateProgress).mockResolvedValue({ progress: { ...baseProgress, currentStageIndex: 7, revision: 5, timedStageStartedAt: new Date().toISOString(), timedStageDeadlineAt: new Date(Date.now() + 60_000).toISOString() }, feedbackMessage: null });
    render(<IeltsBridgePlayer moduleId={moduleId} />);
    expect((await screen.findByRole('button', { name: 'Submit stage' })).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Start 1 minute timer' }));
    await waitFor(() => expect(ieltsBridgeClient.updateProgress).toHaveBeenCalledWith(moduleId, { expectedRevision: 4, stageIndex: 7, startTimer: true }));
    expect(await screen.findByRole('timer')).not.toBeNull();
  });
});
