import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OnboardingStateDto } from '@worklingo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';
import { OnboardingWorkspace } from './onboarding-workspace';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('../../lib/api/onboarding-client', () => ({
  onboardingClient: {
    confirmSelfPlacement: vi.fn(),
    createPlacementAttempt: vi.fn(),
    getState: vi.fn(),
  },
}));

const pendingState: OnboardingStateDto = {
  activePlacementAttempt: null,
  currentLevelCode: null,
  eligibleLevels: [
    {
      available: true,
      cefrReference: 'Foundation',
      code: 'FOUNDATION_1',
      name: 'Foundation 1',
      reason: 'A complete four-skill workplace mission is available.',
    },
    {
      available: false,
      cefrReference: 'Foundation',
      code: 'FOUNDATION_2',
      name: 'Foundation 2',
      reason: 'Reviewed four-skill workplace content is not published yet.',
    },
  ],
  nextAction: 'choose_method',
  onboardingMethod: null,
  onboardingStatus: 'PENDING',
};

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('OnboardingWorkspace', () => {
  it('loads server state and explains unavailable levels without enabling them', async () => {
    vi.mocked(onboardingClient.getState).mockResolvedValue(pendingState);

    render(<OnboardingWorkspace />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading your starting options/i);
    expect(await screen.findByRole('heading', { name: /choose how to begin/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /choose my starting level/i }));

    expect(screen.getByRole('radio', { name: /foundation 1/i })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /foundation 2/i })).toBeDisabled();
    expect(screen.getByText(/reviewed four-skill workplace content is not published yet/i))
      .toBeInTheDocument();
  });

  it('recovers from a state-loading failure without exposing backend details', async () => {
    vi.mocked(onboardingClient.getState)
      .mockRejectedValueOnce(new Error('postgres host leaked'))
      .mockResolvedValueOnce(pendingState);

    render(<OnboardingWorkspace />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your options/i);
    expect(screen.queryByText(/postgres host leaked/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /choose how to begin/i })).toBeInTheDocument();
    expect(onboardingClient.getState).toHaveBeenCalledTimes(2);
  });

  it('reuses one confirmation UUID after an uncertain failure and opens the dashboard on success', async () => {
    vi.mocked(onboardingClient.getState).mockResolvedValue(pendingState);
    vi.mocked(onboardingClient.confirmSelfPlacement)
      .mockRejectedValueOnce(new ApiError({
        code: 'NETWORK_ERROR', message: 'socket closed', status: 0,
      }))
      .mockResolvedValueOnce({
        ...pendingState,
        currentLevelCode: 'FOUNDATION_1',
        nextAction: 'open_dashboard',
        onboardingMethod: 'SELF_SELECTED',
        onboardingStatus: 'COMPLETE',
      });

    render(<OnboardingWorkspace />);

    await screen.findByRole('heading', { name: /choose how to begin/i });
    fireEvent.click(screen.getByRole('radio', { name: /choose my starting level/i }));
    fireEvent.click(screen.getByRole('radio', { name: /foundation 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm starting level/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not confirm/i);
    fireEvent.click(screen.getByRole('button', { name: /try confirmation again/i }));

    await waitFor(() => expect(onboardingClient.confirmSelfPlacement).toHaveBeenCalledTimes(2));
    const first = vi.mocked(onboardingClient.confirmSelfPlacement).mock.calls[0]?.[0];
    const second = vi.mocked(onboardingClient.confirmSelfPlacement).mock.calls[1]?.[0];
    expect(first?.clientConfirmationId).toBe(second?.clientConfirmationId);
    expect(first?.selectedLevelCode).toBe('FOUNDATION_1');
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('resumes the active placement assessment from server state', async () => {
    vi.mocked(onboardingClient.getState).mockResolvedValue({
      ...pendingState,
      activePlacementAttempt: {
        clientAttemptId: '4b66f5aa-a729-4c49-9af3-cf9878721e83',
        confirmedAt: null,
        createdAt: '2026-10-10T00:00:00.000Z',
        explanation: null,
        id: '8364d1a4-1dce-403c-a5a5-246d10a4f86f',
        learningSessionId: '4abb72d4-e40f-4a6f-b408-31db94d5ba18',
        lessonVersionId: '587c3ea5-1c96-4752-a30e-7716f9ba2d0d',
        nextAction: 'continue_assessment',
        policyVersion: 'workplace-placement-v1',
        recommendedLevelCode: null,
        retryableAttemptIds: [],
        skillResults: {
          listening: { evidenceCount: 0, score: null, status: 'pending' },
          reading: { evidenceCount: 0, score: null, status: 'pending' },
          speaking: { evidenceCount: 0, score: null, status: 'pending' },
          writing: { evidenceCount: 0, score: null, status: 'pending' },
        },
        status: 'IN_PROGRESS',
        updatedAt: '2026-10-10T00:00:00.000Z',
      },
      nextAction: 'resume_placement',
    });

    render(<OnboardingWorkspace />);

    expect(await screen.findByRole('link', { name: /resume assessment/i }))
      .toHaveAttribute('href', '/onboarding/placement/4abb72d4-e40f-4a6f-b408-31db94d5ba18');
  });

  it('reuses one placement UUID when starting the assessment after a network failure', async () => {
    vi.mocked(onboardingClient.getState).mockResolvedValue(pendingState);
    vi.mocked(onboardingClient.createPlacementAttempt)
      .mockRejectedValueOnce(new ApiError({
        code: 'NETWORK_ERROR', message: 'connection reset', status: 0,
      }))
      .mockResolvedValueOnce({
        clientAttemptId: '9bc32819-b9d9-4d31-a130-eecba63f5800',
        confirmedAt: null,
        createdAt: '2026-10-10T00:00:00.000Z',
        explanation: null,
        id: '8795da49-e010-4502-aed3-b09550b69370',
        learningSessionId: '85527c5b-b63b-4ae1-b169-838681fb2bb4',
        lessonVersionId: '4eb2e810-ced4-49f6-95fa-6dfbd41485b2',
        nextAction: 'continue_assessment',
        policyVersion: 'workplace-placement-v1',
        recommendedLevelCode: null,
        retryableAttemptIds: [],
        skillResults: {
          listening: { evidenceCount: 0, score: null, status: 'pending' },
          reading: { evidenceCount: 0, score: null, status: 'pending' },
          speaking: { evidenceCount: 0, score: null, status: 'pending' },
          writing: { evidenceCount: 0, score: null, status: 'pending' },
        },
        status: 'IN_PROGRESS',
        updatedAt: '2026-10-10T00:00:00.000Z',
      });

    render(<OnboardingWorkspace />);

    await screen.findByRole('heading', { name: /choose how to begin/i });
    fireEvent.click(screen.getByRole('radio', { name: /take a placement assessment/i }));
    fireEvent.click(screen.getByRole('button', { name: /start assessment/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not open the assessment/i);
    fireEvent.click(screen.getByRole('button', { name: /start assessment/i }));

    await waitFor(() => expect(onboardingClient.createPlacementAttempt).toHaveBeenCalledTimes(2));
    const first = vi.mocked(onboardingClient.createPlacementAttempt).mock.calls[0]?.[0];
    const second = vi.mocked(onboardingClient.createPlacementAttempt).mock.calls[1]?.[0];
    expect(first?.clientAttemptId).toBe(second?.clientAttemptId);
    expect(push).toHaveBeenCalledWith('/onboarding/placement/85527c5b-b63b-4ae1-b169-838681fb2bb4');
  });

  it('recovers an active assessment after a definitive creation conflict', async () => {
    const activeState: OnboardingStateDto = {
      ...pendingState,
      activePlacementAttempt: {
        clientAttemptId: '4fdf0cda-c68d-457a-a47f-658ff20cd412',
        confirmedAt: null,
        createdAt: '2026-10-10T00:00:00.000Z',
        explanation: null,
        id: '4319777d-1d2a-48d3-92ef-0fdce240193d',
        learningSessionId: 'ba35ad78-8ac3-427f-93f6-4e54052a29e1',
        lessonVersionId: '789db107-817d-4583-a6bf-dbaecf57dcaf',
        nextAction: 'continue_assessment',
        policyVersion: 'workplace-placement-v1',
        recommendedLevelCode: null,
        retryableAttemptIds: [],
        skillResults: {
          listening: { evidenceCount: 0, score: null, status: 'pending' },
          reading: { evidenceCount: 0, score: null, status: 'pending' },
          speaking: { evidenceCount: 0, score: null, status: 'pending' },
          writing: { evidenceCount: 0, score: null, status: 'pending' },
        },
        status: 'IN_PROGRESS',
        updatedAt: '2026-10-10T00:00:00.000Z',
      },
      nextAction: 'resume_placement',
    };
    vi.mocked(onboardingClient.getState)
      .mockResolvedValueOnce(pendingState)
      .mockResolvedValueOnce(activeState);
    vi.mocked(onboardingClient.createPlacementAttempt).mockRejectedValue(
      new ApiError({ code: 'PLACEMENT_ATTEMPT_ACTIVE', message: 'active', status: 409 }),
    );

    render(<OnboardingWorkspace />);

    await screen.findByRole('heading', { name: /choose how to begin/i });
    fireEvent.click(screen.getByRole('radio', { name: /take a placement assessment/i }));
    fireEvent.click(screen.getByRole('button', { name: /start assessment/i }));

    expect(await screen.findByRole('link', { name: /resume assessment/i }))
      .toHaveAttribute('href', '/onboarding/placement/ba35ad78-8ac3-427f-93f6-4e54052a29e1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
