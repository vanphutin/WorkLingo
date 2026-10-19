import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../lib/api/api-client';
import { intermediateTopicClient } from '../../../lib/api/intermediate-topic-client';
import { learningProgramClient } from '../../../lib/api/learning-program-client';
import { dashboardFixture } from '../../../features/learner-dashboard/dashboard.test-fixtures';
import { overviewFixture } from '../../../features/learner-dashboard/overview.test-fixture';
import DashboardPage from './page';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(overviewFixture))); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });
describe('Learner dashboard overview', () => {
  it('retries failed progress without refetching healthy sections', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...overviewFixture, progress: { status: 'error', error: { code: 'DASHBOARD_SECTION_UNAVAILABLE', status: 503 } } }));
    const retry = vi.spyOn(apiClient, 'getProgress').mockResolvedValue(overviewFixture.progress.status === 'ready' ? overviewFixture.progress.data! : null!);
    vi.spyOn(learningProgramClient, 'getContext').mockResolvedValue(overviewFixture.programContext);
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Continue saved session' })).toBeVisible();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('refreshes the overview when program context changes during a focused retry', async () => {
    const changed = { ...overviewFixture.programContext, enrollment: { ...overviewFixture.programContext.enrollment!, revision: 2 } };
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...overviewFixture, progress: { status: 'error', error: { code: 'DASHBOARD_SECTION_UNAVAILABLE', status: 503 } } }))
      .mockResolvedValueOnce(Response.json({ ...overviewFixture, programContext: changed, analytics: { status: 'ready', data: { ...dashboardFixture, displayName: 'Lan' } } }));
    vi.spyOn(learningProgramClient, 'getContext').mockResolvedValueOnce(overviewFixture.programContext).mockResolvedValueOnce(changed);
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(overviewFixture.progress.status === 'ready' ? overviewFixture.progress.data! : null!);
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back, Lan' })).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('aborts on unmount and ignores a late response after a new page mounts', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(Response.json({ ...overviewFixture, analytics: { status: 'ready', data: { ...dashboardFixture, displayName: 'Lan' } } }));
    const first = render(<DashboardPage />);
    const signal = (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).signal;
    first.unmount();
    await act(async () => {});
    expect(signal?.aborted).toBe(true);
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Lan' })).toBeVisible();
    await act(async () => { finish(Response.json(overviewFixture)); });
    expect(screen.queryByRole('heading', { name: 'Welcome back, Minh' })).not.toBeInTheDocument();
  });
  it('shares the pending request across StrictMode effect replay', async () => {
    render(<StrictMode><DashboardPage /></StrictMode>);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Minh' })).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('loads initial dashboard with one request and no duplicate topic/progress requests', async () => {
    const progress = vi.spyOn(apiClient, 'getProgress'); const topics = vi.spyOn(intermediateTopicClient, 'list');
    render(<DashboardPage />);
    expect(await screen.findByRole('heading', { name: 'Welcome back, Minh' })).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/v1/me/dashboard/overview', { method: 'GET', credentials: 'include', cache: 'no-store', signal: expect.any(AbortSignal) });
    expect(progress).not.toHaveBeenCalled(); expect(topics).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Continue saved session' })).toHaveAttribute('href', '/sessions/11111111-1111-4111-8111-111111111111');
  });
  it('retries analytics independently while keeping the saved session available', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...overviewFixture, analytics: { status: 'error', error: { code: 'DASHBOARD_SECTION_UNAVAILABLE', status: 503 } } }))
      .mockResolvedValueOnce(Response.json(dashboardFixture));
    render(<DashboardPage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Progress' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry insights' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back, Minh' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Today' }));
    expect(screen.getByRole('link', { name: 'Continue saved session' })).toBeVisible();
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe('/api/v1/me/dashboard');
  });
  it('offers program selection without requiring progress or availability data', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...overviewFixture, programContext: { activeProgram: null, enrollment: null },
      progress: { status: 'ready', data: null }, availability: { status: 'ready', data: null }, roadmap: { status: 'ready', data: null },
      analytics: { status: 'ready', data: { ...dashboardFixture, activeProgramSlug: null, programs: [] } } }));
    render(<DashboardPage />);
    expect(await screen.findByText('Choose a program to start learning.')).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed bundled score data instead of showing invalid percentages', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...overviewFixture, analytics: { status: 'ready', data: { ...dashboardFixture, accuracyTrend: [{ dateKey: '2026-10-14', averageScore: 75, samples: 4 }] } } }));
    render(<DashboardPage />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByText('7,500%')).not.toBeInTheDocument();
  });
});
