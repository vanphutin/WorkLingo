import { describe, expect, it } from 'vitest';
import { INITIAL_IELTS_INTEGRATED_PROFILES } from '@worklingo/contracts';
import { planIntegratedSession } from './integrated-session-planner.js';

const skills = ['listening', 'reading', 'writing', 'speaking'] as const;
const questionTypes = ['listening_form_completion', 'reading_matching_headings', 'writing_task_2', 'speaking_part_2_cue_card'] as const;
const versions = skills.map((skill, index) => ({ id: crypto.randomUUID(), skill, questionType: questionTypes[index]! }));

describe('planIntegratedSession', () => {
  it('preserves configured minutes and all four skills independently from difficulty', () => {
    const plan = planIntegratedSession({ profileVersionId: crypto.randomUUID(), profile: INITIAL_IELTS_INTEGRATED_PROFILES[1]!, difficulty: 'advanced', versions, dueReviewSkills: new Set(['reading']) });
    expect(plan.durationMinutes).toBe(90); expect(plan.difficulty).toBe('advanced');
    expect(plan.blocks.map((block) => [block.skill, block.targetMinutes])).toEqual([['listening', 20], ['reading', 25], ['writing', 30], ['speaking', 15]]);
    expect(plan.blocks.find((block) => block.skill === 'reading')?.mode).toBe('review');
  });
  it('fails closed when one skill has no published content', () => {
    expect(() => planIntegratedSession({ profileVersionId: crypto.randomUUID(), profile: INITIAL_IELTS_INTEGRATED_PROFILES[0]!, difficulty: 'foundation', versions: versions.slice(0, 3), dueReviewSkills: new Set() })).toThrow('Missing published IELTS Bridge content for speaking');
  });
});
