import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { NewContentImport } from './new-content-import';

const push = vi.fn();
const mockRouter = { push, replace: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      createContentImport: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('NewContentImport', () => {
  it('submits rawSource and navigates to the created import id', async () => {
    vi.mocked(apiClient.createContentImport).mockResolvedValueOnce({
      id: '99999999-9999-4999-8999-999999999999',
      lessonId: null,
      lessonVersionId: null,
      rawSource: 'FORMAT: WorkLingoLesson/1.0',
      sourceHash: 'hash-abc',
      status: 'DRAFT',
      draftRevision: 1,
      parserVersion: '1.0.0',
      validationHash: null,
      createdById: '22222222-2222-4222-8222-222222222222',
      updatedById: '22222222-2222-4222-8222-222222222222',
      createdAt: '2026-10-04T00:00:00.000Z',
      updatedAt: '2026-10-04T00:00:00.000Z',
    });

    render(<NewContentImport />);

    const textarea = screen.getByRole('textbox', { name: /lesson source/i });
    fireEvent.change(textarea, { target: { value: 'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: test' } });

    fireEvent.click(screen.getByRole('button', { name: /import draft/i }));

    await waitFor(() => {
      expect(apiClient.createContentImport).toHaveBeenCalledWith(
        'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: test',
      );
      expect(push).toHaveBeenCalledWith('/admin/content/99999999-9999-4999-8999-999999999999');
    });
  });

  it('displays error when creation fails', async () => {
    vi.mocked(apiClient.createContentImport).mockRejectedValueOnce(
      new ApiError({
        code: 'BAD_REQUEST',
        message: 'Raw source exceeds maximum limit',
        status: 400,
      }),
    );

    render(<NewContentImport />);

    const textarea = screen.getByRole('textbox', { name: /lesson source/i });
    fireEvent.change(textarea, { target: { value: 'short source' } });

    fireEvent.click(screen.getByRole('button', { name: /import draft/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/raw source exceeds maximum limit/i);
  });
});
