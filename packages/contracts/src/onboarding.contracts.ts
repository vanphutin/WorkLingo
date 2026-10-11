import { z } from 'zod';

import type { learningSkillSchema } from './learning-session.contracts.ts';

export { missionPurposeSchema } from './learning-session.contracts.ts';
export type { MissionPurpose } from './learning-session.contracts.ts';

export const onboardingStatusSchema = z.enum(['PENDING', 'COMPLETE']);
export const onboardingMethodSchema = z.enum(['SELF_SELECTED', 'PLACEMENT', 'MIGRATED']);
export const placementAttemptStatusSchema = z.enum([
  'IN_PROGRESS',
  'PROCESSING',
  'ACTION_REQUIRED',
  'RECOMMENDED',
  'CONFIRMED',
]);

export const placementSkillResultSchema = z.object({
  evidenceCount: z.number().int().nonnegative(),
  score: z.number().min(0).max(1).nullable(),
  status: z.enum(['pending', 'evaluated', 'action_required']),
}).strict().readonly();

export const placementSkillResultsSchema = z.object({
  listening: placementSkillResultSchema,
  reading: placementSkillResultSchema,
  speaking: placementSkillResultSchema,
  writing: placementSkillResultSchema,
}).strict().readonly();

export const placementExplanationSchema = z.object({
  candidateDecisions: z.array(z.object({
    eligible: z.boolean(),
    levelCode: z.string().min(1).max(80),
    reason: z.string().min(1).max(300),
  }).strict().readonly()).max(20),
  policyVersion: z.literal('workplace-placement-v1'),
  reasons: z.array(z.string().min(1).max(300)).min(1).max(12),
  skillResults: placementSkillResultsSchema,
  summary: z.string().min(1).max(600),
}).strict().readonly();

export const placementNextActionSchema = z.enum([
  'continue_assessment',
  'wait_for_evaluation',
  'retry_evaluation',
  'review_recommendation',
  'open_dashboard',
]);

export const placementAttemptSchema = z.object({
  clientAttemptId: z.uuid(),
  confirmedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  explanation: placementExplanationSchema.nullable(),
  id: z.uuid(),
  learningSessionId: z.uuid(),
  lessonVersionId: z.uuid(),
  nextAction: placementNextActionSchema,
  policyVersion: z.literal('workplace-placement-v1'),
  recommendedLevelCode: z.string().min(1).max(80).nullable(),
  retryableAttemptIds: z.array(z.uuid()).max(20),
  skillResults: placementSkillResultsSchema,
  status: placementAttemptStatusSchema,
  updatedAt: z.iso.datetime(),
}).strict().readonly();

export const eligiblePlacementLevelSchema = z.object({
  available: z.boolean(),
  cefrReference: z.string().min(1).max(80),
  code: z.string().min(1).max(80),
  name: z.string().min(1).max(160),
  reason: z.string().min(1).max(300),
}).strict().readonly();

export const onboardingNextActionSchema = z.enum([
  'choose_method',
  'resume_placement',
  'wait_for_evaluation',
  'retry_evaluation',
  'review_recommendation',
  'open_dashboard',
]);

export const onboardingStateSchema = z.object({
  activePlacementAttempt: placementAttemptSchema.nullable(),
  currentLevelCode: z.string().min(1).max(80).nullable(),
  eligibleLevels: z.array(eligiblePlacementLevelSchema),
  onboardingMethod: onboardingMethodSchema.nullable(),
  onboardingStatus: onboardingStatusSchema,
  nextAction: onboardingNextActionSchema,
}).strict().readonly();

export const selfPlacementInputSchema = z.object({
  clientConfirmationId: z.uuid(),
  selectedLevelCode: z.string().trim().min(1).max(80),
}).strict().readonly();

export const createPlacementAttemptInputSchema = z.object({
  clientAttemptId: z.uuid(),
}).strict().readonly();

export const confirmPlacementInputSchema = z.object({
  clientConfirmationId: z.uuid(),
}).strict().readonly();

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type OnboardingMethod = z.infer<typeof onboardingMethodSchema>;
export type PlacementAttemptStatus = z.infer<typeof placementAttemptStatusSchema>;
export type PlacementSkill = z.infer<typeof learningSkillSchema>;
export type PlacementSkillResult = z.infer<typeof placementSkillResultSchema>;
export type PlacementSkillResults = z.infer<typeof placementSkillResultsSchema>;
export type PlacementExplanation = z.infer<typeof placementExplanationSchema>;
export type PlacementAttemptDto = z.infer<typeof placementAttemptSchema>;
export type EligiblePlacementLevelDto = z.infer<typeof eligiblePlacementLevelSchema>;
export type OnboardingStateDto = z.infer<typeof onboardingStateSchema>;
export type SelfPlacementInput = z.infer<typeof selfPlacementInputSchema>;
export type CreatePlacementAttemptInput = z.infer<typeof createPlacementAttemptInputSchema>;
export type ConfirmPlacementInput = z.infer<typeof confirmPlacementInputSchema>;
