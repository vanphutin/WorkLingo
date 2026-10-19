import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { TopicGroupsService } from './topic-groups.service.js';
import { TopicReviewService } from './topic-review.service.js';
import { TopicProposalService } from './topic-proposal.service.js';
import { defaultTopicPlan } from '@worklingo/contracts';
import { topicSource } from './topic-test.fixture.js';

type Group = { id: string; name: string; normalizedName: string; description: string; revision: number };
type Import = { id: string; rawSource: string; sourceHash: string; lessonId: string | null; status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED'; topicGroupId: string | null; topicGroupRevision: number; draftRevision: number };
async function setup() {
  const groups: Group[] = [];
  const imports: Import[] = [];
  const lessons: Array<{ id: string; topicGroupId: string | null }> = [];
  const approval = { sourceHash: 'source-hash', draftRevision: 7, revision: 4, proposal: null,
    approvedPlan: defaultTopicPlan(90), approvedById: randomUUID(), approvedAt: new Date('2026-10-19T00:00:00Z') };
  // Only the external database boundary is replaced; mutations change state so
  // catalog results and stale-write behavior exercise the actual service.
  const tx = {
    $executeRaw: vi.fn(async () => 1), $queryRaw: vi.fn(async () => []),
    intermediateTopicReview: { findUnique: vi.fn(async () => approval) },
    intermediateTopicGroup: {
      findMany: vi.fn(async () => groups),
      findUnique: vi.fn(async ({ where }) => groups.find(g => g.id === where.id) ?? null),
      create: vi.fn(async ({ data }) => {
        if (groups.some(g => g.normalizedName === data.normalizedName)) throw { code: 'P2002' };
        const group = { id: randomUUID(), revision: 1, ...data }; groups.push(group); return group;
      }),
      update: vi.fn(async ({ where, data }) => {
        const group = groups.find(g => g.id === where.id)!;
        if (groups.some(g => g.id !== group.id && g.normalizedName === data.normalizedName)) throw { code: 'P2002' };
        Object.assign(group, { ...data, revision: group.revision + 1 }); return group;
      }),
      delete: vi.fn(async ({ where }) => groups.splice(groups.findIndex(g => g.id === where.id), 1)[0]),
    },
    contentImport: {
      findUnique: vi.fn(async ({ where }) => imports.find(i => i.id === where.id) ?? null),
      findMany: vi.fn(async () => imports),
      updateMany: vi.fn(async ({ where, data }) => {
        const rows = imports.filter(i => where.OR ? where.OR.some((w: { id?: string; lessonId?: string }) => w.id === i.id || (w.lessonId !== undefined && w.lessonId === i.lessonId))
          : where.topicGroupId !== undefined ? i.topicGroupId === where.topicGroupId : where.lessonId !== undefined ? i.lessonId === where.lessonId : i.id === where.id);
        for (const row of rows) { row.topicGroupId = data.topicGroupId; row.topicGroupRevision++; }
        return { count: rows.length };
      }),
    },
    lesson: {
      update: vi.fn(async ({ where, data }) => Object.assign(lessons.find(l => l.id === where.id)!, data)),
      updateMany: vi.fn(async ({ where, data }) => { const rows = lessons.filter(l => l.topicGroupId === where.topicGroupId); rows.forEach(l => Object.assign(l, data)); return { count: rows.length }; }),
    },
  };
  const database = { $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)) };
  const module = await Test.createTestingModule({ providers: [TopicGroupsService, TopicReviewService,
    { provide: TopicProposalService, useValue: {} }, { provide: PrismaService, useValue: database }] }).compile();
  const add = (overrides: Partial<Import> = {}) => { const row: Import = { id: randomUUID(), rawSource: topicSource, sourceHash: 'source-hash', lessonId: null, status: 'DRAFT', topicGroupId: null, topicGroupRevision: 0, draftRevision: 7, ...overrides }; imports.push(row); return row; };
  return { service: module.get(TopicGroupsService), reviews: module.get(TopicReviewService), groups, imports, lessons, tx, add };
}

