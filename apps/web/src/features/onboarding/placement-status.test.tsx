import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EvaluationDto, OnboardingStateDto, PlacementAttemptDto } from '@worklingo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';
import { PlacementStatus } from './placement-status';

const push = vi.fn();
const router = { push, replace: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../../lib/api/onboarding-client', () => ({
  onboardingClient: {
    confirmPlacement: vi.fn(),
    getPlacementAttempt: vi.fn(),
  },
}));
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

const attemptId = '2a57d8f0-3a6c-4ecb-807b-2a7bef85f470';
const retryAttemptId = '95144a54-8866-46d3-bf99-8353340e3e88';

const actionRequired: PlacementAttemptDto = {
  clientAttemptId: '50953836-1c31-4fcb-84f6-ab12fa26f11d',
  confirmedAt: null,
  createdAt: '2026-10-10T00:00:00.000Z',
  explanation: null,
  id: attemptId,
  learningSessionId: 'ea7579e6-b63e-46cf-82c3-383de7cf5447',
  lessonVersionId: '1cfeb90b-ac46-4b46-9eb5-a5c05d394b00',
  nextAction: 'retry_evaluation',
  policyVersion: 'workplace-placement-v1',
  recommendedLevelCode: null,
  retryableAttemptIds: [retryAttemptId],
  skillResults: {
    listening: { evidenceCount: 1, score: 0.75, status: 'evaluated' },
    reading: { evidenceCount: 0, score: null, status: 'pending' },
    speaking: { evidenceCount: 0, score: null, status: 'action_required' },
    writing: { evidenceCount: 1, score: 0.7, status: 'evaluated' },
  },
  status: 'ACTION_REQUIRED',
  updatedAt: '2026-10-10T00:02:00.000Z',
};

const recommended: PlacementAttemptDto = {
  ...actionRequired,
  explanation: {
    candidateDecisions: [{
      eligible: true,
      levelCode: 'FOUNDATION_1',
      reason: 'All four skill minima are met.',
    }],
    policyVersion: 'workplace-placement-v1',
    reasons: ['Four evaluated skills support the safe Foundation starting point.'],
    skillResults: {
      listening: { evidenceCount: 1, score: 0.75, status: 'evaluated' },
      reading: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
      speaking: { evidenceCount: 1, score: 0.72, status: 'evaluated' },
      writing: { evidenceCount: 2, score: 0.7, status: 'evaluated' },
    },
    summary: 'Foundation 1 is the current recommendation.',
  },
  nextAction: 'review_recommendation',
  recommendedLevelCode: 'FOUNDATION_1',
  retryableAttemptIds: [],
  skillResults: {
    listening: { evidenceCount: 1, score: 0.75, status: 'evaluated' },
    reading: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
    speaking: { evidenceCount: 1, score: 0.72, status: 'evaluated' },
    writing: { evidenceCount: 2, score: 0.7, status: 'evaluated' },
  },
  status: 'RECOMMENDED',
};

const failedEvaluation: EvaluationDto = {
  attemptId: retryAttemptId,
  completedAt: null,
  feedback: null,
  recording: null,
  retryable: true,
  score: null,
  scores: null,
  status: 'evaluation_failed',
  transcript: null,
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('PlacementStatus', () => {
  it('shows all four evidence states and reuses EvaluationFeedback for retry', async () => {
    vi.mocked(apiClient.getEvaluation).mockResolvedValue(failedEvaluation);
    vi.mocked(apiClient.retryEvaluation).mockResolvedValue({
      ...failedEvaluation,
      retryable: false,
      status: 'queued',
    });
    vi.mocked(onboardingClient.getPlacementAttempt).mockResolvedValue(actionRequired);

    render(<PlacementStatus initialAttempt={actionRequired} />);

    expect(screen.getByRole('heading', { name: /assessment evidence/i })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Evaluated: 75%')).toBeInTheDocument();
    expect(screen.getByText('Waiting for evidence')).toBeInTheDocument();
    expect(screen.getByText('Action required')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử đánh giá lại' }));
    await waitFor(() => expect(apiClient.retryEvaluation).toHaveBeenCalledWith(retryAttemptId));
  });

  it('polls only processing state and stops after recommendation arrives', async () => {
    vi.mocked(onboardingClient.getPlacementAttempt).mockResolvedValue(recommended);

    render(
      <PlacementStatus
        initialAttempt={{
          ...actionRequired,
          nextAction: 'wait_for_evaluation',
          retryableAttemptIds: [],
          status: 'PROCESSING',
        }}
        pollIntervalMs={1}
      />,
    );

    expect(await screen.findByRole('heading', { name: /foundation 1 is the current recommendation/i }))
      .toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onboardingClient.getPlacementAttempt).toHaveBeenCalledTimes(1);
  });

  it('renders sample counts and preserves confirmation UUID after an uncertain failure', async () => {
    vi.mocked(onboardingClient.confirmPlacement)
      .mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', message: 'reset', status: 0 }))
      .mockResolvedValueOnce({
        activePlacementAttempt: null,
        currentLevelCode: 'FOUNDATION_1',
        eligibleLevels: [],
        nextAction: 'open_dashboard',
        onboardingMethod: 'PLACEMENT',
        onboardingStatus: 'COMPLETE',
      } satisfies OnboardingStateDto);

    render(<PlacementStatus initialAttempt={recommended} />);

    expect(screen.getByRole('heading', { name: /foundation 1 is the current recommendation/i }))
      .toBeInTheDocument();
    expect(screen.getByText('2 samples')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm recommended level/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not confirm/i);
    fireEvent.click(screen.getByRole('button', { name: /try confirmation again/i }));

    await waitFor(() => expect(onboardingClient.confirmPlacement).toHaveBeenCalledTimes(2));
    const first = vi.mocked(onboardingClient.confirmPlacement).mock.calls[0]?.[1];
    const second = vi.mocked(onboardingClient.confirmPlacement).mock.calls[1]?.[1];
    expect(first?.clientConfirmationId).toBe(second?.clientConfirmationId);
    expect(push).toHaveBeenCalledWith('/dashboard');
  });
});
