import type { AssessmentSkill } from '@worklingo/contracts';
interface MasteryAssessment {
  readonly id: string;
  readonly submissionId: string;
  readonly skill: string;
  readonly status: string;
  readonly totalScore: number | null;
  readonly createdAt: string;
  readonly confidence: string;
  readonly providers: readonly { synthetic: boolean }[];
  readonly criteria: readonly { id?: string; level?: number | null }[];
  readonly policyVersion?: string;
}
/** Assessment evidence is independent of participation completion and does not certify CEFR. */
export function projectAssessmentMastery(
  runs: readonly MasteryAssessment[],
  qualifiedPolicies: ReadonlySet<string> = new Set(),
  now = new Date(),
) {
  const latest = new Map<string, MasteryAssessment>();
  for (const run of [...runs].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )) {
    if (!latest.has(run.submissionId)) latest.set(run.submissionId, run);
  }
  const skills = (
    ['reading', 'listening', 'speaking', 'writing'] as AssessmentSkill[]
  ).map((skill) => {
    const observations = [...latest.values()].filter(
      (r) =>
        r.skill === skill &&
        r.status === 'SCORED' &&
        r.totalScore !== null &&
        r.providers.length > 0 &&
        r.providers.every((p) => !p.synthetic),
    );
    const qualified = observations.filter(
      (r) => r.policyVersion && qualifiedPolicies.has(r.policyVersion),
    );
    const weights = qualified.map((r) =>
      Math.exp(
        -Math.max(0, now.getTime() - Date.parse(r.createdAt)) / (30 * 86400000),
      ),
    );
    const score = qualified.length
      ? Math.round(
          (qualified.reduce((n, r, i) => n + r.totalScore! * weights[i]!, 0) /
            weights.reduce((a, b) => a + b, 0)) *
            100,
        ) / 100
      : null;
    const mean = observations.length
      ? observations.reduce((n, r) => n + r.totalScore!, 0) /
        observations.length
      : 0;
    const variance = observations.length
      ? observations.reduce((n, r) => n + (r.totalScore! - mean) ** 2, 0) /
        observations.length
      : null;
    const gaps = [
      ...new Set(
        observations.flatMap((r) =>
          r.criteria
            .filter((c) => typeof c.level === 'number' && c.level < 2)
            .map((c) => c.id ?? 'unassessed'),
        ),
      ),
    ];
    return {
      skill,
      observations: observations.length,
      qualifiedObservations: qualified.length,
      score,
      confidence:
        qualified.length >= 5 && variance !== null && variance <= 100
          ? 'MEDIUM'
          : 'LOW',
      gaps,
      consistency: variance === null ? null : Math.sqrt(variance),
      lastObservedAt: observations[0]?.createdAt ?? null,
      recommendation: gaps.length
        ? `Review ${skill} criteria: ${gaps.join(', ')}.`
        : `Collect more independent ${skill} practice evidence before drawing mastery conclusions.`,
    };
  });
  return {
    skills,
    disclosure:
      'Assessment evidence supports review recommendations. Activity completion is separate. No CEFR certification is inferred; unqualified policy results do not establish mastery.',
  };
}
