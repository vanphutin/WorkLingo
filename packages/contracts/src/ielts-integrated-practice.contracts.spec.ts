import { describe, expect, it } from 'vitest';
import {
  ieltsIntegratedDifficultySchema,
  ieltsIntegratedPlanSchema,
  ieltsIntegratedProfileContentSchema,
  ieltsIntegratedSessionDurationSchema,
  INITIAL_IELTS_INTEGRATED_PROFILES,
} from './ielts-integrated-practice.contracts.js';

const allocations = [
  { skill: 'listening' as const, targetMinutes: 15 },
  { skill: 'reading' as const, targetMinutes: 15 },
  { skill: 'writing' as const, targetMinutes: 20 },
  { skill: 'speaking' as const, targetMinutes: 10 },
];

describe('IELTS integrated practice contracts', () => {
  it('supports only the four integrated durations and keeps difficulty independent', () => {
    expect(ieltsIntegratedSessionDurationSchema.options.map((option) => option.value)).toEqual([60, 90, 120, 150]);
    expect(ieltsIntegratedDifficultySchema.options).toEqual(['foundation', 'developing', 'competent', 'advanced']);
  });

  it('accepts a configurable four-skill allocation with an exact duration sum', () => {
    expect(ieltsIntegratedProfileContentSchema.parse({ durationMinutes: 60, allocations })).toEqual({ durationMinutes: 60, allocations });
    expect(ieltsIntegratedProfileContentSchema.safeParse({ durationMinutes: 60, allocations: allocations.map((item) => ({ ...item, targetMinutes: 5 })) }).success).toBe(false);
    expect(ieltsIntegratedProfileContentSchema.safeParse({ durationMinutes: 60, allocations: allocations.slice(0, 3) }).success).toBe(false);
    expect(INITIAL_IELTS_INTEGRATED_PROFILES[0]?.allocations).toEqual(allocations);
  });

  it('validates an immutable plan snapshot without exposing a band score', () => {
    const plan = ieltsIntegratedPlanSchema.parse({
      durationMinutes: 60, difficulty: 'competent', profileVersionId: crypto.randomUUID(),
      blocks: allocations.map((allocation, index) => ({ ...allocation, order: index + 1, moduleVersionId: crypto.randomUUID(), questionType: ['listening_form_completion', 'reading_matching_headings', 'writing_task_2', 'speaking_part_2_cue_card'][index], mode: index === 0 ? 'review' : 'new_practice' })),
    });
    expect(plan.blocks).toHaveLength(4);
    expect(plan).not.toHaveProperty('bandScore');
    expect(Object.isFrozen(plan)).toBe(true);
  });
});
