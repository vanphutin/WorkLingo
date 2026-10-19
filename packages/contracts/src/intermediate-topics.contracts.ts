import { z } from 'zod';
import { sessionDurationSchema, type SessionDuration } from './learning-session.contracts.ts';
import { learnerTopicGroupSchema } from './intermediate-topic-groups.contracts.ts';

export const topicBlockTypes = ['activate', 'readDecode', 'listenReason', 'respond'] as const;
export const topicAllocationSchema = z.object({ type: z.enum(topicBlockTypes), targetMinutes: z.number().int().positive().max(150) }).strict();
export const topicPlanSchema = z.object({ durationMinutes: sessionDurationSchema, allocations: z.array(topicAllocationSchema).length(4) }).strict().superRefine((plan, context) => {
  if (plan.allocations.some((a, i) => a.type !== topicBlockTypes[i])) context.addIssue({ code: 'custom', path: ['allocations'], message: 'Use each topic stage once in canonical order.' });
  if (plan.allocations.reduce((sum, a) => sum + a.targetMinutes, 0) !== plan.durationMinutes) context.addIssue({ code: 'custom', path: ['allocations'], message: 'Allocations must sum to the approved duration.' });
});
export type TopicPlan = z.infer<typeof topicPlanSchema>;
export function defaultTopicPlan(durationMinutes: SessionDuration): TopicPlan {
  const frames: Record<SessionDuration, readonly number[]> = { 45: [5, 15, 10, 15], 60: [5, 20, 15, 20], 90: [10, 30, 20, 30], 120: [10, 40, 30, 40], 150: [15, 50, 35, 50] };
  return { durationMinutes, allocations: topicBlockTypes.map((type, index) => ({ type, targetMinutes: frames[durationMinutes][index]! })) };
}
export const topicReviewRequestSchema = z.object({ expectedDraftRevision: z.number().int().positive(), expectedSourceHash: z.string().min(1), expectedReviewRevision: z.number().int().nonnegative() }).strict();
export type TopicReviewRequest = z.infer<typeof topicReviewRequestSchema>;
export const approveTopicSchema = topicReviewRequestSchema.extend({ plan: topicPlanSchema }).strict();
export type ApproveTopic = z.infer<typeof approveTopicSchema>;
export const topicProposalSchema = z.object({ plan: topicPlanSchema, rationale: z.string().min(1).max(4000), provider: z.string().min(1), model: z.string().min(1), simulation: z.boolean() }).strict();
export type TopicProposal = z.infer<typeof topicProposalSchema>;
export const topicApprovalSchema = z.object({ plan: topicPlanSchema, approvedById: z.uuid(), approvedAt: z.iso.datetime() }).strict();
export const topicReviewSchema = z.object({ importId: z.uuid(), revision: z.number().int().nonnegative(), status: z.enum(['none', 'proposed', 'approved', 'stale']), proposal: topicProposalSchema.nullable(), approval: topicApprovalSchema.nullable() }).strict().superRefine((review, context) => {
  if ((review.status === 'approved' && !review.approval) || (review.status === 'proposed' && (!review.proposal || review.approval)) || (review.status === 'none' && (review.proposal || review.approval))) context.addIssue({ code: 'custom', message: 'Review state and human approval do not agree.' });
});
export type TopicReview = z.infer<typeof topicReviewSchema>;
export const approvedTopicSnapshotSchema = topicPlanSchema.extend({ sourceContentRef: z.literal('workplace-reading'), approvedById: z.uuid(), approvedAt: z.iso.datetime() });
export type ApprovedTopicSnapshot = z.infer<typeof approvedTopicSnapshotSchema>;
export const learnerTopicSchema = z.object({ id: z.uuid(), title: z.string().min(1), lessonVersionId: z.uuid(), durationMinutes: sessionDurationSchema, group: learnerTopicGroupSchema.optional() }).strict();
export type LearnerTopic = z.infer<typeof learnerTopicSchema>;
export const createTopicSessionSchema = z.object({ clientSessionId: z.uuid(), topicId: z.uuid().optional() }).strict();
export type CreateTopicSession = z.infer<typeof createTopicSessionSchema>;
