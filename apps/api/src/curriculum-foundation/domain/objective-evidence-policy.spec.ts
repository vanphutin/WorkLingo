import { describe, expect, it } from 'vitest';
import type { CurriculumObjective } from '@worklingo/contracts';

import { evaluateObjectiveEvidence } from './objective-evidence-policy.js';

const objective: CurriculumObjective = {
  slug: 'work-update', statement: 'Give a work update', skills: ['reading'], required: true,
  evidence: [{ lessonVersionId: 'lesson-1', activitySlug: 'read-update', languageBlockSlugs: ['block-a'] }],
};

describe('curriculum objective evidence policy', () => {
  it('keeps missing, pending, failed, and weak evidence incomplete', () => {
    for (const attempts of [
      [],
      [{ id: 'pending', lessonVersionId: 'lesson-1', activitySlug: 'read-update', evaluationStatus: 'QUEUED', score: null }],
      [{ id: 'failed', lessonVersionId: 'lesson-1', activitySlug: 'read-update', evaluationStatus: 'EVALUATION_FAILED', score: null }],
      [{ id: 'weak', lessonVersionId: 'lesson-1', activitySlug: 'read-update', evaluationStatus: 'EVALUATED', score: 0.69 }],
    ]) {
      expect(evaluateObjectiveEvidence(objective, attempts, [{ skill: 'reading', languageBlockSlug: 'block-a', score: 1 }]).completed).toBe(false);
    }
  });

  it('requires passing activity evidence and every mapped Language Block mastery requirement', () => {
    const attempts = [{ id: 'pass', lessonVersionId: 'lesson-1', activitySlug: 'read-update', evaluationStatus: 'EVALUATED', score: 0.7 }];
    expect(evaluateObjectiveEvidence(objective, attempts, []).completed).toBe(false);
    expect(evaluateObjectiveEvidence(objective, attempts, [{ skill: 'reading', languageBlockSlug: 'block-a', score: 0.69 }]).completed).toBe(false);
    expect(evaluateObjectiveEvidence(objective, attempts, [{ skill: 'reading', languageBlockSlug: 'block-a', score: 0.7 }])).toEqual({ completed: true, evidenceAttemptIds: ['pass'] });
  });

  it('requires every mapped activity rather than accepting one passing activity', () => {
    const multiple = { ...objective, evidence: [...objective.evidence, { lessonVersionId: 'lesson-1', activitySlug: 'read-detail', languageBlockSlugs: [] }] };
    const attempts = [{ id: 'pass', lessonVersionId: 'lesson-1', activitySlug: 'read-update', evaluationStatus: 'EVALUATED', score: 1 }];
    expect(evaluateObjectiveEvidence(multiple, attempts, [{ skill: 'reading', languageBlockSlug: 'block-a', score: 1 }]).completed).toBe(false);
  });
});
