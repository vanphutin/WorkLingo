import { describe, expect, it } from 'vitest';
import { approveTopicSchema, createTopicSessionSchema, defaultTopicPlan, topicPlanSchema, topicReviewSchema } from './intermediate-topics.contracts.ts';
import { sessionPlanSchema } from './learning-session.contracts.ts';

const id = '11111111-1111-4111-8111-111111111111';
describe('Intermediate topic contracts', () => {
  it('accepts only the supported duration filters for topic selection', () => {
    for (const durationMinutes of [45, 60, 90, 120, 150]) expect(createTopicSessionSchema.safeParse({ clientSessionId: id, durationMinutes }).success).toBe(true);
    expect(createTopicSessionSchema.safeParse({ clientSessionId: id, durationMinutes: 75 }).success).toBe(false);
  });
  it.each([45, 60, 90, 120, 150] as const)('accepts a complete %i-minute topic allocation', duration => {
    expect(topicPlanSchema.parse(defaultTopicPlan(duration)).durationMinutes).toBe(duration);
  });
  it('rejects wrong totals, order and unsupported durations', () => {
    const plan = defaultTopicPlan(60);
    expect(topicPlanSchema.safeParse({ ...plan, durationMinutes: 75 }).success).toBe(false);
    expect(topicPlanSchema.safeParse({ ...plan, allocations: [...plan.allocations].reverse() }).success).toBe(false);
    expect(topicPlanSchema.safeParse({ ...plan, allocations: plan.allocations.map(a => ({ ...a, targetMinutes: 1 })) }).success).toBe(false);
  });
  it('requires revision/hash and human approval metadata, rejecting approval injected into a proposal', () => {
    expect(approveTopicSchema.safeParse({ plan: defaultTopicPlan(60) }).success).toBe(false);
    const review = { importId: id, revision: 1, status: 'proposed', proposal: { plan: defaultTopicPlan(60), rationale: 'A short passage with four practice sections.', provider: 'fake', model: 'simulation', simulation: true }, approval: null };
    expect(topicReviewSchema.safeParse(review).success).toBe(true);
    expect(topicReviewSchema.safeParse({ ...review, proposal: { ...review.proposal, approved: true } }).success).toBe(false);
    expect(topicReviewSchema.safeParse({ ...review, status: 'approved' }).success).toBe(false);
  });
  it('permits variable topic blocks while retaining the legacy fifteen-minute invariant', () => {
    const allocation = defaultTopicPlan(45);
    const blocks = allocation.allocations.map((item, index) => ({ ...item, order: index + 1, activityIds: [`11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`], skills: [(['writing', 'reading', 'listening', 'speaking'] as const)[index]!] }));
    const topic = { kind: 'topic', topicSelection: 'chosen', durationMinutes: 45, missionId: id, lessonVersionId: id, blocks };
    expect(sessionPlanSchema.safeParse(topic).success).toBe(true);
    expect(sessionPlanSchema.safeParse({ ...topic, topicDurationFilter: 45 }).success).toBe(true);
    expect(sessionPlanSchema.safeParse({ ...topic, topicDurationFilter: 90 }).success).toBe(false);
    expect(sessionPlanSchema.safeParse({ ...topic, kind: undefined }).success).toBe(false);
  });
});
