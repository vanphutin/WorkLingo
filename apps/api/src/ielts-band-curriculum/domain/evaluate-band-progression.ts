import type { IeltsBandStage, IeltsBandPathwayDto, LearningSkill } from '@worklingo/contracts';

interface EvidenceBlock { readonly skill: string; readonly correct: boolean | null }
interface EvaluationInput {
  readonly stage: IeltsBandStage;
  readonly completedSessions: number;
  readonly blocks: readonly EvidenceBlock[];
}

type Evaluation = Pick<IeltsBandPathwayDto, 'proficiency' | 'practicePerformance' | 'unmetCriteria' | 'remediation' | 'recommendedPracticeFormats' | 'canAdvance'>;

const skills: readonly LearningSkill[] = ['listening', 'reading', 'writing', 'speaking'];

export function evaluateBandProgression(input: EvaluationInput): Evaluation {
  const evaluated = input.blocks.filter((block): block is EvidenceBlock & { skill: LearningSkill; correct: boolean } =>
    skills.includes(block.skill as LearningSkill) && typeof block.correct === 'boolean');
  const unmetCriteria: string[] = [];
  if (input.completedSessions < input.stage.exitCriteria.minimumCompletedSessions) {
    unmetCriteria.push(`Complete at least ${input.stage.exitCriteria.minimumCompletedSessions} integrated sessions.`);
  }
  const proficiency = skills.map((skill) => {
    const samples = evaluated.filter((block) => block.skill === skill);
    const rate = samples.length ? samples.filter((block) => block.correct).length / samples.length : null;
    if (samples.length < input.stage.exitCriteria.minimumSamplesPerSkill) {
      unmetCriteria.push(`Collect at least ${input.stage.exitCriteria.minimumSamplesPerSkill} evaluated ${skill} samples.`);
    } else if (rate !== null && rate < input.stage.exitCriteria.minimumCorrectRate) {
      unmetCriteria.push(`Reach ${Math.round(input.stage.exitCriteria.minimumCorrectRate * 100)}% recent correctness in ${skill}.`);
    }
    const descriptor = samples.length === 0 ? 'insufficient_evidence'
      : samples.length < input.stage.exitCriteria.minimumSamplesPerSkill ? 'emerging'
      : rate !== null && rate >= 0.9 ? 'advanced'
      : rate !== null && rate >= input.stage.exitCriteria.minimumCorrectRate ? 'secure'
      : rate !== null && rate >= 0.5 ? 'developing' : 'emerging';
    const confidence = samples.length === 0 ? 'none' : samples.length < 3 ? 'low' : samples.length < 6 ? 'medium' : 'high';
    return { skill, descriptor, confidence, sampleCount: samples.length } as const;
  });
  const recentCorrectRate = evaluated.length ? evaluated.filter((block) => block.correct).length / evaluated.length : null;
  const unmetSkills = new Set(unmetCriteria.flatMap((criterion) => skills.filter((skill) => criterion.includes(skill))));
  const remediation = input.stage.remediationPaths.filter((item) => unmetSkills.size === 0 || unmetSkills.has(item.skill));
  return {
    proficiency,
    practicePerformance: { completedSessions: input.completedSessions, evaluatedBlocks: evaluated.length, recentCorrectRate },
    unmetCriteria,
    remediation,
    recommendedPracticeFormats: input.stage.suggestedPracticeFormats,
    canAdvance: unmetCriteria.length === 0,
  };
}
