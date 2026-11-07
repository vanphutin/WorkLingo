import { z } from 'zod';

export const assessmentSkillSchema = z.enum([
  'reading',
  'listening',
  'speaking',
  'writing',
]);
export const assessmentStatusSchema = z.enum([
  'RECEIVED',
  'VALIDATING',
  'EVALUATING',
  'SCORED',
  'NEEDS_REVIEW',
  'NOT_SCORABLE',
  'FAILED',
  'CANCELLED',
]);
export const assessmentConfidenceSchema = z.enum([
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNKNOWN',
]);
const bounded = z.string().min(1).max(1000);
export const assessmentEvidenceSchema = z
  .object({
    id: z.string().min(1).max(100),
    source: z.enum(['submission', 'passage', 'transcript', 'audio']),
    quote: z.string().max(1000),
    start: z.number().int().nonnegative().nullable(),
    end: z.number().int().nonnegative().nullable(),
    startMs: z.number().nonnegative().nullable(),
    endMs: z.number().nonnegative().nullable(),
  })
  .strict();
export const assessmentProviderCriterionSchema = z
  .object({
    id: z.string().min(1).max(100),
    level: z.number().int().min(0).max(3).nullable(),
    status: z.enum(['SCORED', 'NOT_SCORED', 'NEEDS_EVIDENCE']),
    evidenceIds: z.array(z.string().min(1).max(100)).max(20),
    rationale: bounded,
    feedback: bounded,
  })
  .strict()
  .superRefine((v, c) => {
    if ((v.status === 'SCORED') !== (v.level !== null))
      c.addIssue({
        code: 'custom',
        message:
          'Scored criterion requires a level; unscored criterion must not have one',
      });
  });
export const assessmentCorrectionSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    replacement: z.string().max(500),
    explanation: bounded,
  })
  .strict();
export const assessmentProviderVerdictSchema = z
  .object({
    confidence: assessmentConfidenceSchema,
    summary: bounded,
    criteria: z.array(assessmentProviderCriterionSchema).min(1).max(20),
    evidence: z.array(assessmentEvidenceSchema).max(60).default([]),
    corrections: z.array(assessmentCorrectionSchema).max(30),
  })
  .strict();
export const assessmentProviderMetadataSchema = z
  .object({
    role: z.enum([
      'primary',
      'verifier',
      'adjudicator',
      'objective',
      'acoustic',
      'feedback',
    ]),
    name: z.string().max(150).nullable(),
    model: z.string().max(200).nullable(),
    modelFamily: z.string().max(150).nullable(),
    requestId: z.string().max(250).nullable(),
    inputTokens: z.number().int().nonnegative().nullable(),
    outputTokens: z.number().int().nonnegative().nullable(),
    costUsd: z.number().nonnegative().nullable(),
    latencyMs: z.number().nonnegative().nullable(),
    synthetic: z.boolean(),
  })
  .strict();
export const assessmentCriterionSchema = assessmentProviderCriterionSchema
  .extend({
    description: bounded,
    required: z.boolean(),
    weight: z.number().positive(),
    maximumScore: z.literal(3),
    rawScore: z.number().min(0).max(3).nullable(),
  })
  .superRefine((v, c) => {
    if (v.rawScore !== v.level)
      c.addIssue({
        code: 'custom',
        message: 'Criterion raw score must equal its rubric level',
      });
  });
export const assessmentResultSchema = z
  .object({
    schemaVersion: z.literal('assessment/1'),
    id: z.uuid(),
    submissionId: z.uuid(),
    learnerId: z.uuid(),
    programVersionId: z.uuid().nullable(),
    lessonVersionId: z.uuid(),
    activityId: z.uuid(),
    skill: assessmentSkillSchema,
    rubricId: bounded,
    rubricVersion: bounded,
    policyVersion: bounded,
    promptVersion: bounded,
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    contextHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: assessmentStatusSchema,
    criteria: z.array(assessmentCriterionSchema).max(20),
    totalScore: z.number().min(0).max(100).nullable(),
    maximumScore: z.literal(100),
    evidence: z.array(assessmentEvidenceSchema).max(60),
    feedback: bounded,
    confidence: assessmentConfidenceSchema,
    corrections: z.array(assessmentCorrectionSchema).max(30),
    providers: z.array(assessmentProviderMetadataSchema).max(5),
    previousEvaluationId: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.status !== 'SCORED' && v.totalScore !== null)
      c.addIssue({
        code: 'custom',
        message: 'Unscored status cannot expose a total',
      });
    if (
      v.status === 'SCORED' &&
      (v.totalScore === null ||
        !v.criteria.length ||
        v.criteria.some((x) => x.required && x.status !== 'SCORED'))
    )
      c.addIssue({
        code: 'custom',
        message: 'Mandatory criteria must be scored',
      });
    if (new Set(v.criteria.map((x) => x.id)).size !== v.criteria.length)
      c.addIssue({ code: 'custom', message: 'Duplicate criteria' });
    if (v.status === 'SCORED' && v.confidence !== 'HIGH')
      c.addIssue({
        code: 'custom',
        message: 'Scoring requires high confidence',
      });
    const terminal = [
      'SCORED',
      'NEEDS_REVIEW',
      'NOT_SCORABLE',
      'FAILED',
      'CANCELLED',
    ].includes(v.status);
    if (terminal !== (v.completedAt !== null))
      c.addIssue({
        code: 'custom',
        message: 'Only terminal results require completion time',
      });
  });
export const requestAssessmentSchema = z
  .object({
    idempotencyKey: z.uuid(),
    previousEvaluationId: z.uuid().optional(),
  })
  .strict();
export type AssessmentSkill = z.infer<typeof assessmentSkillSchema>;
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export type AssessmentEvidence = z.infer<typeof assessmentEvidenceSchema>;
export type AssessmentCriterion = z.infer<typeof assessmentCriterionSchema>;
export type AssessmentProviderVerdict = z.infer<
  typeof assessmentProviderVerdictSchema
>;
export type AssessmentProviderMetadata = z.infer<
  typeof assessmentProviderMetadataSchema
>;
