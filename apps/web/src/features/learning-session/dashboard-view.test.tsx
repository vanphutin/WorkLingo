import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LearnerProgressDto } from '../../lib/api/api-client';
import { DashboardView } from './dashboard-view';

const mockProgress: LearnerProgressDto = {
  activityAttempts: 4,
  completedActivities: 3,
  currentLevelCode: 'FOUNDATION_1',
  sessions: {
    completed: 1,
    inProgress: 0,
    paused: 0,
    planned: 1,
  },
};

afterEach(cleanup);

describe('DashboardView', () => {
  it('defaults duration to 60 minutes and indicates other durations are unavailable', () => {
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={vi.fn()}
      />,
    );

    const durationSelect = screen.getByLabelText(/session duration/i) as HTMLSelectElement;
    expect(durationSelect.value).toBe('60');

    // Confirm 60 is the only active/supported duration in this increment
    expect(screen.getByText(/60 minutes \(foundation default\)/i)).toBeInTheDocument();
  });

  it('renders progress summary and next mission information', () => {
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={vi.fn()}
      />,
    );

    expect(screen.getByText('Introduce yourself to a new colleague')).toBeInTheDocument();
    expect(screen.getByText('FOUNDATION_1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // completed activities
  });

  it('triggers session creation with duration 60 when Start Session is clicked', async () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={onStartSession}
      />,
    );

    const startBtn = screen.getByRole('button', { name: /start 60-minute session/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(onStartSession).toHaveBeenCalledWith(60, expect.any(String));
    });
  });

  it('reuses the session idempotency key when creation is retried', async () => {
    const onStartSession = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(undefined);
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={onStartSession}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start 60-minute session/i }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /start 60-minute session/i }));

    await waitFor(() => expect(onStartSession).toHaveBeenCalledTimes(2));
    expect(onStartSession.mock.calls[0]?.[1]).toBeTruthy();
    expect(onStartSession.mock.calls[1]?.[1]).toBe(onStartSession.mock.calls[0]?.[1]);
  });
});
