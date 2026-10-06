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
      roles: ['CONTENT_ADMIN'],
    });

    render(<AdminLayout>Admin Content</AdminLayout>);

    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute(
      'href',
      '/admin/content',
    );
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
        roles: ['CONTENT_ADMIN'],
      });

    render(<AdminLayout>Admin Content</AdminLayout>);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify your session/i);
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
  });
});
