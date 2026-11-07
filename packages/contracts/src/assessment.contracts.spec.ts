import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';

const valid = () => ({
  schemaVersion: 'assessment/1',
  id: crypto.randomUUID(),
  submissionId: crypto.randomUUID(),
  learnerId: crypto.randomUUID(),
  programVersionId: null,
  lessonVersionId: crypto.randomUUID(),
  activityId: crypto.randomUUID(),
  skill: 'writing',
  rubricId: 'r22-writing',
  rubricVersion: '1',
  policyVersion: 'test/1',
  promptVersion: 'test/1',
  inputHash: 'a'.repeat(64),
  contextHash: 'b'.repeat(64),
  status: 'SCORED',
  criteria: [
    {
      id: 'grammar',
      description: 'Grammar',
      required: true,
      weight: 1,
      maximumScore: 3,
      rawScore: 3,
      level: 3,
      status: 'SCORED',
      evidenceIds: ['submitted'],
      rationale: 'Observable response.',
      feedback: 'Clear response.',
    },
  ],
  totalScore: 100,
  maximumScore: 100,
  evidence: [
    {
      id: 'submitted',
      source: 'submission',
      quote: 'Hello',
      start: 0,
      end: 5,
      startMs: null,
      endMs: null,
    },
  ],
  feedback: 'Clear response.',
  confidence: 'HIGH',
  corrections: [],
  providers: [],
  previousEvaluationId: null,
  createdAt: '2026-11-07T00:00:00.000Z',
  completedAt: '2026-11-07T00:00:01.000Z',
});

describe('versioned assessment boundaries', () => {
  it('rejects a fabricated total when required criterion evidence is missing', () => {
    const parse = contracts.assessmentResultSchema;
    expect(parse).toBeDefined();
    expect(
      parse.safeParse({
        schemaVersion: 'assessment/1',
        status: 'NEEDS_REVIEW',
        totalScore: 100,
      }).success,
    ).toBe(false);
  });
  it('requires exact criterion evidence instead of arbitrary provider prose', () => {
    const parse = contracts.assessmentProviderVerdictSchema;
    expect(parse).toBeDefined();
    expect(
      parse.safeParse({ confidence: 'HIGH', criteria: [], feedback: 'correct' })
        .success,
    ).toBe(false);
  });
  it('accepts a complete result and rejects contradictory confidence, criterion or lifecycle facts', () => {
    expect(contracts.assessmentResultSchema.safeParse(valid()).success).toBe(
      true,
    );
    const mismatch = valid();
    mismatch.criteria[0]!.rawScore = 0;
    for (const input of [
      { ...valid(), confidence: 'LOW' },
      { ...valid(), completedAt: null },
      mismatch,
    ])
      expect(contracts.assessmentResultSchema.safeParse(input).success).toBe(
        false,
      );
  });
  it('accepts explicit abstention without a total and rejects unknown/private fields', () => {
    const result = {
      ...valid(),
      status: 'NOT_SCORABLE',
      totalScore: null,
      criteria: [],
    };
    expect(contracts.assessmentResultSchema.safeParse(result).success).toBe(
      true,
    );
    expect(
      contracts.assessmentResultSchema.safeParse({
        ...result,
        privateContext: 'hidden',
      }).success,
    ).toBe(false);
  });
});
