import '@testing-library/jest-dom/vitest';

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { apiClient } from '../../lib/api/api-client';
import { useEvaluation } from './use-evaluation';

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getEvaluation: vi.fn(),
      retryEvaluation: vi.fn(),
    },
  };
});

function Harness() {
  const { evaluation } = useEvaluation('00000000-0000-4000-8000-000000000001', 50);
  return <p>{evaluation?.status ?? 'loading'}</p>;
}

describe('useEvaluation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('polls while processing and stops after a terminal result', async () => {
    vi.useFakeTimers();
    vi.mocked(apiClient.getEvaluation)
      .mockResolvedValueOnce({
        attemptId: '00000000-0000-4000-8000-000000000001',
        status: 'processing', transcript: null, scores: null, score: null, feedback: null,
        retryable: false, recording: null, completedAt: null,
      })
      .mockResolvedValueOnce({
        attemptId: '00000000-0000-4000-8000-000000000001',
        status: 'evaluated', transcript: null, scores: null, score: 0.8,
        feedback: { summary: 'Done', strengths: [], improvements: [], correctedExample: null },
        retryable: false, recording: null, completedAt: '2026-10-08T08:00:00.000Z',
      });

    render(<Harness />);
    await act(async () => Promise.resolve());
    expect(screen.getByText('processing')).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(50));
    expect(screen.getByText('evaluated')).toBeInTheDocument();
    expect(apiClient.getEvaluation).toHaveBeenCalledTimes(2);

    await act(async () => vi.advanceTimersByTimeAsync(100));
    expect(apiClient.getEvaluation).toHaveBeenCalledTimes(2);
  });
});
