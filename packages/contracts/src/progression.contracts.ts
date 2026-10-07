import { z } from 'zod';

import { learningSkillSchema } from './learning-session.contracts.ts';

export const checkpointStatusSchema = z.enum(['not_ready', 'pending_evaluation', 'reinforcement_required', 'passed']);
export const checkpointSkillSchema = z.object({
  score: z.number().min(0).max(1).nullable(),
  threshold: z.literal(0.7),
  pendingCount: z.number().int().nonnegative(),
  evaluatedCount: z.number().int().nonnegative(),
  passed: z.boolean(),
});
export const checkpointReinforcementSchema = z.object({
  skill: learningSkillSchema,
  languageBlockIds: z.array(z.uuid()),
  reason: z.enum(['below_threshold', 'missing_evidence']),
  action: z.string(),
});
export const checkpointSkillsSchema = z.object({
  reading: checkpointSkillSchema,
  listening: checkpointSkillSchema,
  speaking: checkpointSkillSchema,
  writing: checkpointSkillSchema,
});
export const createCheckpointAssessmentSchema = z.object({
  sessionId: z.uuid(),
  clientAssessmentId: z.uuid(),
}).strict();
export const checkpointAssessmentSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  levelCode: z.string(),
  policyVersion: z.literal('workplace-checkpoint-v1'),
  status: checkpointStatusSchema,
  createdAt: z.iso.datetime(),
  skills: checkpointSkillsSchema,
  reinforcement: z.array(checkpointReinforcementSchema),
  canAdvance: z.boolean(),
  nextLevelCode: z.string().nullable(),
});
export const progressionSummarySchema = z.object({
  currentLevelCode: z.string(),
  nextLevelCode: z.string().nullable(),
  eligibleSessionId: z.uuid().nullable(),
  canAssess: z.boolean(),
  reasons: z.array(z.string()),
  latestAssessment: checkpointAssessmentSchema.nullable(),
});

export type CheckpointSkill = z.infer<typeof checkpointSkillSchema>;
export type CheckpointSkills = z.infer<typeof checkpointSkillsSchema>;
export type CheckpointReinforcement = z.infer<typeof checkpointReinforcementSchema>;
export type CheckpointAssessment = z.infer<typeof checkpointAssessmentSchema>;
export type ProgressionSummary = z.infer<typeof progressionSummarySchema>;
export type CreateCheckpointAssessment = z.infer<typeof createCheckpointAssessmentSchema>;
