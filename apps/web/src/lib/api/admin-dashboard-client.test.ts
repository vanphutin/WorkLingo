import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardClient } from './admin-dashboard-client';
import { ApiError } from './api-client';

afterEach(() => vi.unstubAllGlobals());
const emptyOverview = { totalLearners: 0, activeLearners7d: 0, programEnrollments: 0, sessionCompletionRate: null, programs: [], activity: [], recentActivity: [] };

describe('AdminDashboardClient', () => {
  it('requests a fresh authenticated overview and validates zero/null data', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyOverview)));
    vi.stubGlobal('fetch', fetch);
    expect(await new AdminDashboardClient('/api/v1/').getOverview()).toEqual(emptyOverview);
    expect(fetch).toHaveBeenCalledWith('/api/v1/admin/analytics/overview', { credentials: 'include', cache: 'no-store' });
  });
  it('preserves server authorization error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'FORBIDDEN', message: ['Admin required'] }), { status: 403 })));
    await expect(new AdminDashboardClient().getOverview()).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403, message: 'Admin required' });
  });
  it('normalizes network failures to ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(new AdminDashboardClient().getOverview()).rejects.toBeInstanceOf(ApiError);
    await expect(new AdminDashboardClient().getOverview()).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
  it('rejects a malformed successful response instead of fabricating metrics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...emptyOverview, totalLearners: 'unknown' }))));
    await expect(new AdminDashboardClient().getOverview()).rejects.toThrow();
  });
});
