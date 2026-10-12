import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminAnalyticsClient } from './admin-analytics-client';
import { AdminOperationsClient } from './admin-operations-client';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('admin observability clients', () => {
  it('requests filtered operation jobs and validates the response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ items: [], page: 2, pageSize: 20, total: 0, totalPages: 0 }),
      ok: true,
      status: 200,
    } as Response);
    const client = new AdminOperationsClient('/api/v1');
    await expect(client.listJobs({ page: 2, status: 'FAILED', type: 'TTS' })).resolves.toMatchObject({ page: 2 });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/operations/jobs?page=2&status=FAILED&type=TTS',
      { credentials: 'include' },
    );
  });

  it('requests aggregate-only pilot analytics for a bounded range', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        definitions: [],
        from: '2026-10-01',
        metrics: [],
        retention: {
          week1: { cohortSize: 0, retainedCount: 0, retentionRate: 0 },
          week4: { cohortSize: 0, retainedCount: 0, retentionRate: 0 },
        },
        to: '2026-10-12',
      }),
      ok: true,
      status: 200,
    } as Response);
    const client = new AdminAnalyticsClient('/api/v1');
    await expect(client.getPilotAnalytics('2026-10-01', '2026-10-12')).resolves.toMatchObject({ from: '2026-10-01' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/analytics/pilot?from=2026-10-01&to=2026-10-12',
      { credentials: 'include' },
    );
  });
});
