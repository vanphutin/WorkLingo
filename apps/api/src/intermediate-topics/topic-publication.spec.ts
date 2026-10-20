import { createHash, randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { defaultTopicPlan } from '@worklingo/contracts';
import { parseLessonSource } from '@worklingo/content-format';
import type { PrismaService } from '../common/database/prisma.service.js';
import { ContentPublisherService } from '../content-authoring/application/content-publisher.service.js';
import { topicSource } from './topic-test.fixture.js';
import { buildVocabularyPublicationReview } from '../content-authoring/application/publication-vocabulary.js';

vi.mock('./topic-mission.js', () => ({ ensureTopicMission: vi.fn(async () => randomUUID()) }));

function setup() {
  const importId = randomUUID(), actorId = randomUUID(), approver = randomUUID(), audioId = randomUUID(), versionId = randomUUID();
  const sourceHash = createHash('sha256').update(topicSource).digest('hex');
  const script = parseLessonSource(topicSource).document.audioScripts[0]!;
  const artifact = { id: audioId, contentImportId: importId, audioScriptSlug: script.slug, status: 'READY', scriptHash: createHash('sha256').update(script.script).digest('hex') };
  const source = { id: importId, sourceHash, rawSource: topicSource, draftRevision: 1, status: 'VALIDATED', validationHash: sourceHash, audioArtifacts: [artifact], topicGroupId: null as string | null, topicGroupRevision: 0 };
  let review: Record<string, unknown> | null = { sourceHash, draftRevision: 1, revision: 1, approvedPlan: defaultTopicPlan(90), approvedById: approver, approvedAt: new Date('2026-10-19T00:00:00Z') };
  let snapshot: Record<string, unknown> = {};
  const bankId = randomUUID();
  const tx = {
    $executeRaw: vi.fn(async (..._args: unknown[]) => 1), $queryRaw: vi.fn(async () => []),
    mutationReceipt: { findUnique: vi.fn(async () => null), create: vi.fn() },
    contentImport: { findUnique: vi.fn(async () => source), update: vi.fn(), updateMany: vi.fn() },
    intermediateTopicReview: { findUnique: vi.fn(async () => review) },
    audioArtifact: { findMany: vi.fn(async () => [artifact]) },
    lesson: { findUnique: vi.fn(async () => ({ topicGroupId: null as string | null })), upsert: vi.fn(async () => ({ id: randomUUID(), currentPublishedVersionId: null, topicGroupId: null as string | null })), update: vi.fn() },
    lessonVersion: { aggregate: vi.fn(async () => ({ _max: { version: 0 } })),
      create: vi.fn(async ({ data }) => { snapshot = structuredClone(data.parsedContent); return { id: versionId }; }), update: vi.fn() },
    wordBank: { upsert: vi.fn(async ({ create }) => ({ ...create, id: bankId })) },
    languageBlock: { findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null), upsert: vi.fn(async ({ create }) => ({ ...create, id: randomUUID() })) },
    intermediateTopicGroup: { findUnique: vi.fn(async ({ where }) => ({ id: where.id, name: 'Topic', nameEn: null })) },
    lessonVocabularyUsage: { createMany: vi.fn() },
    wordBankVersion: { findFirst: vi.fn(async () => null), aggregate: vi.fn(async () => ({ _max: { version: 0 } })), create: vi.fn(async () => ({ id: randomUUID() })) },
    languageBlockVersion: { create: vi.fn() }, contentBlock: { create: vi.fn() },
    lessonVersionWordBank: { create: vi.fn() }, activity: { create: vi.fn() },
    lessonVersionAudioArtifact: { create: vi.fn() }, auditLog: { create: vi.fn() },
  };
  const db = { ...tx, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  return { tx, source, approver, setReview: (r: typeof review) => { review = r; }, snapshot: () => snapshot,
    publish: async () => new ContentPublisherService(db as unknown as PrismaService).publish(importId, actorId, {
      vocabularyReview: { reviewHash: (await buildVocabularyPublicationReview(db as never, source)).reviewHash,
        choices: parseLessonSource(topicSource).document.wordBanks.flatMap(bank => bank.languageBlocks.map(block => ({ sourceSlug: block.slug, action: 'new' as const }))) },
      expectedDraftRevision: 1, expectedSourceHash: sourceHash, idempotencyKey: randomUUID(), selectedAudioArtifacts: { [script.slug]: audioId },
    }) };
}
describe('Topic publication approval gate', () => {
  it.each(['missing', 'staleHash', 'staleRevision', 'proposalOnly'])('rejects %s approval before materializing a version', async scenario => {
    const s = setup();
    s.setReview(scenario === 'missing' ? null : { sourceHash: scenario === 'staleHash' ? 'old' : s.source.sourceHash,
      draftRevision: scenario === 'staleRevision' ? 2 : 1, approvedPlan: scenario === 'proposalOnly' ? null : defaultTopicPlan(90),
      approvedById: s.approver, approvedAt: new Date() });
    await expect(s.publish()).rejects.toMatchObject({ status: 422, response: { code: 'TOPIC_APPROVAL_REQUIRED' } });
    expect(s.tx.lessonVersion.create).not.toHaveBeenCalled();
  });
  it('freezes matching approval and human actor into the published snapshot', async () => {
    const s = setup(); await s.publish();
    expect(s.snapshot().intermediateTopic).toEqual({ ...defaultTopicPlan(90), sourceContentRef: 'workplace-reading', approvedById: s.approver, approvedAt: '2026-10-19T00:00:00.000Z' });
    s.setReview(null); expect(s.snapshot().intermediateTopic).toMatchObject({ durationMinutes: 90 });
  });
  it('reads approval after acquiring the import lock', async () => {
    const s = setup(); s.tx.$queryRaw.mockImplementation(async () => { s.setReview(null); return []; });
    await expect(s.publish()).rejects.toMatchObject({ status: 422 });
    expect(s.tx.lessonVersion.create).not.toHaveBeenCalled();
  });
  it('copies the reviewed draft group to the stable lesson and all related imports without changing approval', async () => {
    const s = setup(); const groupId = randomUUID();
    s.source.topicGroupId = groupId; s.source.topicGroupRevision = 1;
    await s.publish();
    expect(s.tx.lesson.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ topicGroupId: groupId }) }));
    expect(s.tx.contentImport.updateMany).toHaveBeenCalledWith({ where: { lessonId: expect.any(String) }, data: { topicGroupId: groupId, topicGroupRevision: { increment: 1 } } });
    expect(s.snapshot().intermediateTopic).toMatchObject({ durationMinutes: 90, approvedById: s.approver });
    const taxonomyLock = s.tx.$executeRaw.mock.calls.findIndex(call => String(call[0]).includes('74291'));
    expect(taxonomyLock).toBe(0);
  });
  it('requires another vocabulary review if the group changes after preflight', async () => {
    const s = setup();
    s.tx.$queryRaw.mockImplementation(async () => { s.source.topicGroupId = randomUUID(); s.source.topicGroupRevision = 1; return []; });
    await expect(s.publish()).rejects.toMatchObject({ status: 409, response: { code: 'VOCABULARY_REVIEW_STALE' } });
    expect(s.tx.lessonVersion.create).not.toHaveBeenCalled();
  });
  it('a fresh unassigned import inherits the existing stable lesson group and synchronizes all imports', async () => {
    const s = setup(); const lessonId = randomUUID(), groupId = randomUUID();
    s.tx.lesson.upsert.mockResolvedValue({ id: lessonId, currentPublishedVersionId: null, topicGroupId: groupId });
    s.tx.lesson.findUnique.mockResolvedValue({ topicGroupId: groupId });
    await s.publish();
    expect(s.tx.lesson.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ topicGroupId: groupId }) }));
    expect(s.tx.contentImport.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lessonId }) }));
    expect(s.tx.contentImport.updateMany).toHaveBeenCalledWith({ where: { lessonId }, data: { topicGroupId: groupId, topicGroupRevision: { increment: 1 } } });
  });
  it('publishing an explicitly cleared draft removes the stable lesson group across versions', async () => {
    const s = setup();
    s.source.topicGroupRevision = 1;
    s.tx.lesson.upsert.mockResolvedValue({ id: randomUUID(), currentPublishedVersionId: null, topicGroupId: randomUUID() });
    await s.publish();
    expect(s.tx.lesson.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ topicGroupId: null }) }));
    expect(s.tx.contentImport.updateMany).toHaveBeenCalledWith({ where: { lessonId: expect.any(String) }, data: { topicGroupId: null, topicGroupRevision: { increment: 1 } } });
    expect(s.snapshot().intermediateTopic).toMatchObject({ durationMinutes: 90, approvedById: s.approver });
    expect(s.snapshot()).not.toHaveProperty('group');
  });
  it.each(['P2003', 'P2025', 'P2034'])('reports concurrent publication database error %s as a refreshable conflict', async code => {
    const s = setup(); s.tx.$executeRaw.mockRejectedValueOnce({ code });
    await expect(s.publish()).rejects.toMatchObject({ status: 409, response: { code: 'CONTENT_PUBLICATION_CONFLICT' } });
    expect(s.tx.lessonVersion.create).not.toHaveBeenCalled();
  });
});
