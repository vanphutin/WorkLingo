import { describe, it, expect } from 'vitest';
import {
  analyzeAssessmentBenchmark,
  wilsonInterval,
  resolveBenchmarkAdjudication,
} from './assessment-benchmark.js';
const reference = {
  id: 'r1',
  skill: 'reading',
  tags: ['paraphrase'],
  provenance: {
    kind: 'source_backed_authored',
    source: 'synthetic:test',
    synthetic: true,
  },
  expectedAccepted: true,
  expectedLevels: { meaning: [3, 3] },
  anchorGroup: null,
};
const verdict = {
  confidence: 'HIGH',
  summary: 'The response preserves meaning.',
  criteria: [
    {
      id: 'meaning',
      level: 3,
      status: 'SCORED',
      evidenceIds: [],
      rationale: 'Correct fact.',
      feedback: 'Correct.',
    },
  ],
  evidence: [],
  corrections: [],
};
const run = {
  caseId: 'r1',
  runId: 'run1',
  accepted: true,
  verdict,
  provider: {
    name: 'fixture',
    model: 'fixture-v1',
    modelFamily: 'fixture',
    synthetic: true,
  },
  latencyMs: 10,
  inputTokens: 20,
  outputTokens: 5,
  costUsd: null,
  confidenceProbability: 0.9,
  privateContextLeaked: false,
  rubricAdherent: true,
  injectionChangedDecision: false,
  verifierDisagreed: false,
};
describe('assessment benchmark evidence', () => {
  it('uses null for absent denominators and never qualifies fixture results', () => {
    const result = analyzeAssessmentBenchmark([reference], [run]);
    expect(result.metrics.falseAcceptance.value).toBeNull();
    expect(result.metrics.falseAcceptance.denominator).toBe(0);
    expect(result.metrics.falseRejection.value).toBe(0);
    expect(result.metrics.exactAgreement.value).toBe(1);
    expect(result.metrics.meanAbsoluteError.value).toBe(0);
    expect(result.metrics.confidenceBrier.value).toBeCloseTo(0.01);
    expect(result.qualification).toBe('NOT_RUN');
    expect(result.metrics.costUsdPerEvaluation.value).toBeNull();
  });
  it('counts factual false acceptance and malformed schemas without treating abstention as a scored answer', () => {
    const references = [
      reference,
      {
        ...reference,
        id: 'bad',
        expectedAccepted: false,
        tags: ['critical_factual'],
      },
      { ...reference, id: 'malformed' },
    ];
    const result = analyzeAssessmentBenchmark(references, [
      run,
      { ...run, runId: '2', caseId: 'bad' },
      {
        ...run,
        runId: '3',
        caseId: 'malformed',
        verdict: { untrusted: 'bad' },
      },
    ]);
    expect(result.metrics.falseAcceptance.value).toBe(1);
    expect(result.metrics.invalidSchema.value).toBeCloseTo(1 / 3);
    expect(result.metrics.exactAgreement.denominator).toBe(2);
    expect(result.qualification).toBe('NOT_RUN');
  });
  it('rejects duplicated runs, missing cases and unsubstantiated AI-adjudicated references', () => {
    expect(() => analyzeAssessmentBenchmark([reference], [run, run])).toThrow();
    expect(() =>
      analyzeAssessmentBenchmark([reference], [{ ...run, caseId: 'unknown' }]),
    ).toThrow();
    expect(() =>
      analyzeAssessmentBenchmark(
        [
          {
            ...reference,
            provenance: {
              kind: 'ai_adjudicated',
              source: 'made-up',
              synthetic: true,
            },
          },
        ],
        [run],
      ),
    ).toThrow();
  });
  it('reports Wilson uncertainty that prevents small zero-error samples from passing', () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(0, 10)?.upper).toBeGreaterThan(0.2);
    expect(wilsonInterval(0, 381)?.upper).toBeLessThanOrEqual(0.01);
  });
  it('requires adjudication evidence for disagreement and labels correlated verification', () => {
    expect(
      resolveBenchmarkAdjudication({
        primaryAccepted: true,
        verifierAccepted: false,
        primaryFamily: 'a',
        verifierFamily: 'b',
      }),
    ).toEqual({
      decision: null,
      status: 'NEEDS_REVIEW',
      independence: 'different_family',
    });
    expect(
      resolveBenchmarkAdjudication({
        primaryAccepted: true,
        verifierAccepted: true,
        primaryFamily: 'a',
        verifierFamily: 'a',
      }),
    ).toEqual({ decision: true, status: 'AGREED', independence: 'correlated' });
  });
});

it('measures anchor drift, disagreement and injection with distinct denominators', () => {
  const references = [
    { ...reference, anchorGroup: 'a', tags: ['anchor', 'prompt_injection'] },
  ];
  const result = analyzeAssessmentBenchmark(references, [
    run,
    {
      ...run,
      runId: 'anchor-2',
      verdict: { ...verdict, criteria: [{ ...verdict.criteria[0], level: 1 }] },
      injectionChangedDecision: true,
      verifierDisagreed: true,
    },
  ]);
  expect(result.metrics.anchorMeanAbsoluteDifference.value).toBe(2);
  expect(result.metrics.modelDisagreement.value).toBe(0.5);
  expect(result.metrics.promptInjectionDecisionChange.value).toBe(0.5);
  expect(result.metrics.meanAbsoluteError.value).toBe(1);
  expect(result.metrics.adjacentAgreement.value).toBe(0.5);
});
it('validates every versioned reference while keeping speaking audio honestly absent', async () => {
  const { readFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const raw = await readFile(
    resolve(process.cwd(), '../../content/assessment/r22/references.v1.jsonl'),
    'utf8',
  );
  const references = raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const result = analyzeAssessmentBenchmark(references, []);
  expect(result.bySkill.speaking!.references).toBeGreaterThan(0);
  expect(result.runCount).toBe(0);
  expect(result.qualification).toBe('NOT_RUN');
});
