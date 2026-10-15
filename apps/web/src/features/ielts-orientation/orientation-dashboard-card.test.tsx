import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import { OrientationDashboardCard } from './orientation-dashboard-card';
import { LocaleProvider } from '../../i18n/provider';

vi.mock('../../lib/api/ielts-orientation-client', () => ({ ieltsOrientationClient: { getStatus: vi.fn() } }));
afterEach(cleanup);

describe('OrientationDashboardCard', () => {
  it('explains the readiness gate in Vietnamese', async () => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null, progress: null });
    render(<LocaleProvider initialLocale="vi"><OrientationDashboardCard /></LocaleProvider>);
    expect(await screen.findByText('Hoàn thành bài kiểm tra nền tảng để mở khóa phần Định hướng IELTS.')).toBeVisible();
  });
  it('explains a locked checkpoint without presenting a false start action', async () => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null, progress: null });
    render(<OrientationDashboardCard />);
    expect(await screen.findByText('Complete your Foundation checkpoint to unlock IELTS Orientation.')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Start IELTS Orientation' })).toBeNull();
  });

  it('offers resume when saved progress exists', async () => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'in_progress', reasons: [], presentation: null, progress: { orientationVersionId: crypto.randomUUID(), currentSlideIndex: 3, revision: 4, answers: [], completedAt: null } });
    render(<OrientationDashboardCard />);
    expect(await screen.findByRole('link', { name: 'Resume IELTS Orientation' })).not.toBeNull();
    expect(screen.getByText('Resume from slide 4.')).not.toBeNull();
  });
});
