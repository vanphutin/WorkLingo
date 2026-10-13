import { z } from 'zod';
import { ieltsBridgeQuestionTypeSchema } from './ielts-bridge.contracts.js';
import { learningSkillSchema } from './learning-session.contracts.js';

export const ieltsIntegratedSessionDurationSchema = z.union([
  z.literal(60), z.literal(90), z.literal(120), z.literal(150),
]);
export type IeltsIntegratedSessionDuration = z.infer<typeof ieltsIntegratedSessionDurationSchema>;

// These labels describe content complexity, never an IELTS band estimate.
export const ieltsIntegratedDifficultySchema = z.enum(['foundation', 'developing', 'competent', 'advanced']);
export type IeltsIntegratedDifficulty = z.infer<typeof ieltsIntegratedDifficultySchema>;

export const ieltsIntegratedAllocationSchema = z.object({
  skill: learningSkillSchema,
  targetMinutes: z.number().int().positive().max(150),
}).strict().readonly();

export const ieltsIntegratedProfileContentSchema = z.object({
  durationMinutes: ieltsIntegratedSessionDurationSchema,
  allocations: z.array(ieltsIntegratedAllocationSchema).length(4).readonly(),
}).strict().superRefine((profile, context) => {
  const skills = profile.allocations.map((allocation) => allocation.skill);
  if (new Set(skills).size !== learningSkillSchema.options.length ||
      learningSkillSchema.options.some((skill) => !skills.includes(skill))) {
    context.addIssue({ code: 'custom', path: ['allocations'], message: 'Allocations must contain each skill exactly once' });
  }
  const total = profile.allocations.reduce((sum, allocation) => sum + allocation.targetMinutes, 0);
  if (total !== profile.durationMinutes) {
    context.addIssue({ code: 'custom', path: ['allocations'], message: 'Allocation minutes must equal session duration' });
  }
}).readonly();
export type IeltsIntegratedProfileContent = z.infer<typeof ieltsIntegratedProfileContentSchema>;

export const ieltsIntegratedBlockModeSchema = z.enum(['review', 'new_practice']);
export const ieltsIntegratedPlanBlockSchema = z.object({
  order: z.number().int().min(1).max(4),
  skill: learningSkillSchema,
  targetMinutes: z.number().int().positive().max(150),
  moduleVersionId: z.uuid(),
  questionType: ieltsBridgeQuestionTypeSchema,
  mode: ieltsIntegratedBlockModeSchema,
}).strict().readonly();

export const ieltsIntegratedPlanSchema = z.object({
  durationMinutes: ieltsIntegratedSessionDurationSchema,
  difficulty: ieltsIntegratedDifficultySchema,
  profileVersionId: z.uuid(),
  blocks: z.array(ieltsIntegratedPlanBlockSchema).length(4).readonly(),
}).strict().superRefine((plan, context) => {
  const profileResult = ieltsIntegratedProfileContentSchema.safeParse({
    durationMinutes: plan.durationMinutes,
    allocations: plan.blocks.map(({ skill, targetMinutes }) => ({ skill, targetMinutes })),
  });
  if (!profileResult.success) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Plan blocks must preserve the four-skill profile allocation' });
  }
  if (plan.blocks.some((block, index) => block.order !== index + 1)) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Plan blocks must use contiguous order' });
  }
  if (new Set(plan.blocks.map((block) => block.moduleVersionId)).size !== plan.blocks.length) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Plan blocks must use distinct module versions' });
  }
}).readonly();
export type IeltsIntegratedPlan = z.infer<typeof ieltsIntegratedPlanSchema>;

const initialProfiles = [
  { durationMinutes: 60, minutes: [15, 15, 20, 10] },
  { durationMinutes: 90, minutes: [20, 25, 30, 15] },
  { durationMinutes: 120, minutes: [25, 35, 40, 20] },
  { durationMinutes: 150, minutes: [30, 45, 55, 20] },
] as const;
const integratedAllocationOrder = ['listening', 'reading', 'writing', 'speaking'] as const;

export const INITIAL_IELTS_INTEGRATED_PROFILES = initialProfiles.map((profile) =>
  ieltsIntegratedProfileContentSchema.parse({
    durationMinutes: profile.durationMinutes,
    allocations: integratedAllocationOrder.map((skill, index) => ({ skill, targetMinutes: profile.minutes[index] })),
  }),
);