describe('Topic group admin operations', () => {
  it('creates normalized groups, rejects name collisions, updates with an independent revision', async () => {
    const s = await setup();
    const created = await s.service.create({ name: ' Work  life ', description: ' Intro ' });
    expect(created).toEqual({ id: expect.any(String), name: 'Work life', description: 'Intro', revision: 1, lessonCount: 0 });
    const id = created.id;
    await expect(s.service.create({ name: 'work life', description: '' })).rejects.toMatchObject({ status: 409 });
    const updated = await s.service.update(id, { name: 'Work', description: '', expectedRevision: 1 });
    expect(updated).toEqual({ id, name: 'Work', description: '', revision: 2, lessonCount: 0 });
    await expect(s.service.update(id, { name: 'Stale', description: '', expectedRevision: 1 })).rejects.toMatchObject({ status: 409, response: { code: 'TOPIC_GROUP_REVISION_CONFLICT', currentRevision: 2 } });
  });
  it('assigns multiple drafts to one group, clears a group and preserves draft revisions', async () => {
    const s = await setup(); const a = s.add(), b = s.add({ status: 'VALIDATED' });
    const group = await s.service.create({ name: 'Work', description: '' });
    await s.service.assign(a.id, { groupId: group.id, expectedRevision: 0 });
    const result = await s.service.assign(b.id, { groupId: group.id, expectedRevision: 0 });
    expect(result.groups[0]!.lessonCount).toBe(2);
    expect(result.lessons.map(l => l.groupId)).toEqual([group.id, group.id]);
    const cleared = await s.service.assign(a.id, { groupId: null, expectedRevision: 1 });
    expect(cleared.lessons.find(l => l.importId === a.id)).toMatchObject({ groupId: null, revision: 2 });
    expect(s.imports.map(i => i.draftRevision)).toEqual([7, 7]);
    await expect(s.service.assign(a.id, { groupId: group.id, expectedRevision: 1 })).rejects.toMatchObject({ status: 409, response: { currentRevision: 2 } });
  });
  it('reassigns the stable lesson and every related import, including archived versions', async () => {
    const s = await setup(); const lessonId = randomUUID(); s.lessons.push({ id: lessonId, topicGroupId: null });
    const a = s.add({ lessonId, status: 'ARCHIVED' }), b = s.add({ lessonId, status: 'PUBLISHED', topicGroupRevision: 3 });
    const group = await s.service.create({ name: 'Work', description: '' });
    const result = await s.service.assign(a.id, { groupId: group.id, expectedRevision: 0 });
    expect(s.lessons[0]!.topicGroupId).toBe(group.id);
    expect(result.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ importId: a.id, groupId: group.id, revision: 1 }),
      expect.objectContaining({ importId: b.id, groupId: group.id, revision: 4 }),
    ]));
    expect(result.groups[0]!.lessonCount).toBe(1);
    await expect(s.service.assign(b.id, { groupId: null, expectedRevision: 3 })).rejects.toMatchObject({ status: 409 });
  });
  it('deletion detaches imports and lessons, increments assignment revisions and never deletes content', async () => {
    const s = await setup(); const group = await s.service.create({ name: 'Work', description: '' });
    const lessonId = randomUUID(); s.lessons.push({ id: lessonId, topicGroupId: group.id });
    s.add({ topicGroupId: group.id, lessonId, status: 'PUBLISHED' }); s.add({ topicGroupId: group.id });
    await expect(s.service.remove(group.id, { expectedRevision: 2 })).rejects.toMatchObject({ status: 409 });
    const result = await s.service.remove(group.id, { expectedRevision: 1 });
    expect(result.groups).toEqual([]); expect(result.lessons).toHaveLength(2);
    expect(result.lessons.every(l => l.groupId === null && l.revision === 1)).toBe(true);
    expect(s.lessons).toEqual([{ id: lessonId, topicGroupId: null }]);
    expect(s.imports.every(i => i.draftRevision === 7)).toBe(true);
  });
  it('catalog includes topic drafts only with actual statuses and no raw source or actor metadata', async () => {
    const s = await setup(); const a = s.add({ status: 'ARCHIVED' }); s.add({ rawSource: '[LESSON]\nslug: other\ntitle: Other\n[/LESSON]' });
    const result = await s.service.catalog();
    expect(result.lessons).toEqual([{ importId: a.id, title: 'Handling Customer Complaints', status: 'ARCHIVED', groupId: null, revision: 0 }]);
  });
  it('group metadata and assignment changes preserve a valid human duration approval', async () => {
    const s = await setup(); const source = s.add({ status: 'VALIDATED' });
    const before = await s.reviews.get(source.id);
    expect(before.status).toBe('approved');
    const group = await s.service.create({ name: 'Work', description: '' });
    await s.service.assign(source.id, { groupId: group.id, expectedRevision: 0 });
    await s.service.update(group.id, { name: 'Work life', description: 'New description', expectedRevision: 1 });
    expect(await s.reviews.get(source.id)).toEqual(before);
    await s.service.remove(group.id, { expectedRevision: 2 });
    expect(await s.reviews.get(source.id)).toEqual(before);
    expect(source.draftRevision).toBe(7); expect(source.sourceHash).toBe('source-hash');
  });
  it('rejects malformed and non-topic assignments and reports missing resources', async () => {
    const s = await setup(); const a = s.add(), b = s.add({ rawSource: '' });
    await expect(s.service.create({ name: ' ', description: '' })).rejects.toMatchObject({ status: 400 });
    await expect(s.service.assign(a.id, { groupId: 'bad', expectedRevision: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(s.service.assign(b.id, { groupId: null, expectedRevision: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(s.service.assign(randomUUID(), { groupId: null, expectedRevision: 0 })).rejects.toMatchObject({ status: 404 });
    await expect(s.service.assign(a.id, { groupId: randomUUID(), expectedRevision: 0 })).rejects.toMatchObject({ status: 404 });
    await expect(s.service.update(randomUUID(), { name: 'Work', description: '', expectedRevision: 1 })).rejects.toMatchObject({ status: 404 });
  });
  it.each(['P2003', 'P2025', 'P2034'])('maps concurrent database error %s to a refreshable conflict', async code => {
    const s = await setup(); const a = s.add(); s.tx.contentImport.updateMany.mockRejectedValueOnce({ code });
    await expect(s.service.assign(a.id, { groupId: null, expectedRevision: 0 })).rejects.toMatchObject({ status: 409, response: { code: 'TOPIC_GROUP_CONFLICT' } });
  });
});
