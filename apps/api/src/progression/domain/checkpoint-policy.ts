import type { CheckpointReinforcement, CheckpointSkills, LearningSkill } from '@worklingo/contracts';

export interface CheckpointEvidence {
  readonly activities: readonly {
    readonly id: string;
    readonly skills: readonly LearningSkill[];
    readonly languageBlockIds: readonly string[];
    /** Ordered by attempt creation time, then ID. */
    readonly attempts: readonly { readonly id: string; readonly evaluationStatus: string; readonly score: number | null }[];
  }[];
  readonly requiredBlocks: readonly { readonly skill: LearningSkill; readonly languageBlockId: string; readonly score: number | null }[];
  readonly allMissionsCompleted: boolean;
  readonly curriculumReady: boolean;
}

export function evaluateCheckpoint(evidence: CheckpointEvidence) {
  const reinforcement: CheckpointReinforcement[] = [];
  const skills = Object.fromEntries(['reading', 'listening', 'speaking', 'writing'].map((skill) => {
    const activities = evidence.activities.filter((activity) => activity.skills.includes(skill as LearningSkill));
    const scores = activities.map((activity) => activity.attempts.find((attempt) => attempt.evaluationStatus === 'EVALUATED')?.score ?? null);
    const evaluated = scores.filter((score): score is number => score !== null);
    const blocks = evidence.requiredBlocks.filter((block) => block.skill === skill);
    const missingBlocks = blocks.filter((block) => block.score === null);
    const pendingCount = (scores.length - evaluated.length || (activities.length === 0 ? 1 : 0)) + missingBlocks.length;
    // Center the average on the policy threshold so repeated 0.7 scores do not drift below it.
    const score = evaluated.length === 0 ? null : Math.min(1, Math.max(0,
      0.7 + evaluated.reduce((sum, value) => sum + (value - 0.7), 0) / evaluated.length,
    ));
    const weakBlocks = blocks.filter((block) => block.score !== null && block.score < 0.7);
    if ((score !== null && score < 0.7) || weakBlocks.length > 0) {
      reinforcement.push({
        skill: skill as LearningSkill,
        languageBlockIds: [...new Set([
          ...(score !== null && score < 0.7 ? activities.flatMap((activity) => activity.languageBlockIds) : []),
          ...weakBlocks.map((block) => block.languageBlockId),
        ])].sort(),
        reason: 'below_threshold',
        action: 'Practice these Language Blocks in a new workplace context, then complete a new checkpoint session.',
      });
    }
    if (missingBlocks.length > 0) {
      reinforcement.push({ skill: skill as LearningSkill,
        languageBlockIds: missingBlocks.map((block) => block.languageBlockId).sort(),
        reason: 'missing_evidence',
        action: 'Complete practice for these Language Blocks and wait for scored evaluation before reassessing.',
      });
    }
    return [skill, { score, threshold: 0.7, pendingCount, evaluatedCount: evaluated.length, passed: pendingCount === 0 && score !== null && score >= 0.7 && weakBlocks.length === 0 }];
  })) as CheckpointSkills;
  return {
    status: !evidence.allMissionsCompleted || !evidence.curriculumReady ? 'not_ready' :
      Object.values(skills).some((skill) => skill.pendingCount > 0) ? 'pending_evaluation' :
      Object.values(skills).every((skill) => skill.passed) ? 'passed' : 'reinforcement_required',
    skills,
    reinforcement,
  };
}
