import { ieltsIntegratedPlanSchema, type IeltsIntegratedDifficulty, type IeltsIntegratedPlan, type IeltsIntegratedProfileContent, type LearningSkill } from '@worklingo/contracts';

interface Candidate { readonly id: string; readonly skill: LearningSkill; readonly questionType: IeltsIntegratedPlan['blocks'][number]['questionType'] }
interface PlannerInput {
  readonly profileVersionId: string; readonly profile: IeltsIntegratedProfileContent; readonly difficulty: IeltsIntegratedDifficulty;
  readonly versions: readonly Candidate[]; readonly dueReviewSkills: ReadonlySet<LearningSkill>; readonly recentQuestionTypes?: readonly string[];
}

export function planIntegratedSession(input: PlannerInput): IeltsIntegratedPlan {
  const blocks = input.profile.allocations.map((allocation, index) => {
    const candidates = input.versions.filter((version) => version.skill === allocation.skill);
    const selected = candidates.find((version) => !input.recentQuestionTypes?.includes(version.questionType))
      ?? [...candidates].sort((left, right) => (input.recentQuestionTypes?.indexOf(right.questionType) ?? -1) - (input.recentQuestionTypes?.indexOf(left.questionType) ?? -1))[0];
    if (!selected) throw new Error(`Missing published IELTS Bridge content for ${allocation.skill}`);
    return { order: index + 1, skill: allocation.skill, targetMinutes: allocation.targetMinutes, moduleVersionId: selected.id, questionType: selected.questionType, mode: input.dueReviewSkills.has(allocation.skill) ? 'review' as const : 'new_practice' as const };
  });
  return ieltsIntegratedPlanSchema.parse({ durationMinutes: input.profile.durationMinutes, difficulty: input.difficulty, profileVersionId: input.profileVersionId, blocks });
}
