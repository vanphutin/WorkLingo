import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import type { PrismaService } from '../common/database/prisma.service.js';
import type { CurriculumService } from '../curriculum/application/curriculum.service.js';
import type { ProgramContextService } from '../learning-programs/application/program-context.service.js';
import type { CurriculumEligibilityService } from '../curriculum-foundation/application/curriculum-eligibility.service.js';
import { SessionCreationService } from '../learning-sessions/application/session-creation.service.js';
import { IntermediateTopicsService } from './intermediate-topics.service.js';
import { topicMission } from './topic-test.fixture.js';

function setup() {
  const chosen = topicMission(), unavailable = topicMission(), legacy = topicMission();
  delete legacy.lessonVersion.intermediateTopic;
  let existing: unknown = null;
  const tx = { $queryRaw: vi.fn(async () => []), lessonVersion: { findMany: vi.fn(async () => [] as Array<{ id: string; lesson: { topicGroup: object | null } }>) }, learningSession: {
    findUnique: vi.fn(async () => existing),
    create: vi.fn(async ({ data }) => {
      existing = { ...data, id: randomUUID(), attempts: [], status: 'PLANNED', currentCheckpoint: 0,
        blocks: data.blocks.create.map((b: object) => ({ ...b, id: randomUUID(), status: 'AVAILABLE' })),
        mission: { id: data.missionId, title: 'Topic', purpose: 'LEARNING' } };
      return existing;
    }),
  } };
  const database = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  const curriculum = { getPublishedMissionsForLevel: vi.fn(async () => [chosen, unavailable, legacy]), getPublishedMissionForRevision: vi.fn() };
  const context = { resolve: vi.fn(async () => ({ programSlug: 'intermediate', programId: randomUUID(), levelCode: chosen.levelCode })) };
  const eligibility = { resolve: vi.fn(async (_learner, id) => ({ available: id !== unavailable.id, revisionId: null, reasons: [] })) };
  const service = new IntermediateTopicsService(database as unknown as PrismaService, curriculum as unknown as CurriculumService,
    context as unknown as ProgramContextService, eligibility as unknown as CurriculumEligibilityService, new SessionCreationService());
  return { service, tx, chosen, unavailable, curriculum, context };
}
describe('Intermediate topic sessions', () => {
  it('lists only eligible topics in the active Intermediate program and current level', async () => {
    const s = setup(); const result = await s.service.list(randomUUID());
    expect(result).toEqual([{ id: s.chosen.id, title: 'Topic', lessonVersionId: s.chosen.lessonVersion.id, durationMinutes: 90 }]);
    expect(s.curriculum.getPublishedMissionsForLevel).toHaveBeenCalledWith(s.chosen.levelCode, 'learning', expect.anything(), expect.any(String));
  });
  it('returns no topics outside Intermediate', async () => {
    const s = setup(); s.context.resolve.mockResolvedValue({ programSlug: 'ielts', programId: randomUUID(), levelCode: s.chosen.levelCode });
    expect(await s.service.list(randomUUID())).toEqual([]);
  });
  it('appends public group metadata from the stable lesson only after eligibility filtering', async () => {
    const s = setup(); const group = { id: randomUUID(), name: 'Work', description: 'Work life' };
    s.tx.lessonVersion.findMany.mockResolvedValue([{ id: s.chosen.lessonVersion.id, lesson: { topicGroup: { ...group, revision: 5, approvedById: randomUUID() } } }]);
    const result = await s.service.list(randomUUID());
    expect(result).toEqual([{ id: s.chosen.id, title: 'Topic', lessonVersionId: s.chosen.lessonVersion.id, durationMinutes: 90, group }]);
    expect(s.tx.lessonVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [s.chosen.lessonVersion.id] } } }));
  });
  it('rejects explicit unavailable mission IDs', async () => {
    const s = setup(); await expect(s.service.create(randomUUID(), { clientSessionId: randomUUID(), topicId: s.unavailable.id })).rejects.toMatchObject({ status: 404 });
    expect(s.tx.learningSession.create).not.toHaveBeenCalled();
  });
  it.each(['chosen', 'random'] as const)('freezes %s mode and retries without selecting again', async mode => {
    const s = setup(); const learner = randomUUID(); const input = { clientSessionId: randomUUID(), ...(mode === 'chosen' ? { topicId: s.chosen.id } : {}) };
    const first = await s.service.create(learner, input);
    s.curriculum.getPublishedMissionsForLevel.mockResolvedValue([]);
    const retry = await s.service.create(learner, input);
    expect(first.plan.topicSelection).toBe(mode); expect(retry).toEqual(first);
    expect(first.blocks.map(b => b.targetMinutes)).toEqual([10, 30, 20, 30]);
    expect(s.tx.learningSession.create).toHaveBeenCalledTimes(1);
    expect(s.curriculum.getPublishedMissionsForLevel).toHaveBeenCalledTimes(1);
  });
  it('rejects retry changing mode or chosen topic', async () => {
    const s = setup(); const learner = randomUUID(); const clientSessionId = randomUUID();
    await s.service.create(learner, { clientSessionId, topicId: s.chosen.id });
    await expect(s.service.create(learner, { clientSessionId })).rejects.toMatchObject({ status: 409 });
    await expect(s.service.create(learner, { clientSessionId, topicId: s.unavailable.id })).rejects.toMatchObject({ status: 409 });
  });
});
