import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import AdminLayout from './layout';

const replace = vi.fn();
const push = vi.fn();
const mockRouter = { push, replace };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/admin/content',
}));

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getCurrentUser: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AdminLayout', () => {
  it('preserves legacy and approved feature destinations without duplicates for SYSTEM_ADMIN', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222',
      email: 'admin@worklingo.test', displayName: 'Admin User', onboardingStatus: null, roles: ['SYSTEM_ADMIN'] });
    render(<AdminLayout>Administrative work</AdminLayout>);
    await screen.findByText('Administrative work');
    const nav = screen.getByRole('navigation', { name: 'Admin workspace' });
    const destinations = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(destinations).toEqual(expect.arrayContaining([
      '/admin', '/admin/programs/intermediate', '/admin/programs/ielts',
      '/admin/programs/intermediate/topic-groups', '/admin/programs/intermediate/topics',
      ...['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'].map(category => `/admin/programs/intermediate/${category}`),
      '/admin/ielts-topics',
      '/admin/content', '/admin/curriculum', '/admin/ielts-orientation', '/admin/ielts-bridge',
      '/admin/ielts-integrated', '/admin/ielts-mocks', '/admin/ielts-band-curriculum', '/admin/audit',
      '/admin/operations', '/admin/analytics', '/admin/settings/audio', '/admin/settings/ai', '/dashboard',
    ]));
    expect(destinations).toHaveLength(26);
    expect(screen.getByRole('link', { name: 'Skip to administrative content' })).toHaveAttribute('href', '#admin-main-content');
    expect(replace).not.toHaveBeenCalled();
  });
  it('redirects unauthenticated users to /login', async () => {
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(
      new ApiError({ code: 'UNAUTHORIZED', message: 'Auth required', status: 401 }),
    );

    render(<AdminLayout>Admin Content</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects learners without admin roles to /dashboard', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'learner@worklingo.test',
      displayName: 'Learner User',
      onboardingStatus: 'COMPLETE',
      roles: ['LEARNER'],
    });

    render(<AdminLayout>Admin Content</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders admin navigation and children for authorized CONTENT_ADMIN', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'admin@worklingo.test',
      displayName: 'Admin User',
      onboardingStatus: null,
      roles: ['CONTENT_ADMIN'],
    });

    render(<AdminLayout>Admin Content</AdminLayout>);

    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('navigation', { name: 'Admin workspace' })).toHaveTextContent('Content & curriculum');
    expect(screen.getByRole('navigation', { name: 'Admin workspace' })).toHaveTextContent('Workspace operations');
    expect(screen.queryByRole('link', { name: 'Foundation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Intermediate' })).toHaveAttribute('href', '/admin/programs/intermediate');
    expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveTextContent('Content');
    expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute(
      'href',
      '/admin/content',
    );
    expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Curriculum' })).toHaveAttribute(
      'href',
      '/admin/curriculum',
    );
    expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute(
      'href',
      '/admin/audit',
    );
    expect(screen.getByRole('link', { name: 'Operations' })).toHaveAttribute(
      'href',
      '/admin/operations',
    );
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'href',
      '/admin/analytics',
    );
    expect(screen.getByRole('link', { name: 'Audio settings' }))
      .toHaveAttribute('href', '/admin/settings/audio');
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows retryable error screen on auth infrastructure failure without redirect', async () => {
    vi.mocked(apiClient.getCurrentUser)
      .mockRejectedValueOnce(
        new ApiError({ code: 'NETWORK_ERROR', message: 'Connection dropped', status: 0 }),
      )
      .mockResolvedValueOnce({
        id: '22222222-2222-4222-8222-222222222222',
        email: 'admin@worklingo.test',
        displayName: 'Admin User',
        onboardingStatus: null,
        roles: ['CONTENT_ADMIN'],
      });

    render(<AdminLayout>Admin Content</AdminLayout>);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify your session/i);
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
  });
});
