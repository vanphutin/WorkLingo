import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { adminDashboardClient } from '../../lib/api/admin-dashboard-client';
import { AdminDashboard } from './admin-dashboard';
import { apiClient } from '../../lib/api/api-client';

vi.mock('../../lib/api/admin-dashboard-client', () => ({ adminDashboardClient: { getOverview: vi.fn() } }));
vi.mock('../../lib/api/api-client', () => ({ apiClient: { listContentImports: vi.fn() } }));

const overview = {
  totalLearners: 120, activeLearners7d: 23, programEnrollments: 81, sessionCompletionRate: 0.625,
  programs: [
    { id: 'p1', slug: 'beginner', name: 'Foundation', availabilityStatus: 'AVAILABLE' as const, enrollments: 18, publishedMissions: 9, completedSessions: 5, totalSessions: 8 },
    { id: 'p2', slug: 'intermediate', name: 'Intermediate', availabilityStatus: 'AVAILABLE' as const, enrollments: 63, publishedMissions: 12, completedSessions: 10, totalSessions: 20 },
    { id: 'p3', slug: 'toeic', name: 'TOEIC', availabilityStatus: 'COMING_SOON' as const, enrollments: 0, publishedMissions: 0, completedSessions: 0, totalSessions: 0 },
    { id: 'p4', slug: 'ielts', name: 'IELTS', availabilityStatus: 'BETA' as const, enrollments: 0, publishedMissions: 2, completedSessions: 0, totalSessions: 0 },
  ],
  activity: [{ dateKey: '2026-10-14', startedSessions: 7, completedSessions: 3 }],
  recentActivity: [{ id: 's1', missionTitle: 'Office introductions', programName: 'Foundation', status: 'COMPLETED', updatedAt: '2026-10-14T10:00:00.000Z' }],
};

afterEach(() => { cleanup(); vi.resetAllMocks(); });
beforeEach(() => { vi.mocked(adminDashboardClient.getOverview).mockResolvedValue(overview); vi.mocked(apiClient.listContentImports).mockResolvedValue([]); });

