import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import LearnerLayout from './layout';

const replace = vi.fn();
const router = { push: vi.fn(), replace };

vi.mock('next/navigation', () => ({
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
});

describe('LearnerLayout', () => {
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
        roles: ['LEARNER'],
      });

    render(<LearnerLayout>Protected content</LearnerLayout>);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify your session/i);
    expect(screen.queryByText(/database host leaked/i)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });
});
