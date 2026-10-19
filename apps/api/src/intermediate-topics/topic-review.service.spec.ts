import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { defaultTopicPlan } from '@worklingo/contracts';
import type { PrismaService } from '../common/database/prisma.service.js';
import type { TopicProposalService } from './topic-proposal.service.js';
import { TopicReviewService } from './topic-review.service.js';
import { topicSource } from './topic-test.fixture.js';

function setup() {
  const draft = { id: randomUUID(), draftRevision: 1, sourceHash: 'hash', rawSource: topicSource, status: 'DRAFT' };
  let row: Record<string, unknown> | null = null;
  const tx = { $queryRaw: vi.fn().mockResolvedValue([]), contentImport: { findUnique: vi.fn(async () => draft) },
    intermediateTopicReview: { findUnique: vi.fn(async () => row), upsert: vi.fn(async (q) => { row = { ...(row ? q.update : q.create), updatedAt: new Date() }; return row; }) } };
  const db = { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  const proposal = { plan: defaultTopicPlan(60), rationale: 'Simulation only', provider: 'fake', model: 'simulation', simulation: true };
  const ai = { propose: vi.fn(async () => proposal) };
  const service = new TopicReviewService(db as unknown as PrismaService, ai as unknown as TopicProposalService);
  const request = { expectedDraftRevision: 1, expectedSourceHash: 'hash', expectedReviewRevision: 0 };
  return { draft, tx, ai, service, request, setRow: (r: Record<string, unknown>) => { row = r; } };
}
describe('Topic review concurrency', () => {
  it('allows manual human approval without invoking AI', async () => {
    const s = setup(); const actor = randomUUID();
    const result = await s.service.approve(s.draft.id, actor, { ...s.request, plan: defaultTopicPlan(90) });
    expect(result.status).toBe('approved'); expect(result.approval?.approvedById).toBe(actor);
    expect(result.approval?.plan.durationMinutes).toBe(90); expect(s.ai.propose).not.toHaveBeenCalled();
  });
  it('AI proposal never creates approval', async () => {
    const s = setup(); const result = await s.service.propose(s.draft.id, randomUUID(), s.request);
    expect(result.status).toBe('proposed'); expect(result.approval).toBeNull(); expect(result.proposal?.simulation).toBe(true);
  });
  it.each(['source', 'draft', 'review'])('rejects a late AI response after %s changes', async (change) => {
    const s = setup(); s.ai.propose.mockImplementation(async () => {
      if (change === 'source') s.draft.sourceHash = 'new';
      if (change === 'draft') s.draft.draftRevision++;
      if (change === 'review') s.setRow({ revision: 1 });
      return { plan: defaultTopicPlan(60), rationale: 'Late', provider: 'fake', model: 'simulation', simulation: true };
    });
    await expect(s.service.propose(s.draft.id, randomUUID(), s.request)).rejects.toMatchObject({ status: 409 });
    expect(s.tx.intermediateTopicReview.upsert).not.toHaveBeenCalled();
  });
  it('rejects stale manual approval', async () => {
    const s = setup(); s.draft.sourceHash = 'changed';
    await expect(s.service.approve(s.draft.id, randomUUID(), { ...s.request, plan: defaultTopicPlan(60) })).rejects.toMatchObject({ status: 409 });
  });
  it('source edits invalidate a previous approval', async () => {
    const s = setup(); await s.service.approve(s.draft.id, randomUUID(), { ...s.request, plan: defaultTopicPlan(60) });
    s.draft.sourceHash = 'changed';
    const result = await s.service.get(s.draft.id); expect(result.status).toBe('stale'); expect(result.approval).toBeNull();
  });
});
