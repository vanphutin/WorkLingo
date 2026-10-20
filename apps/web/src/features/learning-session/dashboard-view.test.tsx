import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LearnerProgressDto } from '../../lib/api/api-client';
import { DashboardView } from './dashboard-view';
import { dashboardFixture } from '../learner-dashboard/dashboard.test-fixtures';
import { LocaleProvider } from '../../i18n/provider';

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

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('DashboardView', () => {
  it('shows learning first and reveals detailed sections only when selected', () => {
    render(<DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /start 60-minute session/i })).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/session duration/i), { target: { value: '45' } });
    expect(screen.queryByRole('article', { name: 'Intermediate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Learning activity' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    expect(screen.getByRole('heading', { name: 'Learning activity' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /start 60-minute session/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));
    expect(screen.getByRole('button', { name: /start 45-minute session/i })).toBeEnabled();
  });
  it('supports keyboard navigation and a shared link to the programs tab', () => {
    window.history.replaceState(null, '', '/dashboard#programs');
    render(<DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} />);
    const programs = screen.getByRole('tab', { name: 'Programs' });
    expect(programs).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('article', { name: 'Intermediate' })).toBeVisible();
    fireEvent.keyDown(programs, { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Today' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Study rhythm' })).toHaveFocus();
    expect(window.location.hash).toBe('#weekly');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Study rhythm' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Today' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Study rhythm' })).toHaveFocus();
  });
  it('personalizes the greeting and shows independent stored program completion', () => {
    render(<DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Minh');
    fireEvent.click(screen.getByRole('tab', { name: 'Programs' }));
    const intermediate = within(screen.getByRole('article', { name: 'Intermediate' }));
    expect(intermediate.getByText('3 of 12 lessons completed')).toBeInTheDocument();
    expect(intermediate.getByRole('progressbar', { name: 'Lesson completion' })).toHaveAttribute('value', '3');
    expect(intermediate.getByRole('progressbar', { name: 'Lesson completion' })).toHaveAttribute('max', '12');
    expect(within(screen.getByRole('article', { name: 'Foundation' })).getByText('10 of 10 lessons completed')).toBeInTheDocument();
    const ielts = within(screen.getByRole('article', { name: 'IELTS' }));
    expect(ielts.getByText('Coming soon')).toBeInTheDocument();
    expect(ielts.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(intermediate.getByRole('link')).toHaveAttribute('href', '/programs');
  });

  it('shows real UTC activity, accuracy ratios and only assessed skills with text equivalents', () => {
    render(<DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    expect(screen.getByText(/past 14 UTC days/i)).toBeInTheDocument();
    screen.getAllByText('View data table').forEach((summary) => fireEvent.click(summary));
    expect(within(screen.getByRole('table', { name: 'Learning activity' })).getByRole('row', { name: /2026-10-14 3 2/ })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Practice accuracy' })).getByRole('row', { name: /2026-10-14 75% 4/ })).toBeInTheDocument();
    const skills = within(screen.getByRole('table', { name: 'Assessed skills' }));
    expect(skills.getByRole('row', { name: /Reading 80% 5/ })).toBeInTheDocument();
    expect(skills.getByRole('row', { name: /Speaking Not assessed/ })).toBeInTheDocument();
    expect(screen.getByText('Strongest assessed skill: Reading')).toBeInTheDocument();
    expect(screen.getByText('Practice focus: Listening')).toBeInTheDocument();
    expect(screen.queryByText(/ielts band|toeic score/i)).not.toBeInTheDocument();
  });

  it('does not invent a program, level, mission or score for a learner without an active program', () => {
    render(<DashboardView progress={null} analytics={{ ...dashboardFixture, activeProgramSlug: null, activity: [], accuracyTrend: [], skills: [], programs: [] }} onStartSession={vi.fn()} />);
    expect(screen.queryByText('FOUNDATION_1')).not.toBeInTheDocument();
    expect(screen.queryByText('Introduce yourself to a new colleague')).not.toBeInTheDocument();
    expect(screen.getByText('Choose a program to start learning.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start.*session/i })).not.toBeInTheDocument();
    expect(screen.getByText('No active level yet')).toBeInTheDocument();
  });

  it('keeps a null active level and empty assessment data honest', () => {
    render(<DashboardView progress={mockProgress} analytics={{ ...dashboardFixture, accuracyTrend: [], skills: [], programs: [{ ...dashboardFixture.programs[0]!, currentLevelCode: null }] }} onStartSession={vi.fn()} />);
    expect(screen.queryByText('FOUNDATION_1')).not.toBeInTheDocument();
    expect(screen.getAllByText('No active level yet').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    expect(screen.getByText('Complete an evaluated activity to see accuracy.')).toBeInTheDocument();
    expect(screen.getByText('No skill assessments in this period.')).toBeInTheDocument();
  });

  it('does not show stale level or zero progress as facts when no progress is available', () => {
    render(<DashboardView progress={null} activeProgramSlug={null} onStartSession={vi.fn()} />);
    expect(screen.getByText('Choose a program to start learning.')).toBeInTheDocument();
    expect(screen.queryAllByText('0')).toHaveLength(0);
    expect(screen.queryByText('Curriculum roadmap')).not.toBeInTheDocument();
  });

  it('shows a published-mission milestone progress bar with the real denominator', () => {
    render(<DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} roadmap={{ programId: dashboardFixture.programs[0]!.id, enrollmentId: 'enrollment', items: [] }} />);
    expect(screen.getByRole('progressbar', { name: 'Next milestone' })).toHaveAttribute('value', '2');
    expect(screen.getByRole('progressbar', { name: 'Next milestone' })).toHaveAttribute('max', '8');
  });

  it('keeps session creation usable when analytics fails and offers an independent retry', async () => {
    const retry = vi.fn();
    render(<DashboardView progress={mockProgress} analytics={null} analyticsError="Network failure" onRetryAnalytics={retry} onStartSession={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load dashboard insights');
    fireEvent.click(screen.getByRole('button', { name: 'Retry insights' }));
    expect(retry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));
    expect(screen.getByRole('button', { name: /start 60-minute session/i })).toBeEnabled();
  });

  it('localizes the new dashboard insights in Vietnamese', () => {
    render(<LocaleProvider initialLocale="vi"><DashboardView progress={mockProgress} analytics={dashboardFixture} onStartSession={vi.fn()} /></LocaleProvider>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Chào Minh');
    fireEvent.click(screen.getByRole('tab', { name: 'Tiến độ' }));
    screen.getAllByText('Xem bảng dữ liệu').forEach((summary) => fireEvent.click(summary));
    expect(screen.getByRole('table', { name: 'Hoạt động học tập' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Chương trình' }));
    expect(screen.getByText('Đã hoàn thành 3 trên 12 bài học')).toBeInTheDocument();
  });

  it('makes the saved curriculum session the primary action instead of creating another session', () => {
    render(<DashboardView progress={mockProgress} onStartSession={vi.fn()} roadmap={{
      programId: '11111111-1111-4111-8111-111111111111',
      enrollmentId: '22222222-2222-4222-8222-222222222222',
      items: [{ missionId: '33333333-3333-4333-8333-333333333333',
        revisionId: '44444444-4444-4444-8444-444444444444', title: 'Saved mission',
        state: 'in_progress', activeSessionId: '55555555-5555-4555-8555-555555555555',
        reviewDue: false, unmetPrerequisites: [], objectives: [] }],
    }} />);
    expect(screen.getByRole('link', { name: 'Continue saved session' })).toHaveAttribute(
      'href', '/sessions/55555555-5555-4555-8555-555555555555');
    expect(screen.queryByRole('button', { name: /start .*session/i })).not.toBeInTheDocument();
  });
  it('shows the active program supplied by server context', () => {
    render(<DashboardView progress={mockProgress} onStartSession={vi.fn()} activeProgramName="Intermediate" />);
    expect(screen.getByText(/Active program:/)).toHaveTextContent('Intermediate');
    expect(screen.getByText(/Active program:/)).toHaveClass('stat-label');
    expect(screen.queryByRole('heading', { name: /learner dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /explore your ielts pathway/i })).not.toBeInTheDocument();
  });

  it('shows IELTS pathway cards only when IELTS is the active program', () => {
    render(<DashboardView progress={mockProgress} onStartSession={vi.fn()} activeProgramName="IELTS" />);
    expect(screen.queryByRole('heading', { name: /explore your ielts pathway/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Programs' }));
    expect(screen.getByRole('heading', { name: /explore your ielts pathway/i })).toBeInTheDocument();
  });
  it('links learners to the program catalog', () => {
    render(
      <DashboardView progress={mockProgress} onStartSession={vi.fn()} />,
    );

    expect(screen.getByRole('link', { name: 'Explore learning programs' }))
      .toHaveAttribute('href', '/programs');
  });

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
    expect(alert).toHaveTextContent(/content is not ready/i);
  });

  it('keeps dashboard and start button usable when engagement loading fails', async () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    const onRetryEngagement = vi.fn();

    render(
      <DashboardView
        progress={mockProgress}
        availableDurations={[45, 60]}
        nextMissionTitle="Introduce yourself to a new colleague"
        onStartSession={onStartSession}
        engagement={null}
        engagementLoading={false}
        engagementError="Failed to load engagement data"
        onRetryEngagement={onRetryEngagement}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Study rhythm' }));
    // Engagement error is surfaced
    expect(screen.getByText('Unable to load engagement progress')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));

    // Session launcher and Start button remain enabled and usable
    const startButton = screen.getByRole('button', { name: 'Start 60-Minute Session' });
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();

    fireEvent.click(startButton);
    await waitFor(() => {
      expect(onStartSession).toHaveBeenCalledWith(60, expect.any(String));
    });

    // Retry button reloads engagement
    fireEvent.click(screen.getByRole('tab', { name: 'Study rhythm' }));
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect(onRetryEngagement).toHaveBeenCalledTimes(1);
  });
});
