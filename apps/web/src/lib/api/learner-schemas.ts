import { z } from 'zod';
import {
  checkpointAssessmentSchema as sharedAssessmentSchema,
  progressionSummarySchema as sharedProgressionSchema,
} from '@worklingo/contracts';

export const learningSkillSchema = z.enum(['reading', 'listening', 'speaking', 'writing']);
export type LearningSkill = z.infer<typeof learningSkillSchema>;

const masterySkillSchema = z.object({
  state: z.enum(['NEW', 'LEARNING', 'REVIEW_DUE', 'STABLE', 'NEEDS_ATTENTION']),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  nextReviewAt: z.iso.datetime().nullable(),
  lastEvidenceAt: z.iso.datetime(),
});
export const masteryMapSchema = z.object({
  items: z.array(z.object({
    languageBlockId: z.uuid(), slug: z.string(), canonicalForm: z.string(), meaning: z.string(),
    skills: z.object({
      reading: masterySkillSchema.nullable(), listening: masterySkillSchema.nullable(),
      speaking: masterySkillSchema.nullable(), writing: masterySkillSchema.nullable(),
    }),
  })),
  reviewQueue: z.array(z.object({
    languageBlockId: z.uuid(), skill: learningSkillSchema, priorityReason: z.string(),
    nextReviewAt: z.iso.datetime().nullable(),
  })),
});
const skillMemoryHealthSchema = z.object({
  health: z.number().min(0).max(100).nullable(),
  evaluatedBlocksCount: z.number().int().nonnegative(),
  dueCount: z.number().int().nonnegative(),
  needsAttentionCount: z.number().int().nonnegative(),
});
export const memoryHealthSchema = z.object({
  reading: skillMemoryHealthSchema, listening: skillMemoryHealthSchema,
  speaking: skillMemoryHealthSchema, writing: skillMemoryHealthSchema, overall: skillMemoryHealthSchema,
});
export const errorBankSchema = z.object({
  items: z.array(z.object({
    id: z.uuid(), languageBlockId: z.uuid(), languageBlockSlug: z.string(), canonicalForm: z.string(),
    skill: learningSkillSchema, errorType: z.string(), evidenceGranularity: z.string(), contextKey: z.string(),
    activityId: z.uuid(), activitySlug: z.string(), occurrenceCount: z.number().int().positive(),
    firstOccurredAt: z.iso.datetime(), lastOccurredAt: z.iso.datetime(), lessonVersionId: z.uuid(),
  })),
  total: z.number().int().nonnegative(), page: z.number().int().positive(),
  limit: z.number().int().positive(), totalPages: z.number().int().nonnegative(),
});
export type MasteryMapDto = z.infer<typeof masteryMapSchema>;
export type MemoryHealthDto = z.infer<typeof memoryHealthSchema>;
export type ErrorBankDto = z.infer<typeof errorBankSchema>;

export interface ErrorBankQuery {
  readonly skill?: LearningSkill;
  readonly page?: number;
  readonly limit?: number;
}

export const checkpointAssessmentSchema = sharedAssessmentSchema.refine((assessment) => !assessment.canAdvance || (
  assessment.status === 'passed' && assessment.nextLevelCode !== null
), { message: 'Advancement requires a passed assessment and an available next level' });
export const progressionSummarySchema = sharedProgressionSchema.extend({
  latestAssessment: checkpointAssessmentSchema.nullable(),
});
export type CheckpointAssessmentDto = z.infer<typeof checkpointAssessmentSchema>;
export type ProgressionSummaryDto = z.infer<typeof progressionSummarySchema>;
