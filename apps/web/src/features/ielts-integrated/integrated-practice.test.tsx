import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsIntegratedClient } from '../../lib/api/ielts-integrated-client';
import { IntegratedPracticeDashboardCard, IntegratedPracticePlayer, IntegratedPracticeLauncher } from './integrated-practice';
import { LocaleProvider } from '../../i18n/provider';

vi.mock('../../lib/api/ielts-integrated-client', () => ({ ieltsIntegratedClient: { availability: vi.fn(), get: vi.fn(), update: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

describe('IntegratedPracticeDashboardCard', () => {
  it('localizes the duration and difficulty choices and dashboard access', async () => {
    vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, durations: [60, 90, 120, 150], difficulties: ['foundation', 'developing', 'competent', 'advanced'], activeSessionId: null });
    render(<LocaleProvider initialLocale="vi"><IntegratedPracticeLauncher /><IntegratedPracticeDashboardCard /></LocaleProvider>);
    expect(await screen.findByLabelText('Thời lượng')).toHaveValue('60');
    expect(screen.getByRole('option', { name: '60 phút' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'Nâng cao' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tạo buổi luyện tập tích hợp' })).toHaveAttribute('href', '/ielts/practice');
  });
  it('explains the Bridge gate without exposing a start action', async () => {
    vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: false, lockedReason: 'BRIDGE_REQUIRED', durations: [], difficulties: [], activeSessionId: null });
    render(<IntegratedPracticeDashboardCard />);
    expect(await screen.findByText('Complete IELTS Bridge to unlock integrated four-skill practice.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links directly to the immutable active session', async () => {
    const activeSessionId = crypto.randomUUID();
    vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, durations: [60, 90, 120, 150], difficulties: ['foundation', 'developing', 'competent', 'advanced'], activeSessionId });
    render(<IntegratedPracticeDashboardCard />);
    expect((await screen.findByRole('link', { name: 'Resume Integrated Practice' })).getAttribute('href')).toBe(`/ielts/practice/${activeSessionId}`);
  });
});

describe('IntegratedPracticePlayer', () => {
  it('shows a resumable accessible timer for the current block', async () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    const block = { order: 1, skill: 'listening' as const, targetMinutes: 15, moduleVersionId: crypto.randomUUID(), questionType: 'listening_form_completion' as const, mode: 'new_practice' as const, title: 'Listen for detail', instruction: 'Listen and identify the evidence.', task: { kind: 'instruction' as const }, startedAt, completedAt: null, correct: null, timedOut: null };
    const session: Awaited<ReturnType<typeof ieltsIntegratedClient.get>> = { id: crypto.randomUUID(), plan: { durationMinutes: 60, difficulty: 'foundation', profileVersionId: crypto.randomUUID(), blocks: [
      { order: 1, skill: 'listening', targetMinutes: 15, moduleVersionId: block.moduleVersionId, questionType: block.questionType, mode: 'new_practice' },
      { order: 2, skill: 'reading', targetMinutes: 15, moduleVersionId: crypto.randomUUID(), questionType: 'reading_matching_headings', mode: 'new_practice' },
      { order: 3, skill: 'writing', targetMinutes: 20, moduleVersionId: crypto.randomUUID(), questionType: 'writing_task_2', mode: 'new_practice' },
      { order: 4, skill: 'speaking', targetMinutes: 10, moduleVersionId: crypto.randomUUID(), questionType: 'speaking_part_2_cue_card', mode: 'new_practice' },
    ] }, currentBlockIndex: 0, revision: 1, startedAt, completedAt: null, blocks: [block, { ...block, order: 2, skill: 'reading' as const, startedAt: null }, { ...block, order: 3, skill: 'writing' as const, startedAt: null }, { ...block, order: 4, skill: 'speaking' as const, startedAt: null }] };
    vi.mocked(ieltsIntegratedClient.get).mockResolvedValue(session);
    render(<LocaleProvider initialLocale="vi"><IntegratedPracticePlayer sessionId={crypto.randomUUID()} /></LocaleProvider>);
    expect(await screen.findByRole('timer')).not.toBeNull();
    expect(screen.getByRole('timer')).toHaveTextContent('Thời gian còn lại của phần');
    expect(screen.getByRole('heading', { name: 'Listen for detail' })).toHaveAttribute('lang', 'en');
    expect(screen.getByText('Listen and identify the evidence.')).toHaveAttribute('lang', 'en');
  });

  it('clears feedback from the completed block when moving to the next skill', async () => {
    const startedAt = new Date().toISOString();
    const first = { order: 1, skill: 'listening' as const, targetMinutes: 15, moduleVersionId: crypto.randomUUID(), questionType: 'listening_form_completion' as const, mode: 'new_practice' as const, title: 'Listen', instruction: 'Listen carefully.', task: { kind: 'instruction' as const }, startedAt, completedAt: null, correct: null, timedOut: null };
    const second = { ...first, order: 2, skill: 'reading' as const, title: 'Read', instruction: 'Read carefully.', startedAt: null };
    const session = { id: crypto.randomUUID(), plan: { durationMinutes: 60 as const, difficulty: 'foundation' as const, profileVersionId: crypto.randomUUID(), blocks: [{ order: 1, skill: 'listening' as const, targetMinutes: 15, moduleVersionId: first.moduleVersionId, questionType: first.questionType, mode: first.mode }, { order: 2, skill: 'reading' as const, targetMinutes: 15, moduleVersionId: second.moduleVersionId, questionType: 'reading_matching_headings' as const, mode: first.mode }, { order: 3, skill: 'writing' as const, targetMinutes: 20, moduleVersionId: crypto.randomUUID(), questionType: 'writing_task_2' as const, mode: first.mode }, { order: 4, skill: 'speaking' as const, targetMinutes: 10, moduleVersionId: crypto.randomUUID(), questionType: 'speaking_part_2_cue_card' as const, mode: first.mode }] }, currentBlockIndex: 0, revision: 1, startedAt, completedAt: null, blocks: [first, second, { ...first, order: 3, skill: 'writing' as const, startedAt: null }, { ...first, order: 4, skill: 'speaking' as const, startedAt: null }] };
    vi.mocked(ieltsIntegratedClient.get).mockResolvedValue(session);
    vi.mocked(ieltsIntegratedClient.update).mockResolvedValue({ session: { ...session, currentBlockIndex: 1, revision: 2, blocks: [{ ...first, completedAt: new Date().toISOString() }, { ...second, startedAt }, session.blocks[2]!, session.blocks[3]!] }, feedbackMessage: 'Listening feedback from the previous block.', nextStep: null });
    render(<IntegratedPracticePlayer sessionId={session.id} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Complete block' }));
    expect(await screen.findByRole('heading', { name: 'Read' })).not.toBeNull();
    expect(screen.queryByText('Listening feedback from the previous block.')).toBeNull();
  });
});
