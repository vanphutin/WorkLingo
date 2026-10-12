import { z } from 'zod';

export const weeklyTargetInputSchema = z.object({
  targetDays: z.number().int().min(2).max(5),
}).strict().readonly();

export type WeeklyTargetInput = z.infer<typeof weeklyTargetInputSchema>;

export const engagementWeekStatusSchema = z.enum(['ACTIVE', 'MET', 'MISSED']);
export type EngagementWeekStatus = z.infer<typeof engagementWeekStatusSchema>;

export const engagementSkillStatusSchema = z.enum([
  'IMPROVING',
  'STEADY',
  'NEEDS_ATTENTION',
  'INSUFFICIENT_EVIDENCE',
]);
export type EngagementSkillStatus = z.infer<typeof engagementSkillStatusSchema>;

export const skillProgressSummarySchema = z.object({
  change: z.number().nullable(),
  currentAverage: z.number().min(0).max(1).nullable(),
  currentSamples: z.number().int().nonnegative(),
  previousAverage: z.number().min(0).max(1).nullable(),
  previousSamples: z.number().int().nonnegative(),
  status: engagementSkillStatusSchema,
}).strict().readonly();

export type SkillProgressSummary = z.infer<typeof skillProgressSummarySchema>;

export const evidenceOfProgressSchema = z.object({
  completedReviewsCount: z.number().int().nonnegative(),
  completedSessions: z.number().int().nonnegative(),
  distinctStudyDays: z.number().int().nonnegative(),
  evaluatedBlocksCount: z.number().int().nonnegative(),
  skills: z.object({
    listening: skillProgressSummarySchema,
    reading: skillProgressSummarySchema,
    speaking: skillProgressSummarySchema,
    writing: skillProgressSummarySchema,
  }).strict().readonly(),
}).strict().readonly();

export type EvidenceOfProgressDto = z.infer<typeof evidenceOfProgressSchema>;

export const currentWeekSummarySchema = z.object({
  completedDays: z.number().int().nonnegative(),
  effectiveTargetNextWeek: z.number().int().min(2).max(5).nullable().optional(),
  remainingDays: z.number().int().nonnegative(),
  status: engagementWeekStatusSchema,
  targetChangeAppliesImmediately: z.boolean(),
  targetDays: z.number().int().min(2).max(5),
  timezone: z.string().min(1),
  weekStartKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict().readonly();

export type CurrentWeekSummary = z.infer<typeof currentWeekSummarySchema>;

export const consistencySummarySchema = z.object({
  bestStreakWeeks: z.number().int().nonnegative(),
  currentStreakWeeks: z.number().int().nonnegative(),
}).strict().readonly();

export type ConsistencySummary = z.infer<typeof consistencySummarySchema>;

export const engagementSummarySchema = z.object({
  consistency: consistencySummarySchema,
  currentWeek: currentWeekSummarySchema,
  evidenceOfProgress: evidenceOfProgressSchema,
}).strict().readonly();

export type EngagementSummaryDto = z.infer<typeof engagementSummarySchema>;
