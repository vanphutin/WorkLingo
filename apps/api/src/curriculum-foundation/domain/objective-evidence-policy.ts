import type { CurriculumObjective, LearningSkill } from '@worklingo/contracts';

import { passesEvaluatedEvidence } from '../../progression/domain/checkpoint-policy.js';

export interface ObjectiveAttemptEvidence {
  readonly id: string;
  readonly lessonVersionId: string;
  readonly activitySlug: string;
  readonly evaluationStatus: string;
  readonly score: number | null;
}

export interface ObjectiveMasteryEvidence {
  readonly skill: LearningSkill;
  readonly languageBlockSlug: string;
  readonly score: number | null;
}

export function evaluateObjectiveEvidence(
  objective: CurriculumObjective,
  attempts: readonly ObjectiveAttemptEvidence[],
  mastery: readonly ObjectiveMasteryEvidence[],
): { completed: boolean; evidenceAttemptIds: string[] } {
  const evidenceAttemptIds: string[] = [];
  for (const mapping of objective.evidence) {
    const attempt = attempts.find((candidate) =>
      candidate.lessonVersionId === mapping.lessonVersionId &&
      candidate.activitySlug === mapping.activitySlug &&
      passesEvaluatedEvidence(candidate.evaluationStatus, candidate.score));
    if (!attempt) return { completed: false, evidenceAttemptIds: [] };
    evidenceAttemptIds.push(attempt.id);
    for (const skill of objective.skills) {
      for (const languageBlockSlug of mapping.languageBlockSlugs) {
        const record = mastery.find((candidate) =>
          candidate.skill === skill && candidate.languageBlockSlug === languageBlockSlug);
        if (!record || !passesEvaluatedEvidence('EVALUATED', record.score)) {
          return { completed: false, evidenceAttemptIds: [] };
        }
      }
    }
  }
  return { completed: true, evidenceAttemptIds: [...new Set(evidenceAttemptIds)].sort() };
}
