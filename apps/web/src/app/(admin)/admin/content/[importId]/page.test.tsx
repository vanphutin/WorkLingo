import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../../../../lib/api/api-client';
import { ApiError, apiClient } from '../../../../../lib/api/api-client';
import ContentImportDetailPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ importId: '123e4567-e89b-12d3-a456-426614174000' }),
}));

vi.mock('../../../../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getContentImport: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('ContentImportDetailPage', () => {
  it('renders loading state initially and then renders workspace on success', async () => {
    vi.mocked(apiClient.getContentImport).mockResolvedValueOnce({
      id: '123e4567-e89b-12d3-a456-426614174000',
      lessonId: null,
      lessonVersionId: null,
      rawSource: 'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: test',
      sourceHash: 'hash-1',
      status: 'DRAFT',
      draftRevision: 1,
      parserVersion: '1.0.0',
      validationHash: null,
      createdById: 'user-1',
      updatedById: 'user-1',
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    });

    render(<ContentImportDetailPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/đang tải/i);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /lesson source/i })).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
      expect(screen.getByText(/revision 1/i)).toBeInTheDocument();
    });
  });

  it('renders error alert when import fetching fails', async () => {
    vi.mocked(apiClient.getContentImport).mockRejectedValueOnce(
      new ApiError({
        code: 'NOT_FOUND',
        message: 'Content import not found',
        status: 404,
      }),
    );

    render(<ContentImportDetailPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/content import not found/i);
  });
});
