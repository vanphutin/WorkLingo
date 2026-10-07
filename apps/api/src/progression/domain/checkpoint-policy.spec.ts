import { describe, expect, it } from 'vitest';
import { checkpointSkillSchema } from '@worklingo/contracts';

import { evaluateCheckpoint, type CheckpointEvidence } from './checkpoint-policy.js';

const skills = ['reading', 'listening', 'speaking', 'writing'] as const;

function readyEvidence(score = 0.7): CheckpointEvidence {
  return {
    activities: skills.map((skill) => ({
      id: skill, skills: [skill], languageBlockIds: ['block-1'],
      attempts: [{ id: `${skill}-first`, evaluationStatus: 'EVALUATED', score }],
    })),
    requiredBlocks: skills.map((skill) => ({ skill, languageBlockId: 'block-1', score: 0.7 })),
    allMissionsCompleted: true,
    curriculumReady: true,
  };
}

describe('workplace checkpoint policy', () => {
  it.each([0, 1])('keeps six identical %s scores inside the response bounds', (score) => {
    const input = readyEvidence(score);
    const reading = input.activities[0]!;
    const decision = evaluateCheckpoint({ ...input, activities: [
      ...input.activities.filter((activity) => activity.id !== 'reading'),
      ...Array.from({ length: 6 }, (_, index) => ({ ...reading, id: `reading-${index}` })),
    ] });
    expect(decision.skills.reading.score).toBe(score);
    expect(checkpointSkillSchema.safeParse(decision.skills.reading).success).toBe(true);
  });
  it('passes at exactly 0.7 separately for every skill', () => {
    const decision = evaluateCheckpoint(readyEvidence());
    expect(decision.status).toBe('passed');
    expect(decision.skills.reading).toEqual({
      score: 0.7, threshold: 0.7, pendingCount: 0, evaluatedCount: 1, passed: true,
    });
    expect(decision.reinforcement).toEqual([]);
  });

  it('keeps null and unscored skills pending instead of treating submissions as passes', () => {
    const input = readyEvidence();
    const decision = evaluateCheckpoint({ ...input, activities: input.activities.map((activity) => ({
      ...activity, attempts: [{ id: 'submitted', evaluationStatus: 'SUBMITTED', score: null }],
    })) });
    expect(decision.status).toBe('pending_evaluation');
    expect(decision.skills.speaking).toMatchObject({ score: null, pendingCount: 1, evaluatedCount: 0, passed: false });
  });

  it('keeps the first evaluated attempt weak even after a correct retry', () => {
    const input = readyEvidence(1);
    const decision = evaluateCheckpoint({ ...input, activities: input.activities.map((activity) => activity.id === 'reading' ? {
      ...activity, attempts: [
        { id: 'first', evaluationStatus: 'EVALUATED', score: 0.69 },
        { id: 'retry', evaluationStatus: 'EVALUATED', score: 1 },
      ],
    } : activity) });
    expect(decision.status).toBe('reinforcement_required');
    expect(decision.skills.reading).toMatchObject({ score: 0.69, passed: false });
    expect(decision.reinforcement).toContainEqual({
      skill: 'reading', languageBlockIds: ['block-1'], reason: 'below_threshold', action: 'Practice these Language Blocks in a new workplace context, then complete a new checkpoint session.',
    });
  });

  it('requires evaluated coverage of every curriculum Language Block even with high activity scores', () => {
    const input = readyEvidence(1);
    const decision = evaluateCheckpoint({ ...input, requiredBlocks: [
      ...input.requiredBlocks, { skill: 'reading', languageBlockId: 'missing', score: null },
    ] });
    expect(decision.status).toBe('pending_evaluation');
    expect(decision.skills.reading).toMatchObject({ score: 1, pendingCount: 1, passed: false });
    expect(decision.reinforcement).toContainEqual({
      skill: 'reading', languageBlockIds: ['missing'], reason: 'missing_evidence', action: 'Complete practice for these Language Blocks and wait for scored evaluation before reassessing.',
    });
  });

  it.each([
    { allMissionsCompleted: false, curriculumReady: true },
    { allMissionsCompleted: true, curriculumReady: false },
  ])('cannot pass incomplete missions or unready published curriculum: %o', (prerequisites) => {
    expect(evaluateCheckpoint({ ...readyEvidence(1), ...prerequisites }).status).toBe('not_ready');
  });

  it('does not let strong activities hide a weak required block', () => {
    const input = readyEvidence(1);
    const decision = evaluateCheckpoint({ ...input, requiredBlocks: input.requiredBlocks.map((block) => (
      block.skill === 'reading' ? { ...block, score: 0.6 } : block
    )) });
    expect(decision.status).toBe('reinforcement_required');
    expect(decision.skills.reading.passed).toBe(false);
  });

  it('passes the exact boundary for three independently evaluated activities in one skill', () => {
    const input = readyEvidence();
    const reading = input.activities[0]!;
    const decision = evaluateCheckpoint({ ...input, activities: [
      ...input.activities, { ...reading, id: 'reading-2' }, { ...reading, id: 'reading-3' },
    ] });
    expect(decision.status).toBe('passed');
    expect(decision.skills.reading).toMatchObject({ score: 0.7, passed: true, evaluatedCount: 3 });
  });
});
