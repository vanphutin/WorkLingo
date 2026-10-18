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

  it.each([
    ['en', 'Study Foundation', 'Check Foundation progress', 'Complete Foundation lessons on the dashboard, then assess your completed session in Checkpoint. Orientation opens after you pass all four skills.'],
    ['vi', 'Học nền tảng', 'Kiểm tra tiến độ Foundation', 'Học các bài nền tảng ở bảng điều khiển, sau đó đánh giá phiên đã hoàn thành trong mục Checkpoint. Phần Định hướng sẽ mở khi bạn đạt cả bốn kỹ năng.'],
  ] as const)('provides an actionable path to the existing Foundation lessons and checkpoint (%s)', async (locale, study, checkpoint, guidance) => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null, progress: null });
    render(<LocaleProvider initialLocale={locale}><OrientationDashboardCard /></LocaleProvider>);
    expect(await screen.findByRole('link', { name: study })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: checkpoint })).toHaveAttribute('href', '/mastery#checkpoint-heading');
    expect(screen.getByText(guidance)).toBeVisible();
    expect(screen.queryByRole('link', { name: /^(Start IELTS Orientation|Bắt đầu Định hướng IELTS)$/u })).toBeNull();
  });

  it.each([
    [['ONBOARDING_REQUIRED', 'INTERMEDIATE_ENROLLMENT_REQUIRED', 'FOUNDATION_CHECKPOINT_REQUIRED'], 'Complete setup', '/onboarding'],
    [['INTERMEDIATE_ENROLLMENT_REQUIRED', 'FOUNDATION_CHECKPOINT_REQUIRED'], 'Choose Intermediate', '/programs'],
  ] as const)('addresses the earliest prerequisite before sending an unprepared learner to Foundation (%j)', async (reasons, action, href) => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'locked', reasons: [...reasons], presentation: null, progress: null });
    render(<OrientationDashboardCard />);
    expect(await screen.findByRole('link', { name: action })).toHaveAttribute('href', href);
    expect(screen.queryByRole('link', { name: 'Check Foundation progress' })).toBeNull();
  });

  it('does not imply that learner practice resolves unavailable publication', async () => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'locked', reasons: ['ORIENTATION_NOT_PUBLISHED'], presentation: null, progress: null });
    render(<OrientationDashboardCard />);
    expect(await screen.findByText('IELTS Orientation is being prepared by the content team.')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Check Foundation progress' })).toBeNull();
  });
});
