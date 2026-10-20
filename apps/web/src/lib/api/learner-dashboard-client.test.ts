import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardFixture } from '../../features/learner-dashboard/dashboard.test-fixtures';
import { LearnerDashboardClient } from './learner-dashboard-client';

afterEach(() => vi.unstubAllGlobals());

describe('LearnerDashboardClient', () => {
  it('loads real dashboard data without caching private progress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(dashboardFixture)));
    const result = await new LearnerDashboardClient('/api/v1/').getAnalytics();
    expect(result.displayName).toBe('Minh');
    expect(result.programs[0]?.completedLessons).toBe(3);
    expect(fetch).toHaveBeenCalledWith('/api/v1/me/dashboard', { method: 'GET', credentials: 'include', cache: 'no-store' });
  });

  it('accepts an unassigned learner and genuinely empty evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ displayName: '', activeProgramSlug: null, programs: [], activity: [], accuracyTrend: [], skills: [] })));
    expect(await new LearnerDashboardClient().getAnalytics()).toEqual({ displayName: '', activeProgramSlug: null, programs: [], activity: [], accuracyTrend: [], skills: [] });
  });

  it.each([
    { accuracyTrend: [{ dateKey: '2026-10-14', averageScore: 75, samples: 4 }] },
    { skills: [{ skill: 'speaking', averageScore: 0.7, samples: 0 }] },
    { programs: [{ ...dashboardFixture.programs[0], completedLessons: -1 }] },
  ])('rejects invalid metrics rather than inventing usable values: %j', async (override) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...dashboardFixture, ...override })));
    await expect(new LearnerDashboardClient().getAnalytics()).rejects.toThrow();
  });

  it('preserves authentication failures as ApiErrors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ code: 'UNAUTHORIZED', message: 'Sign in required', privateData: 'ignored' }, { status: 401 })));
    await expect(new LearnerDashboardClient().getAnalytics()).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401, message: 'Sign in required' });
  });

  it('handles unavailable non-JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    await expect(new LearnerDashboardClient().getAnalytics()).rejects.toMatchObject({ code: 'API_ERROR', status: 502 });
  });

  it('provides a safe network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network detail')));
    await expect(new LearnerDashboardClient().getAnalytics()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0, message: 'Unable to reach dashboard insights.' });
  });
});
