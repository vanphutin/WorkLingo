import { z } from 'zod';

export const learningSkillSchema = z.enum(['reading', 'listening', 'speaking', 'writing']);
export const sessionBlockTypeSchema = z.enum(['activate', 'readDecode', 'listenReason', 'respond']);

export const supportedSessionDurations = [45, 60, 90, 120, 150] as const;
export const sessionDurationSchema = z.union([
  z.literal(45),
  z.literal(60),
  z.literal(90),
  z.literal(120),
  z.literal(150),
]);
export type SessionDuration = z.infer<typeof sessionDurationSchema>;

export type SessionBlockType = z.infer<typeof sessionBlockTypeSchema>;

export const canonicalBlockTypesByDuration: Record<SessionDuration, readonly SessionBlockType[]> = {
  45: ['readDecode', 'listenReason', 'respond'],
  60: ['activate', 'readDecode', 'listenReason', 'respond'],
  90: ['activate', 'readDecode', 'listenReason', 'readDecode', 'listenReason', 'respond'],
  120: ['activate', 'readDecode', 'listenReason', 'respond', 'activate', 'readDecode', 'listenReason', 'respond'],
  150: ['activate', 'readDecode', 'listenReason', 'respond', 'activate', 'readDecode', 'listenReason', 'readDecode', 'listenReason', 'respond'],
};

export const sessionBlockSchema = z.object({
  type: sessionBlockTypeSchema,
  order: z.number().int().min(1).max(10),
  targetMinutes: z.literal(15),
  activityIds: z.array(z.uuid()).min(1).readonly(),
  skills: z.array(learningSkillSchema).min(1).readonly(),
}).readonly();

// A plan is a provider-free immutable reference list, not a learner activity payload.
// Answers and rubrics remain in the backend's published curriculum snapshot.
export const sessionPlanSchema = z.object({
  durationMinutes: sessionDurationSchema,
  missionId: z.uuid(),
  lessonVersionId: z.uuid(),
  blocks: z.array(sessionBlockSchema).min(3).max(10).readonly(),
  reviewItemIds: z.array(z.uuid()).readonly().optional(),
}).superRefine((plan, context) => {
  const expectedBlockTypes = canonicalBlockTypesByDuration[plan.durationMinutes];
  if (!expectedBlockTypes || plan.blocks.length !== expectedBlockTypes.length) {
    context.addIssue({
      code: 'custom',
      path: ['blocks'],
      message: `Blocks count must match duration (${plan.durationMinutes} minutes requires ${expectedBlockTypes?.length ?? 0} blocks)`,
    });
    return;
  }
  for (const [index, block] of plan.blocks.entries()) {
    if (block.type !== expectedBlockTypes[index] || block.order !== index + 1) {
      context.addIssue({ code: 'custom', path: ['blocks', index], message: 'Blocks must follow the canonical session order' });
    }
  }
  const totalTargetMinutes = plan.blocks.reduce((sum, block) => sum + block.targetMinutes, 0);
  if (totalTargetMinutes !== plan.durationMinutes) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Sum of targetMinutes must equal durationMinutes' });
  }
  const activityIds = plan.blocks.flatMap((block) => block.activityIds);
  if (new Set(activityIds).size !== activityIds.length) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'Activity IDs must be unique across the plan' });
  }
  const skills = new Set(plan.blocks.flatMap((block) => block.skills));
  if (learningSkillSchema.options.some((skill) => !skills.has(skill))) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'A session must cover all four skills' });
  }
  const lastBlock = plan.blocks[plan.blocks.length - 1];
  if (lastBlock && lastBlock.type !== 'respond') {
    context.addIssue({ code: 'custom', path: ['blocks', plan.blocks.length - 1], message: 'Session must end with respond block' });
  }
}).readonly();

export type LearningSkill = z.infer<typeof learningSkillSchema>;
export type SessionBlock = z.infer<typeof sessionBlockSchema>;
export type SessionPlan = z.infer<typeof sessionPlanSchema>;
