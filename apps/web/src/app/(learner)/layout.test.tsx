import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import LearnerLayout from './layout';
import { LanguageSwitcher } from '../../components/language-switcher';
import { LocaleProvider } from '../../i18n/provider';

const replace = vi.fn();
const router = { push: vi.fn(), replace };
let pathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => router,
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
  pathname = '/dashboard';
});

describe('LearnerLayout', () => {
  it('clears the expired account so guest language switching remains usable after redirect', async () => {
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(new ApiError({ code: 'UNAUTHORIZED', status: 401, message: 'expired' }));
    render(<LocaleProvider initialLocale="vi" initialUserId="expired-account"><LanguageSwitcher /><LearnerLayout>Protected content</LearnerLayout></LocaleProvider>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('redirects unauthenticated learners without exposing server details', async () => {
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(
      new ApiError({ code: 'UNAUTHORIZED', message: 'internal auth details', status: 401 }),
    );

    render(<LearnerLayout>Protected content</LearnerLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText(/internal auth details/i)).not.toBeInTheDocument();
  });

  it('shows a retryable generic error for transient auth infrastructure failures', async () => {
    vi.mocked(apiClient.getCurrentUser)
      .mockRejectedValueOnce(
        new ApiError({ code: 'NETWORK_ERROR', message: 'database host leaked', status: 0 }),
      )
      .mockResolvedValueOnce({
        displayName: 'An Nguyen',
        email: 'an@example.test',
        id: '828a1927-c4fa-487f-93d5-96c556667869',
        onboardingStatus: 'COMPLETE',
        roles: ['LEARNER'],
      });

    render(<LearnerLayout>Protected content</LearnerLayout>);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify your session/i);
    expect(screen.queryByText(/database host leaked/i)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('redirects a pending learner away from ordinary learner routes', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      displayName: 'Minh Tran',
      email: 'minh@example.test',
      id: 'ea7c96fc-4360-4861-9340-2324b97bacb9',
      onboardingStatus: 'PENDING',
      roles: ['LEARNER'],
    });

    render(<LearnerLayout>Dashboard content</LearnerLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('allows a pending learner to use onboarding routes', async () => {
    pathname = '/onboarding';
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      displayName: 'Minh Tran',
      email: 'minh@example.test',
      id: 'c2c43608-7a78-4984-a8d0-33a768ce072b',
      onboardingStatus: 'PENDING',
      roles: ['LEARNER'],
    });

    render(<LearnerLayout>Onboarding content</LearnerLayout>);

    expect(await screen.findByText('Onboarding content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('groups learner preferences under one expandable settings destination', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({
      displayName: 'An Nguyen', email: 'an@example.test',
      id: '828a1927-c4fa-487f-93d5-96c556667869',
      onboardingStatus: 'COMPLETE', roles: ['LEARNER'],
    });
    render(<LearnerLayout>Dashboard content</LearnerLayout>);
    expect(await screen.findByRole('link', { name: 'Settings' }))
      .toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: 'Audio settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Programs' }))
      .toHaveAttribute('href', '/programs');
    expect(screen.getByLabelText('Signed in as An Nguyen')).toBeInTheDocument();
    expect(screen.queryByText('Learner:')).not.toBeInTheDocument();
  });
});
