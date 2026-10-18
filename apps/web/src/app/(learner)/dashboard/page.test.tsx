import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../lib/api/api-client';
import { engagementClient } from '../../../lib/api/engagement-client';
import { learningProgramClient } from '../../../lib/api/learning-program-client';
import { dashboardFixture } from '../../../features/learner-dashboard/dashboard.test-fixtures';
import DashboardPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const id = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.spyOn(apiClient, 'getProgress').mockResolvedValue({ currentLevelCode: 'B1_2', completedActivities: 3, activityAttempts: 4, sessions: { completed: 1, inProgress: 1, paused: 0, planned: 0 } });
  vi.spyOn(apiClient, 'getSessionAvailability').mockResolvedValue({ mission: { id, title: 'Next workplace mission' }, lessonVersionId: id, supportedDurations: [60], availableDurations: [60], defaultDurationMinutes: 60 });
  vi.spyOn(learningProgramClient, 'getContext').mockResolvedValue({ activeProgram: { id, slug: 'intermediate', name: 'Intermediate' }, enrollment: { id, revision: 1, currentLevel: { id, code: 'B1_2', name: 'Intermediate 2' } } });
  vi.spyOn(apiClient, 'getCurriculumRoadmap').mockResolvedValue({ programId: id, enrollmentId: id, items: [{ missionId: id, revisionId: id, title: 'Saved workplace mission', state: 'in_progress', activeSessionId: 'saved-session', objectives: [], unmetPrerequisites: [], reviewDue: false }] });
  vi.spyOn(engagementClient, 'getSummary').mockRejectedValue(new Error('Engagement offline'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(dashboardFixture)));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Learner dashboard page', () => {
  it('loads authenticated dashboard insights and preserves the saved session destination', async () => {
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Minh' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/v1/me/dashboard', { method: 'GET', credentials: 'include', cache: 'no-store' });
    expect(screen.getByRole('link', { name: 'Continue saved session' })).toHaveAttribute('href', '/sessions/saved-session');
    expect(within(screen.getByRole('region', { name: 'Your Learning Journey' })).getByText('Saved workplace mission')).toBeInTheDocument();
  });

  it('retries analytics independently while keeping resume available', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 })).mockResolvedValueOnce(Response.json(dashboardFixture));
    render(<DashboardPage />);
    const retry = await screen.findByRole('button', { name: 'Retry insights' });
    expect(screen.getByRole('link', { name: 'Continue saved session' })).toHaveAttribute('href', '/sessions/saved-session');
    fireEvent.click(retry);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Minh' })).toBeInTheDocument();
  });

  it('offers the catalog when session APIs have no active program', async () => {
    vi.mocked(learningProgramClient.getContext).mockResolvedValue({ activeProgram: null, enrollment: null });
    vi.mocked(apiClient.getProgress).mockRejectedValue(new Error('No program'));
    vi.mocked(apiClient.getSessionAvailability).mockRejectedValue(new Error('No program'));
    vi.mocked(apiClient.getCurriculumRoadmap).mockRejectedValue(new Error('No program'));
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...dashboardFixture, activeProgramSlug: null, programs: [], activity: [], accuracyTrend: [], skills: [] }));
    render(<DashboardPage />);
    expect(await screen.findByText('Choose a program to start learning.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View program catalog' })[0]).toHaveAttribute('href', '/programs');
    expect(screen.queryByText('FOUNDATION_1')).not.toBeInTheDocument();
  });

  it('rejects malformed dashboard score data instead of displaying invalid percentages', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...dashboardFixture, accuracyTrend: [{ dateKey: '2026-10-14', averageScore: 75, samples: 4 }] }));
    render(<DashboardPage />);
    expect(await screen.findByRole('button', { name: 'Retry insights' })).toBeInTheDocument();
    expect(screen.queryByText('7,500%')).not.toBeInTheDocument();
  });
});
