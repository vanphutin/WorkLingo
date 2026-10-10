import type { PlacementAttemptDto } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { OnboardingService } from './onboarding.service.js';
import type { PlacementAttemptsService } from './placement-attempts.service.js';
import { PlacementRecommendationService } from './placement-recommendation.service.js';

const learnerId = '00000000-0000-4000-8000-000000000001';
const attemptId = '00000000-0000-4000-8000-000000000002';

const ownedDto = { id: attemptId, status: 'RECOMMENDED' } as PlacementAttemptDto;

describe('PlacementRecommendationService', () => {
  it('persists one recommendation only after all four skill scores exist', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = {
      placementAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          learnerId,
          status: 'PROCESSING',
          learningSession: {
            status: 'COMPLETED',
            attempts: ['reading', 'listening', 'speaking', 'writing'].map((skill, index) => ({
              activity: { skills: [skill] },
              evaluationStatus: 'EVALUATED',
              id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
              score: 0.8,
            })),
          },
        }),
        updateMany,
      },
    } as unknown as PrismaService;
    const onboarding = { getState: vi.fn().mockResolvedValue({
      eligibleLevels: [{ available: true, code: 'FOUNDATION_1' }],
    }) } as unknown as OnboardingService;
    const attempts = { getOwned: vi.fn().mockResolvedValue(ownedDto) } as unknown as PlacementAttemptsService;

    await expect(new PlacementRecommendationService(database, onboarding, attempts)
      .refresh(learnerId, attemptId)).resolves.toBe(ownedDto);

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        policyVersion: 'workplace-placement-v1',
        recommendedLevelCode: 'FOUNDATION_1',
        status: 'RECOMMENDED',
      }),
      where: expect.objectContaining({ id: attemptId, learnerId }),
    }));
  });

  it('marks completed attempts with pending evidence as processing without inventing scores', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = {
      placementAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          learnerId,
          status: 'IN_PROGRESS',
          learningSession: {
            status: 'COMPLETED',
            attempts: [{
              activity: { skills: ['reading'] }, evaluationStatus: 'EVALUATED', id: 'reading', score: 1,
            }],
          },
        }),
        updateMany,
      },
    } as unknown as PrismaService;
    const attempts = { getOwned: vi.fn().mockResolvedValue({
      ...ownedDto, status: 'PROCESSING', skillResults: {
        listening: { evidenceCount: 0, score: null, status: 'pending' },
      },
    }) } as unknown as PlacementAttemptsService;

    await new PlacementRecommendationService(
      database, { getState: vi.fn() } as unknown as OnboardingService, attempts,
    ).refresh(learnerId, attemptId);

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'PROCESSING',
        skillResults: expect.objectContaining({
          listening: { evidenceCount: 0, score: null, status: 'pending' },
        }),
      }),
    }));
  });

  it('marks terminal failed skill evidence as action required', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = {
      placementAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          learnerId,
          status: 'PROCESSING',
          learningSession: {
            status: 'COMPLETED',
            attempts: [{
              activity: { skills: ['speaking'] },
              evaluationStatus: 'EVALUATION_FAILED',
              id: 'failed-speaking',
              score: null,
            }],
          },
        }),
        updateMany,
      },
    } as unknown as PrismaService;
    const attempts = {
      getOwned: vi.fn().mockResolvedValue({ ...ownedDto, status: 'ACTION_REQUIRED' }),
    } as unknown as PlacementAttemptsService;

    await new PlacementRecommendationService(
      database, { getState: vi.fn() } as unknown as OnboardingService, attempts,
    ).refresh(learnerId, attemptId);

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'ACTION_REQUIRED',
        skillResults: expect.objectContaining({
          speaking: { evidenceCount: 0, score: null, status: 'action_required' },
        }),
      }),
    }));
  });

  it('returns an immutable persisted recommendation without recalculating it', async () => {
    const updateMany = vi.fn();
    const database = {
      placementAttempt: {
        findFirst: vi.fn().mockResolvedValue({
          id: attemptId,
          learnerId,
          status: 'RECOMMENDED',
          learningSession: { attempts: [], status: 'COMPLETED' },
        }),
        updateMany,
      },
    } as unknown as PrismaService;
    const getState = vi.fn();
    const attempts = { getOwned: vi.fn().mockResolvedValue(ownedDto) } as unknown as PlacementAttemptsService;

    await expect(new PlacementRecommendationService(
      database, { getState } as unknown as OnboardingService, attempts,
    ).refresh(learnerId, attemptId)).resolves.toBe(ownedDto);

    expect(updateMany).not.toHaveBeenCalled();
    expect(getState).not.toHaveBeenCalled();
  });
});