describe('Admin dashboard', () => {
  it('places the topic authoring entry ahead of program metrics and shared tools', async () => {
    render(<AdminDashboard programSlug="intermediate" />);
    await screen.findByRole('heading', { name: 'Intermediate' });
    const metrics = screen.getByRole('list', { name: 'Program metrics' });
    const link = screen.getByRole('link', { name: 'Topics and lessons' });
    expect(link).toHaveAttribute('href', '/admin/programs/intermediate/topic-groups');
    expect(link.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('renders stored metrics, a labeled activity chart and recent sessions', async () => {
    render(<AdminDashboard />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    const metrics = screen.getByRole('list', { name: 'Overview metrics' });
    expect(metrics).toHaveTextContent('120');
    expect(metrics).toHaveTextContent('23');
    expect(metrics).toHaveTextContent('81');
    expect(metrics).toHaveTextContent('62.5%');
    expect(screen.getByRole('img', { name: /learning activity/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText('View chart data'));
    expect(screen.getByRole('table', { name: 'Daily session counts (UTC)' })).toHaveTextContent('7');
    expect(screen.getByRole('table', { name: 'Recent learning activity' })).toHaveTextContent('Office introductions');
    expect(screen.getByRole('table', { name: 'Recent learning activity' })).toHaveTextContent('Completed');
  });

  it('filters and sorts program data without changing the totals', async () => {
    render(<AdminDashboard />);
    const table = await screen.findByRole('table', { name: 'Program performance' });
    fireEvent.change(screen.getByLabelText('Sort programs'), { target: { value: 'enrollments' } });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Intermediate');
    fireEvent.change(screen.getByLabelText('Search programs'), { target: { value: 'foundation' } });
    expect(within(table).getByText('Foundation')).toBeInTheDocument();
    expect(within(table).queryByRole('link', { name: 'Foundation' })).not.toBeInTheDocument();
    expect(within(table).getByText('Planned for later')).toBeInTheDocument();
    expect(within(table).queryByRole('link', { name: 'Intermediate' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Overview metrics' })).toHaveTextContent('81');
    fireEvent.change(screen.getByLabelText('Search programs'), { target: { value: 'missing' } });
    expect(table).toHaveTextContent('No matching programs');
  });

  it('shows missing completion evidence and empty activity honestly', async () => {
    vi.mocked(adminDashboardClient.getOverview).mockResolvedValue({ ...overview, sessionCompletionRate: null, programs: [], activity: [], recentActivity: [] });
    render(<AdminDashboard />);
    expect(await screen.findByText('No started learning sessions yet')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByText('No session activity in this period')).toBeInTheDocument();
    expect(screen.getByText('No recent learning activity')).toBeInTheDocument();
  });

  it('offers a working retry after a failed dashboard request', async () => {
    vi.mocked(adminDashboardClient.getOverview).mockRejectedValueOnce(new Error('offline'));
    render(<AdminDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load administration data');
    expect(screen.queryByText('120')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Program performance' })).toBeInTheDocument();
  });

  it('scopes program metrics and explains unsupported management features', async () => {
    render(<AdminDashboard programSlug="intermediate" />);
    expect(await screen.findByRole('heading', { name: 'Intermediate' })).toBeInTheDocument();
    const metrics = screen.getByRole('list', { name: 'Program metrics' });
    expect(metrics).toHaveTextContent('63');
    expect(metrics).toHaveTextContent('12');
    expect(metrics).toHaveTextContent('50%');
    expect(metrics).not.toHaveTextContent('18');
    expect(screen.getByRole('link', { name: 'Levels and learning paths' })).toHaveAttribute('href', '/admin/curriculum');
    expect(screen.getByText(/shared tools.*program selector/i)).toBeInTheDocument();
    expect(screen.getByText(/individual learner progress.*not available/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'IELTS orientation' })).not.toBeInTheDocument();
  });

  it.each(['beginner', 'toeic'])('shows the deferred %s workspace without authoring links', async (programSlug) => {
    render(<AdminDashboard programSlug={programSlug} />);
    expect(await screen.findByText('Planned for later')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.queryByRole('link', { name: 'Lessons and activities' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Program metrics' })).not.toBeInTheDocument();
  });

  it('keeps exam tools reachable even while the learning program is unavailable', async () => {
    vi.mocked(adminDashboardClient.getOverview).mockResolvedValue({ ...overview, programs: overview.programs.map((p) => p.slug === 'ielts' ? { ...p, availabilityStatus: 'COMING_SOON' as const } : p) });
    render(<AdminDashboard programSlug="ielts" />);
    expect(await screen.findByRole('heading', { name: 'IELTS' })).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IELTS orientation' })).toHaveAttribute('href', '/admin/ielts-orientation');
    expect(screen.getByRole('link', { name: 'IELTS Full Mocks' })).toHaveAttribute('href', '/admin/ielts-mocks');
  });

  it('does not invent a workspace for an unknown or absent program', async () => {
    render(<AdminDashboard programSlug="unknown" />);
    expect(await screen.findByText('This program is not in the current catalog')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Program metrics' })).not.toBeInTheDocument();
  });

  it('translates the overview and controls into Vietnamese', async () => {
    render(<LocaleProvider initialLocale="vi"><AdminDashboard /></LocaleProvider>);
    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tìm chương trình')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Chỉ số tổng quan' })).toHaveTextContent('62,5%');
  });

  it('keeps paused sessions distinct from unknown statuses', async () => {
    vi.mocked(adminDashboardClient.getOverview).mockResolvedValue({ ...overview, recentActivity: [{ ...overview.recentActivity[0]!, status: 'PAUSED' }] });
    render(<AdminDashboard />);
    const table = await screen.findByRole('table', { name: 'Recent learning activity' });
    expect(table).toHaveTextContent('Paused');
    expect(table).not.toHaveTextContent('Other status');
  });

  it('changes program context without leaking the previous program metrics', async () => {
    const { rerender } = render(<AdminDashboard programSlug="beginner" />);
    await screen.findByRole('heading', { name: 'Foundation' });
    rerender(<AdminDashboard programSlug="intermediate" />);
    expect(screen.getByRole('heading', { name: 'Intermediate' })).toBeInTheDocument();
    const metrics = screen.getByRole('list', { name: 'Program metrics' });
    expect(metrics).toHaveTextContent('63');
    expect(metrics).toHaveTextContent('50%');
    expect(metrics).not.toHaveTextContent('18');
  });

  it('sorts by the program names actually displayed in the selected language', async () => {
    render(<LocaleProvider initialLocale="vi"><AdminDashboard /></LocaleProvider>);
    const table = await screen.findByRole('table', { name: 'Hiệu quả chương trình' });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('IELTS');
  });
});
