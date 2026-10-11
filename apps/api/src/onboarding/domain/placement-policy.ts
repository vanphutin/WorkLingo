import {
  learningSkillSchema,
  type PlacementExplanation,
  type PlacementSkillResults,
} from '@worklingo/contracts';

export interface PlacementPolicyCandidate {
  readonly available: boolean;
  readonly levelCode: string;
  readonly minimumScores: Readonly<Record<'listening' | 'reading' | 'speaking' | 'writing', number>>;
  readonly order: number;
}

export interface PlacementPolicyInput {
  readonly candidates: readonly PlacementPolicyCandidate[];
  readonly skillResults: PlacementSkillResults;
}

export type PlacementPolicyResult =
  | { readonly ready: false; readonly reason: 'incomplete_evidence' | 'no_eligible_candidate' }
  | {
      readonly explanation: PlacementExplanation;
      readonly ready: true;
      readonly recommendedLevelCode: string;
    };

export const WORKPLACE_PLACEMENT_V1_CANDIDATES: readonly PlacementPolicyCandidate[] = Object.freeze([
  Object.freeze({
    available: true,
    levelCode: 'FOUNDATION_1',
    minimumScores: Object.freeze({ listening: 0, reading: 0, speaking: 0, writing: 0 }),
    order: 0,
  }),
]);

export function recommendPlacement(input: PlacementPolicyInput): PlacementPolicyResult {
  if (learningSkillSchema.options.some((skill) => {
    const result = input.skillResults[skill];
    return result.status !== 'evaluated' || result.score === null || result.evidenceCount < 1;
  })) {
    return { ready: false, reason: 'incomplete_evidence' };
  }

  const decisions = [...input.candidates]
    .sort((left, right) => left.order - right.order)
    .map((candidate) => {
      const failingSkills = learningSkillSchema.options.filter((skill) =>
        input.skillResults[skill].score! < candidate.minimumScores[skill],
      );
      const eligible = candidate.available && failingSkills.length === 0;
      const reason = !candidate.available
        ? 'Level does not currently have playable learning curriculum.'
        : failingSkills.length > 0
          ? `Minimum not met for: ${failingSkills.join(', ')}.`
          : 'All four skill minima are met.';
      return { eligible, levelCode: candidate.levelCode, reason };
    });
  const selected = [...input.candidates]
    .filter((candidate) => decisions.some((decision) =>
      decision.levelCode === candidate.levelCode && decision.eligible,
    ))
    .sort((left, right) => right.order - left.order)[0];
  if (!selected) return { ready: false, reason: 'no_eligible_candidate' };

  return {
    explanation: {
      candidateDecisions: decisions,
      policyVersion: 'workplace-placement-v1',
      reasons: [
        `Selected ${selected.levelCode} as the highest currently eligible policy candidate.`,
        'Each skill was evaluated separately; no overall average replaced a weak skill.',
      ],
      skillResults: input.skillResults,
      summary: `The current four-skill evidence supports ${selected.levelCode} under workplace-placement-v1.`,
    },
    ready: true,
    recommendedLevelCode: selected.levelCode,
  };
}
