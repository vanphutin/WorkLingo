import { describe, expect, it } from 'vitest';

import {
  confirmPlacementInputSchema,
  createPlacementAttemptInputSchema,
  missionPurposeSchema,
  onboardingStateSchema,
  placementAttemptSchema,
  selfPlacementInputSchema,
} from './onboarding.contracts.ts';

const uuid = '00000000-0000-4000-8000-000000000001';

const validSkillResults = {
  listening: { evidenceCount: 1, score: 0.72, status: 'evaluated' },
  reading: { evidenceCount: 2, score: 0.81, status: 'evaluated' },
  speaking: { evidenceCount: 1, score: null, status: 'pending' },
  writing: { evidenceCount: 1, score: 0.68, status: 'evaluated' },
} as const;

describe('onboarding contracts', () => {
  it('rejects an onboarding response that omits the server-owned status', () => {
    expect(onboardingStateSchema.safeParse({
      activePlacementAttempt: null,
      currentLevelCode: null,
      eligibleLevels: [],
      onboardingMethod: null,
      nextAction: 'choose_method',
    }).success).toBe(false);
  });

  it('rejects an unknown mission purpose before it can reach session planning', () => {
    expect(missionPurposeSchema.safeParse('practice').success).toBe(false);
    expect(missionPurposeSchema.safeParse('placement').success).toBe(true);
  });

  it('rejects a placement result that omits any of the four skills', () => {
    const { writing: _writing, ...threeSkills } = validSkillResults;

    expect(placementAttemptSchema.safeParse({
      clientAttemptId: uuid,
      confirmedAt: null,
      createdAt: '2026-10-09T00:00:00.000Z',
      explanation: null,
      id: uuid,
      learningSessionId: uuid,
      lessonVersionId: uuid,
      nextAction: 'continue_assessment',
      policyVersion: 'workplace-placement-v1',
      recommendedLevelCode: null,
      retryableAttemptIds: [],
      skillResults: threeSkills,
      status: 'IN_PROGRESS',
      updatedAt: '2026-10-09T00:00:00.000Z',
    }).success).toBe(false);
  });

  it.each([
    ['self placement', selfPlacementInputSchema, { clientConfirmationId: 'not-a-uuid', selectedLevelCode: 'FOUNDATION_1' }],
    ['placement creation', createPlacementAttemptInputSchema, { clientAttemptId: 'not-a-uuid' }],
    ['placement confirmation', confirmPlacementInputSchema, { clientConfirmationId: 'not-a-uuid' }],
  ])('rejects invalid UUID syntax for %s', (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});
