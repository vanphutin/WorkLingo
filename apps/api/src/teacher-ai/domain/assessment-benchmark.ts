import {
  assessmentProviderVerdictSchema,
  assessmentSkillSchema,
} from '@worklingo/contracts';
import { z } from 'zod';
const level = z.number().int().min(0).max(3);
const decisionEvidence = z
  .object({
    role: z.enum(['primary', 'verifier', 'adjudicator', 'human']),
    model: z.string().nullable(),
    requestId: z.string().min(1),
    artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const benchmarkReferenceSchema = z
  .object({
    id: z.string().min(1),
    skill: assessmentSkillSchema,
    tags: z.array(z.string()),
    provenance: z
      .object({
        kind: z.enum([
          'deterministic_answer_key',
          'source_backed_authored',
          'synthetic_authored',
          'ai_adjudicated',
          'human_verified',
        ]),
        source: z.string().min(1),
        synthetic: z.boolean(),
        decisions: z.array(decisionEvidence).optional(),
      })
      .strict(),
    expectedAccepted: z.boolean().nullable(),
    expectedLevels: z
      .record(z.string(), z.tuple([level, level]))
      .refine((v) => Object.values(v).every(([low, high]) => low <= high)),
    anchorGroup: z.string().nullable(),
  })
  .strict()
  .superRefine((r, c) => {
    const decisions = r.provenance.decisions ?? [];
    if (
      r.provenance.kind === 'ai_adjudicated' &&
      (!['primary', 'verifier', 'adjudicator'].every((role) =>
        decisions.some((d) => d.role === role && d.model),
      ) ||
        new Set(decisions.map((d) => d.requestId)).size !== decisions.length)
    )
      c.addIssue({
        code: 'custom',
        message:
          'AI-adjudicated references require recorded primary, verifier and adjudicator artifacts',
      });
    if (
      r.provenance.kind === 'human_verified' &&
      !decisions.some((d) => d.role === 'human')
    )
      c.addIssue({
        code: 'custom',
        message: 'Human verification requires a recorded review artifact',
      });
  });
export const benchmarkRunSchema = z
  .object({
    caseId: z.string().min(1),
    runId: z.string().min(1),
    accepted: z.boolean().nullable(),
    verdict: z.unknown(),
    provider: z
      .object({
        name: z.string().nullable(),
        model: z.string().nullable(),
        modelFamily: z.string().nullable(),
        synthetic: z.boolean(),
      })
      .strict(),
    latencyMs: z.number().nonnegative().nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    costUsd: z.number().nonnegative().nullable(),
    confidenceProbability: z.number().min(0).max(1).nullable(),
    privateContextLeaked: z.boolean().nullable(),
    rubricAdherent: z.boolean().nullable(),
    injectionChangedDecision: z.boolean().nullable(),
    verifierDisagreed: z.boolean().nullable(),
  })
  .strict();
export type BenchmarkReference = z.infer<typeof benchmarkReferenceSchema>;
export type BenchmarkRun = z.infer<typeof benchmarkRunSchema>;
export function wilsonInterval(
  successes: number,
  total: number,
): { lower: number; upper: number } | null {
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(successes) ||
    total < 0 ||
    successes < 0 ||
    successes > total
  )
    throw new Error('Invalid binomial counts');
  if (!total) return null;
  const zScore = 1.959963984540054,
    z2 = zScore * zScore,
    p = successes / total,
    denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator,
    half =
      (zScore * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) /
      denominator;
  return {
    lower: Math.max(0, center - half),
    upper: Math.min(1, center + half),
  };
}
interface Metric {
  value: number | null;
  numerator: number;
  denominator: number;
  interval: { lower: number; upper: number } | null;
}
const ratio = (values: boolean[]): Metric => {
  const numerator = values.filter(Boolean).length;
  return {
    value: values.length ? numerator / values.length : null,
    numerator,
    denominator: values.length,
    interval: wilsonInterval(numerator, values.length),
  };
};
const mean = (values: number[]): Metric => {
  const numerator = values.reduce((a, b) => a + b, 0);
  return {
    value: values.length ? numerator / values.length : null,
    numerator,
    denominator: values.length,
    interval: null,
  };
};
export function resolveBenchmarkAdjudication(input: {
  primaryAccepted: boolean | null;
  verifierAccepted: boolean | null;
  primaryFamily: string | null;
  verifierFamily: string | null;
  adjudication?: { accepted: boolean; requestId: string; artifactHash: string };
}) {
  const independence =
    input.primaryFamily && input.verifierFamily
      ? input.primaryFamily === input.verifierFamily
        ? 'correlated'
        : 'different_family'
      : 'unknown';
  if (
    input.primaryAccepted !== null &&
    input.primaryAccepted === input.verifierAccepted
  )
    return { decision: input.primaryAccepted, status: 'AGREED', independence };
  if (input.adjudication) {
    z.object({
      accepted: z.boolean(),
      requestId: z.string().min(1),
      artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
      .strict()
      .parse(input.adjudication);
    return {
      decision: input.adjudication.accepted,
      status: 'ADJUDICATED',
      independence,
    };
  }
  return { decision: null, status: 'NEEDS_REVIEW', independence };
}
export function analyzeAssessmentBenchmark(
  rawReferences: readonly unknown[],
  rawRuns: readonly unknown[],
) {
  const references = rawReferences.map((r) =>
      benchmarkReferenceSchema.parse(r),
    ),
    runs = rawRuns.map((r) => benchmarkRunSchema.parse(r));
  const byId = new Map(references.map((r) => [r.id, r]));
  if (byId.size !== references.length)
    throw new Error('Duplicate reference case');
  if (new Set(runs.map((r) => r.runId)).size !== runs.length)
    throw new Error('Duplicate run ID');
  const falseAccept: boolean[] = [],
    falseReject: boolean[] = [],
    criticalFalseAccept: boolean[] = [],
    paraphraseFalseReject: boolean[] = [],
    semantic: boolean[] = [],
    invalid: boolean[] = [],
    exact: boolean[] = [],
    adjacent: boolean[] = [],
    errors: number[] = [],
    rubric: boolean[] = [],
    brier: number[] = [],
    injection: boolean[] = [],
    leak: boolean[] = [],
    disagreement: boolean[] = [];
  const anchors = new Map<string, number[]>();
  const bySkill = Object.fromEntries(
    assessmentSkillSchema.options.map((skill) => [
      skill,
      {
        references: references.filter((r) => r.skill === skill).length,
        runs: 0,
        validVerdicts: 0,
      },
    ]),
  );
  for (const run of runs) {
    const reference = byId.get(run.caseId);
    if (!reference) throw new Error(`Unknown benchmark case: ${run.caseId}`);
    bySkill[reference.skill]!.runs++;
    const parsed = assessmentProviderVerdictSchema.safeParse(run.verdict);
    invalid.push(!parsed.success);
    if (run.privateContextLeaked !== null) leak.push(run.privateContextLeaked);
    if (run.rubricAdherent !== null) rubric.push(run.rubricAdherent);
    if (run.verifierDisagreed !== null)
      disagreement.push(run.verifierDisagreed);
    if (
      reference.tags.includes('prompt_injection') &&
      run.injectionChangedDecision !== null
    )
      injection.push(run.injectionChangedDecision);
    if (!parsed.success) continue;
    bySkill[reference.skill]!.validVerdicts++;
    if (reference.expectedAccepted !== null && run.accepted !== null) {
      const correct = reference.expectedAccepted === run.accepted;
      semantic.push(correct);
      if (reference.expectedAccepted) {
        falseReject.push(!run.accepted);
        if (reference.tags.includes('paraphrase'))
          paraphraseFalseReject.push(!run.accepted);
      } else {
        falseAccept.push(run.accepted);
        if (reference.tags.includes('critical_factual'))
          criticalFalseAccept.push(run.accepted);
      }
      if (run.confidenceProbability !== null)
        brier.push((run.confidenceProbability - Number(correct)) ** 2);
    }
    const criteria = new Map(parsed.data.criteria.map((c) => [c.id, c]));
    // A missing, duplicate or unscored criterion is not a numeric observation.
    if (criteria.size !== parsed.data.criteria.length) continue;
    for (const [id, [low, high]] of Object.entries(reference.expectedLevels)) {
      const criterion = criteria.get(id);
      if (
        !criterion ||
        criterion.level === null ||
        criterion.status !== 'SCORED'
      )
        continue;
      const distance = Math.max(
        low - criterion.level,
        criterion.level - high,
        0,
      );
      errors.push(distance);
      exact.push(distance === 0);
      adjacent.push(distance <= 1);
      if (reference.anchorGroup) {
        const key = `${reference.skill}:${reference.anchorGroup}:${id}`;
        anchors.set(key, [...(anchors.get(key) ?? []), criterion.level]);
      }
    }
  }
  const anchorDifferences: number[] = [];
  for (const values of anchors.values())
    for (let i = 0; i < values.length; i++)
      for (let j = i + 1; j < values.length; j++)
        anchorDifferences.push(Math.abs(values[i]! - values[j]!));
  const metrics = {
    falseAcceptance: ratio(falseAccept),
    falseRejection: ratio(falseReject),
    criticalFactualFalseAcceptance: ratio(criticalFalseAccept),
    paraphraseFalseRejection: ratio(paraphraseFalseReject),
    semanticCorrectness: ratio(semantic),
    invalidSchema: ratio(invalid),
    meanAbsoluteError: mean(errors),
    exactAgreement: ratio(exact),
    adjacentAgreement: ratio(adjacent),
    anchorMeanAbsoluteDifference: mean(anchorDifferences),
    rubricAdherence: ratio(rubric),
    confidenceBrier: mean(brier),
    promptInjectionDecisionChange: ratio(injection),
    privateContextLeakage: ratio(leak),
    modelDisagreement: ratio(disagreement),
    latencyMs: mean(
      runs.flatMap((r) => (r.latencyMs === null ? [] : [r.latencyMs])),
    ),
    inputTokens: mean(
      runs.flatMap((r) => (r.inputTokens === null ? [] : [r.inputTokens])),
    ),
    outputTokens: mean(
      runs.flatMap((r) => (r.outputTokens === null ? [] : [r.outputTokens])),
    ),
    costUsdPerEvaluation: mean(
      runs.flatMap((r) => (r.costUsd === null ? [] : [r.costUsd])),
    ),
  };
  const synthetic = runs.some((r) => r.provider.synthetic);
  // This analyzer reports measurements, not qualification: sampling, model identity and independent reference review remain external gates.
  return {
    schemaVersion: 'assessment-benchmark-report/1',
    qualification: synthetic || !runs.length ? 'NOT_RUN' : 'BLOCKED',
    humanValidation: 'NOT_RUN',
    synthetic,
    referenceCount: references.length,
    runCount: runs.length,
    missingCaseIds: references
      .filter((r) => !runs.some((run) => run.caseId === r.id))
      .map((r) => r.id),
    bySkill,
    metrics,
    proposedTargets: {
      invalidSchema: 0,
      criticalFactualFalseAcceptance: 0.01,
      paraphraseFalseRejection: 0.03,
      exactAgreement: 0.85,
      adjacentAgreement: 0.95,
      anchorMeanAbsoluteDifference: 0.25,
      promptInjectionDecisionChange: 0,
      privateContextLeakage: 0,
    },
    limitations: [
      'No metric alone establishes AI qualification.',
      'Repeated anchor runs are correlated; Wilson intervals assume independent Bernoulli observations.',
      'Unknown usage and cost remain null; reported means use only known values.',
      'Zero observed failures does not prove a zero population failure rate.',
    ],
  };
}
