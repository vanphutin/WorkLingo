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
  it('disables Start when no durations are available', () => {
    render(<DashboardView progress={mockProgress} availableDurations={[]} onStartSession={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    expect(screen.getByText(/no sessions are available/i)).toBeInTheDocument();
  });

  it('honors availability changes and selects an available duration', () => {
    const start = vi.fn();
    const { rerender } = render(<DashboardView progress={mockProgress} availableDurations={[45]} onStartSession={start} />);
    expect(screen.getByLabelText(/session duration/i)).toHaveValue('45');
    rerender(<DashboardView progress={mockProgress} availableDurations={[]} onStartSession={start} />);
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    rerender(<DashboardView progress={mockProgress} availableDurations={[90]} onStartSession={start} />);
    expect(screen.getByLabelText(/session duration/i)).toHaveValue('90');
  });

  it('applies an empty 422 availability response instead of offering an invalid retry', async () => {
    const start = vi.fn().mockRejectedValue(Object.assign(new Error('No session available'), {
      status: 422, availableDurations: [],
    }));
    render(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
  });

  it('uses a fresh availability response even if it repeats the list from before a 422', async () => {
    const start = vi.fn().mockRejectedValue(Object.assign(new Error('No session available'), { status: 422, availableDurations: [] }));
    const { rerender } = render(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
    rerender(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    expect(screen.getByRole('button', { name: /start/i })).not.toBeDisabled();
  });

  it('invalidates the UUID when availability changes the selected duration, even if it changes back', async () => {
    const start = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(undefined);
    const { rerender } = render(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByRole('alert');
    rerender(<DashboardView progress={mockProgress} availableDurations={[45]} onStartSession={start} />);
    rerender(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1]?.[1]).not.toBe(start.mock.calls[0]?.[1]);
  });

  it('changes the request UUID after a 422 even when the duration stays available', async () => {
    const start = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Check availability'), { status: 422 }))
      .mockResolvedValueOnce(undefined);
    render(<DashboardView progress={mockProgress} availableDurations={[60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1]?.[1]).not.toBe(start.mock.calls[0]?.[1]);
  });

  it('changes the request UUID after selecting a different duration', async () => {
    const start = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(undefined);
    render(<DashboardView progress={mockProgress} availableDurations={[45, 60]} onStartSession={start} />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByRole('alert');
    fireEvent.change(screen.getByLabelText(/session duration/i), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
    expect(start.mock.calls[1]?.[0]).toBe(45);
    expect(start.mock.calls[1]?.[1]).not.toBe(start.mock.calls[0]?.[1]);
  });
  it('defaults duration to 60 minutes and indicates 45 and 60 are enabled while others explain insufficient content', () => {
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={vi.fn()}
        availableDurations={[45, 60]}
      />,
    );

    const durationSelect = screen.getByLabelText(/session duration/i) as HTMLSelectElement;
    expect(durationSelect.value).toBe('60');

    // 45 and 60 minutes are available
    const option45 = screen.getByRole('option', { name: /45 minutes/i }) as HTMLOptionElement;
    const option60 = screen.getByRole('option', { name: /60 minutes/i }) as HTMLOptionElement;
    const option90 = screen.getByRole('option', { name: /90 minutes/i }) as HTMLOptionElement;
    const option120 = screen.getByRole('option', { name: /120 minutes/i }) as HTMLOptionElement;
    const option150 = screen.getByRole('option', { name: /150 minutes/i }) as HTMLOptionElement;

    expect(option45).not.toBeDisabled();
    expect(option60).not.toBeDisabled();
    expect(option90).toBeDisabled();
    expect(option120).toBeDisabled();
    expect(option150).toBeDisabled();
    expect(option90.textContent).toMatch(/not enough practice available/i);
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

  it('triggers session creation with duration 60 and updates button label dynamically', async () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={onStartSession}
        availableDurations={[45, 60]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Start 60-Minute Session' })).toBeInTheDocument();

    const select = screen.getByLabelText(/session duration/i);
    fireEvent.change(select, { target: { value: '45' } });

    expect(screen.getByRole('button', { name: 'Start 45-Minute Session' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start 45-Minute Session' }));

    await waitFor(() => {
      expect(onStartSession).toHaveBeenCalledWith(45, expect.any(String));
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

  it('handles 422 INSUFFICIENT_CONTENT_FOR_DURATION error, surfaces message and resets pending key', async () => {
    const errorWithDurations = Object.assign(
      new Error('Lesson does not contain enough activities for 90 minutes'),
      {
        code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
        status: 422,
        availableDurations: [45, 60],
      },
    );

    const onStartSession = vi
      .fn()
      .mockRejectedValueOnce(errorWithDurations)
      .mockResolvedValueOnce(undefined);

    render(
      <DashboardView
        progress={mockProgress}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={onStartSession}
        availableDurations={[45, 60]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start 60-minute session/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not contain enough activities/i);
  });
});
