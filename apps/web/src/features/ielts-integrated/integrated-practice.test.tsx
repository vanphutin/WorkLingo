import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsIntegratedClient } from '../../lib/api/ielts-integrated-client';
import { IntegratedPracticeDashboardCard, IntegratedPracticePlayer } from './integrated-practice';

vi.mock('../../lib/api/ielts-integrated-client', () => ({ ieltsIntegratedClient: { availability: vi.fn(), get: vi.fn(), update: vi.fn() } }));
afterEach(cleanup);

describe('IntegratedPracticeDashboardCard', () => {
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
    vi.mocked(ieltsIntegratedClient.get).mockResolvedValue({ id: crypto.randomUUID(), plan: { durationMinutes: 60, difficulty: 'foundation', profileVersionId: crypto.randomUUID(), blocks: [
      { order: 1, skill: 'listening', targetMinutes: 15, moduleVersionId: block.moduleVersionId, questionType: block.questionType, mode: 'new_practice' },
      { order: 2, skill: 'reading', targetMinutes: 15, moduleVersionId: crypto.randomUUID(), questionType: 'reading_matching_headings', mode: 'new_practice' },
      { order: 3, skill: 'writing', targetMinutes: 20, moduleVersionId: crypto.randomUUID(), questionType: 'writing_task_2', mode: 'new_practice' },
      { order: 4, skill: 'speaking', targetMinutes: 10, moduleVersionId: crypto.randomUUID(), questionType: 'speaking_part_2_cue_card', mode: 'new_practice' },
    ] }, currentBlockIndex: 0, revision: 1, startedAt, completedAt: null, blocks: [block, { ...block, order: 2, skill: 'reading', startedAt: null }, { ...block, order: 3, skill: 'writing', startedAt: null }, { ...block, order: 4, skill: 'speaking', startedAt: null }] });
    render(<IntegratedPracticePlayer sessionId={crypto.randomUUID()} />);
    expect(await screen.findByRole('timer')).not.toBeNull();
  });
});
