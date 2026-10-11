import type { OnboardingStateDto } from '@worklingo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { onboardingClient } from './onboarding-client';

const state: OnboardingStateDto = {
  activePlacementAttempt: null,
  currentLevelCode: null,
  eligibleLevels: [{
    available: true,
    cefrReference: 'Foundation',
    code: 'FOUNDATION_1',
    name: 'Foundation 1',
    reason: 'A complete workplace mission is available.',
  }],
  nextAction: 'choose_method',
  onboardingMethod: null,
  onboardingStatus: 'PENDING',
};

afterEach(() => vi.unstubAllGlobals());

describe('onboardingClient', () => {
  it('loads and validates onboarding state with learner credentials', async () => {
    const network = vi.fn().mockResolvedValue(Response.json(state));
    vi.stubGlobal('fetch', network);

    await expect(onboardingClient.getState()).resolves.toEqual(state);
    expect(network).toHaveBeenCalledWith('/api/v1/me/onboarding', {
      credentials: 'include',
      method: 'GET',
    });
  });

  it('posts a validated self-placement confirmation', async () => {
    const network = vi.fn().mockResolvedValue(Response.json({
      ...state,
      currentLevelCode: 'FOUNDATION_1',
      nextAction: 'open_dashboard',
      onboardingMethod: 'SELF_SELECTED',
      onboardingStatus: 'COMPLETE',
    }));
    vi.stubGlobal('fetch', network);
    const input = {
      clientConfirmationId: '68431134-fc2a-4d4f-95f7-5148a174da7d',
      selectedLevelCode: 'FOUNDATION_1',
    };

    await onboardingClient.confirmSelfPlacement(input);

    expect(network).toHaveBeenCalledWith('/api/v1/me/onboarding/self-placement', {
      body: JSON.stringify(input),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  });

  it('keeps typed conflict codes without trusting an invalid response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      code: 'LEVEL_NOT_PLAYABLE',
      message: 'Selected level is not available',
      statusCode: 422,
    }, { status: 422 })));

    await expect(onboardingClient.confirmSelfPlacement({
      clientConfirmationId: '6bf6c799-591e-4a04-9244-c2c86f5021f8',
      selectedLevelCode: 'FOUNDATION_1',
    })).rejects.toMatchObject({ code: 'LEVEL_NOT_PLAYABLE', status: 422 });
  });
});
