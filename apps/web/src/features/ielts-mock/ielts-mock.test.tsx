import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { IeltsMockDashboardCard, IeltsMockPlayer } from './ielts-mock';

vi.mock('../../lib/api/ielts-mock-client', () => ({ ieltsMockClient: { catalog: vi.fn(), get: vi.fn(), save: vi.fn(), submit: vi.fn(), report: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

describe('IeltsMockDashboardCard', () => {
  it('explains the Band Pathway gate and does not offer a start link', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    render(<IeltsMockDashboardCard />);
    expect(await screen.findByText('Start your IELTS Band Pathway before taking a full mock.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('IeltsMockPlayer', () => {
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
