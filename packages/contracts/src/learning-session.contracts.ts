import { z } from 'zod';

export const learningSkillSchema = z.enum(['reading', 'listening', 'speaking', 'writing']);
export const sessionBlockTypeSchema = z.enum(['activate', 'readDecode', 'listenReason', 'respond']);

export const sessionBlockSchema = z.object({
  type: sessionBlockTypeSchema,
  order: z.number().int().min(1).max(4),
  targetMinutes: z.literal(15),
  activityIds: z.array(z.uuid()).min(1).readonly(),
  skills: z.array(learningSkillSchema).min(1).readonly(),
}).readonly();

// A plan is a provider-free immutable reference list, not a learner activity payload.
// Answers and rubrics remain in the backend's published curriculum snapshot.
export const sessionPlanSchema = z.object({
  durationMinutes: z.literal(60),
  missionId: z.uuid(),
  lessonVersionId: z.uuid(),
  blocks: z.array(sessionBlockSchema).length(4).readonly(),
}).superRefine((plan, context) => {
  for (const [index, block] of plan.blocks.entries()) {
    if (block.type !== sessionBlockTypeSchema.options[index] || block.order !== index + 1) {
      context.addIssue({ code: 'custom', path: ['blocks', index], message: 'Blocks must follow the canonical session order' });
    }
  }
  const activityIds = plan.blocks.flatMap((block) => block.activityIds);
  if (new Set(activityIds).size !== activityIds.length) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Activity IDs must be unique across the plan' });
  }
  const skills = new Set(plan.blocks.flatMap((block) => block.skills));
  if (learningSkillSchema.options.some((skill) => !skills.has(skill))) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'A session must cover all four skills' });
  }
}).readonly();

export type LearningSkill = z.infer<typeof learningSkillSchema>;
export type SessionBlockType = z.infer<typeof sessionBlockTypeSchema>;
export type SessionBlock = z.infer<typeof sessionBlockSchema>;
export type SessionPlan = z.infer<typeof sessionPlanSchema>;
