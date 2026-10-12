import type {
  EngagementSkillStatus,
  EvidenceOfProgressDto,
  SkillProgressSummary,
} from '@worklingo/contracts';

export type ActivitySkill = 'reading' | 'listening' | 'speaking' | 'writing';

export interface RawEvaluatedSample {
  readonly evaluatedAt: Date;
  readonly languageBlockId?: string | null;
  readonly purpose: 'learning' | 'placement';
  readonly score: number;
  readonly skill: ActivitySkill;
}

export interface EvidenceWindowInput {
  readonly completedReviewsCount: number;
  readonly completedSessions: number;
  readonly distinctStudyDays: number;
  readonly now: Date;
  readonly samples: readonly RawEvaluatedSample[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 28;
const MIN_SAMPLES_FOR_EVIDENCE = 2;
const SIGNIFICANT_CHANGE_THRESHOLD = 0.03;

const SKILLS: readonly ActivitySkill[] = ['reading', 'listening', 'speaking', 'writing'];

export function compareEvidence(input: EvidenceWindowInput): EvidenceOfProgressDto {
  const currentWindowStart = new Date(input.now.getTime() - WINDOW_DAYS * MS_PER_DAY);
  const previousWindowStart = new Date(input.now.getTime() - 2 * WINDOW_DAYS * MS_PER_DAY);

  const learningSamples = input.samples.filter((s) => s.purpose === 'learning');

  const evaluatedBlocks = new Set<string>();
  for (const sample of learningSamples) {
    if (sample.evaluatedAt >= currentWindowStart && sample.evaluatedAt <= input.now) {
      if (sample.languageBlockId) {
        evaluatedBlocks.add(sample.languageBlockId);
      }
    }
  }

  const skillSummaries: Record<ActivitySkill, SkillProgressSummary> = {
    listening: buildInitialSummary(),
    reading: buildInitialSummary(),
    speaking: buildInitialSummary(),
    writing: buildInitialSummary(),
  };

  for (const skill of SKILLS) {
    const skillSamples = learningSamples.filter((s) => s.skill === skill);

    const currentWindowSamples = skillSamples.filter(
      (s) => s.evaluatedAt >= currentWindowStart && s.evaluatedAt <= input.now,
    );
    const previousWindowSamples = skillSamples.filter(
      (s) => s.evaluatedAt >= previousWindowStart && s.evaluatedAt < currentWindowStart,
    );

    const currentCount = currentWindowSamples.length;
    const previousCount = previousWindowSamples.length;

    const currentAvg = currentCount > 0
      ? roundScore(currentWindowSamples.reduce((sum, s) => sum + s.score, 0) / currentCount)
      : null;
    const previousAvg = previousCount > 0
      ? roundScore(previousWindowSamples.reduce((sum, s) => sum + s.score, 0) / previousCount)
      : null;

    let change: number | null = null;
    let status: EngagementSkillStatus = 'INSUFFICIENT_EVIDENCE';

    if (currentCount >= MIN_SAMPLES_FOR_EVIDENCE && previousCount >= MIN_SAMPLES_FOR_EVIDENCE && currentAvg !== null && previousAvg !== null) {
      change = Number((currentAvg - previousAvg).toFixed(4));
      if (change >= SIGNIFICANT_CHANGE_THRESHOLD) {
        status = 'IMPROVING';
      } else if (change <= -SIGNIFICANT_CHANGE_THRESHOLD) {
        status = 'NEEDS_ATTENTION';
      } else {
        status = 'STEADY';
      }
    }

    skillSummaries[skill] = {
      change,
      currentAverage: currentAvg,
      currentSamples: currentCount,
      previousAverage: previousAvg,
      previousSamples: previousCount,
      status,
    };
  }

  return {
    completedReviewsCount: input.completedReviewsCount,
    completedSessions: input.completedSessions,
    distinctStudyDays: input.distinctStudyDays,
    evaluatedBlocksCount: evaluatedBlocks.size,
    skills: skillSummaries,
  };
}

function buildInitialSummary(): SkillProgressSummary {
  return {
    change: null,
    currentAverage: null,
    currentSamples: 0,
    previousAverage: null,
    previousSamples: 0,
    status: 'INSUFFICIENT_EVIDENCE',
  };
}

function roundScore(score: number): number {
  return Number(score.toFixed(4));
}
