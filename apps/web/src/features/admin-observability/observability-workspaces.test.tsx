import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminAnalyticsClient } from '../../lib/api/admin-analytics-client';
import { adminOperationsClient } from '../../lib/api/admin-operations-client';
import { AnalyticsWorkspace } from './analytics-workspace';
import { OperationsWorkspace } from './operations-workspace';
import { LocaleProvider } from '../../i18n/provider';

describe('admin observability workspaces', () => {
  beforeEach(() => {
    vi.spyOn(adminOperationsClient, 'getSummary').mockResolvedValue({
      activeWorkers: 1,
      completedCount: 8,
      failedCount: 1,
      jobTypeBreakdown: {},
      queueDepth: 2,
      runningCount: 1,
      workerConfig: { leaseMs: 30_000, pollIntervalMs: 1_000, workerEnabled: true },
    });
    vi.spyOn(adminOperationsClient, 'listJobs').mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    vi.spyOn(adminAnalyticsClient, 'getPilotAnalytics').mockResolvedValue({
      definitions: [{ description: 'A learning session was completed.', eventType: 'LEARNING_SESSION_COMPLETED' }],
      from: '2026-10-01',
      metrics: [{ count: 4, dateKey: '2026-10-10', dimensions: {}, eventType: 'LEARNING_SESSION_COMPLETED' }],
      retention: {
        week1: { cohortSize: 10, retainedCount: 6, retentionRate: 0.6 },
        week4: { cohortSize: 5, retainedCount: 2, retentionRate: 0.4 },
      },
      to: '2026-10-12',
    });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('reserves all four summary cards while initial operations data is pending', () => {
    vi.mocked(adminOperationsClient.getSummary).mockReturnValue(new Promise(() => {}));
    render(<OperationsWorkspace />);
    const grid = screen.getByText('Queue depth').closest('.observability-grid');
    expect(grid).toHaveAttribute('aria-busy', 'true');
    expect(grid?.querySelectorAll('.metric-value')).toHaveLength(4);
    expect(grid).not.toHaveTextContent('0');
    expect(screen.getByRole('status')).toHaveTextContent('Loading operations');
  });

  it('localizes operations filters while retaining API status values', async () => {
    render(<LocaleProvider initialLocale="vi"><OperationsWorkspace /></LocaleProvider>);
    expect(await screen.findByText('Độ dài hàng đợi')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chờ thử lại' })).toHaveValue('RETRY_WAIT');
    expect(screen.getByText('Không có tác vụ phù hợp với bộ lọc.')).toBeInTheDocument();
  });

  it('localizes aggregate metrics and definitions without translating machine event codes', async () => {
    render(<LocaleProvider initialLocale="vi"><AnalyticsWorkspace /></LocaleProvider>);
    expect(await screen.findByText('Tỷ lệ quay lại tuần 1')).toBeInTheDocument();
    expect(screen.getByText('6/10 học viên đủ thời gian theo dõi')).toBeInTheDocument();
    expect(screen.getByText('LEARNING_SESSION_COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Một phiên học đã hoàn thành.')).toBeInTheDocument();
  });

  it('renders queue health and an honest empty state', async () => {
    render(<OperationsWorkspace />);
    expect((await screen.findByRole('table')).parentElement).toHaveAttribute('tabindex', '0');
    expect(await screen.findByText('Queue depth')).toBeInTheDocument();
    expect(screen.getByText('No jobs match these filters.')).toBeInTheDocument();
  });

  it('renders aggregate retention and event totals without learner identifiers', async () => {
    render(<AnalyticsWorkspace />);
    expect((await screen.findByRole('table')).parentElement).toHaveAttribute('tabindex', '0');
    expect(await screen.findByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.queryByText(/learner@example\.com|private spoken response/iu)).not.toBeInTheDocument();
  });
});
