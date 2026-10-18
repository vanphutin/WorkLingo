import { createHash } from 'node:crypto';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { AdminContentLifecycleService } from './admin-content-lifecycle.service.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const versionId = '44444444-4444-4444-8444-444444444444';
const command = { expectedRevision: 3, expectedAction: 'deleted' as const, idempotencyKey: '33333333-3333-4333-8333-333333333333' };
const kinds = [
  { kind: 'topic', model: 'ieltsTopic', version: 'ieltsTopicVersion', lock: 'ielts-topic:' },
  { kind: 'bridge', model: 'ieltsBridgeModule', version: 'ieltsBridgeModuleVersion', lock: 'worklingo:ielts-bridge:' },
  { kind: 'mock', model: 'ieltsMockTest', version: 'ieltsMockTestVersion', lock: 'ielts-mock:' },
] as const;

function delegate() {
  return { findUnique: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 1 }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() };
}
async function setup() {
  const tx = {
    $executeRaw: vi.fn(), $queryRaw: vi.fn(),
    user: { findUnique: vi.fn().mockResolvedValue({ role: 'CONTENT_ADMIN', status: 'ACTIVE' }) },
    mutationReceipt: { findUnique: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() },
    ieltsTopic: delegate(), ieltsTopicVersion: delegate(), ieltsBridgeModule: delegate(), ieltsBridgeModuleVersion: delegate(),
    ieltsMockTest: delegate(), ieltsMockTestVersion: delegate(), contentImport: delegate(), lesson: delegate(), lessonVersion: delegate(),
  };
  const draft = { id, draftRevision: 3, status: 'DRAFT', currentPublishedVersionId: null, versions: [] };
  for (const item of kinds) tx[item.model].findUnique.mockResolvedValue(draft);
  tx.contentImport.findUnique.mockResolvedValue({ ...draft, lessonId: null, lessonVersionId: null, lesson: null, publishedVersion: null, rawSource: 'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: lesson-one\n' });
  const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };
  const module = await Test.createTestingModule({ providers: [AdminContentLifecycleService, { provide: PrismaService, useValue: database }] }).compile();
  return { tx, database, service: module.get(AdminContentLifecycleService), draft };
}

describe('AdminContentLifecycleService', () => {
  for (const item of kinds) {
    it(`${item.kind}: deletes a never-published draft with receipt and audit under the existing mutation lock`, async () => {
      const { service, tx } = await setup();
      await expect(service.remove(actorId, item.kind, id, command)).resolves.toEqual({ id, action: 'deleted' });
      expect(tx.$executeRaw.mock.calls.some(call => call.includes(item.lock + id))).toBe(true);
      expect(tx[item.model].findUnique.mock.invocationCallOrder[0]).toBeGreaterThan(tx.$executeRaw.mock.invocationCallOrder.at(-1)!);
      expect(tx[item.model].deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id, draftRevision: 3, currentPublishedVersionId: null, versions: { none: {} } }) }));
      expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId, resourceId: id }) }));
      expect(tx.mutationReceipt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId, responseStatus: 200, responseBody: { id, action: 'deleted' } }) }));
    });
    it(`${item.kind}: rejects stale revisions without mutation`, async () => {
      const { service, tx } = await setup();
      await expect(service.remove(actorId, item.kind, id, { ...command, expectedRevision: 2 })).rejects.toBeInstanceOf(ConflictException);
      expect(tx[item.model].deleteMany).not.toHaveBeenCalled();
      expect(tx[item.model].updateMany).not.toHaveBeenCalled();
      expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
    });
    it(`${item.kind}: archives only the current publication and retains historical versions`, async () => {
      const { service, tx, draft } = await setup();
      tx[item.model].findUnique.mockResolvedValue({ ...draft, status: 'DRAFT', currentPublishedVersionId: versionId, versions: [{ id: versionId }, { id: 'old-version' }] });
      await expect(service.remove(actorId, item.kind, id, { ...command, expectedAction: 'archived' })).resolves.toEqual({ id, action: 'archived' });
      expect(tx[item.model].deleteMany).not.toHaveBeenCalled();
      expect(tx[item.model].updateMany).toHaveBeenCalledWith({ where: { id, draftRevision: 3 }, data: { status: 'ARCHIVED', currentPublishedVersionId: null, draftRevision: { increment: 1 } } });
      expect(tx[item.version].update).toHaveBeenCalledExactlyOnceWith({ where: { id: versionId }, data: { status: 'ARCHIVED', archivedAt: expect.any(Date) } });
      expect(tx[item.version].deleteMany).not.toHaveBeenCalled();
    });
    it(`${item.kind}: history with no current publication is still never hard deleted`, async () => {
      const { service, tx, draft } = await setup();
      tx[item.model].findUnique.mockResolvedValue({ ...draft, versions: [{ id: versionId }] });
      await expect(service.remove(actorId, item.kind, id, { ...command, expectedAction: 'archived' })).resolves.toEqual({ id, action: 'archived' });
      expect(tx[item.model].deleteMany).not.toHaveBeenCalled();
      expect(tx[item.version].update).not.toHaveBeenCalled();
    });
    it(`${item.kind}: re-reads publication committed by a lock holder before deciding to delete`, async () => {
      const { service, tx, draft } = await setup();
      tx.$executeRaw.mockImplementation(async (_sql, key) => {
        if (key === item.lock + id) tx[item.model].findUnique.mockResolvedValue({ ...draft, currentPublishedVersionId: versionId, versions: [{ id: versionId }] });
      });
      await expect(service.remove(actorId, item.kind, id, { ...command, expectedAction: 'archived' })).resolves.toMatchObject({ action: 'archived' });
      expect(tx[item.model].deleteMany).not.toHaveBeenCalled();
    });
    it(`${item.kind}: a confirmed draft deletion cannot archive a publication created at the same revision`, async () => {
      const { service, tx, draft } = await setup();
      tx.$executeRaw.mockImplementation(async (_sql, key) => {
        if (key === item.lock + id) tx[item.model].findUnique.mockResolvedValue({ ...draft, status: 'PUBLISHED', currentPublishedVersionId: versionId, versions: [{ id: versionId }] });
      });
      await expect(service.remove(actorId, item.kind, id, command)).rejects.toMatchObject({ response: { code: 'CONTENT_LIFECYCLE_CHANGED' } });
      expect(tx[item.model].deleteMany).not.toHaveBeenCalled();
      expect(tx[item.model].updateMany).not.toHaveBeenCalled();
      expect(tx[item.version].update).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
      expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
    });
  }
  it.each(['LEARNER', 'TEACHER'])('denies role %s before mutations', async role => {
    const { service, tx } = await setup();
    tx.user.findUnique.mockResolvedValue({ role, status: 'ACTIVE' });
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.ieltsTopic.findUnique).not.toHaveBeenCalled();
  });
  it('denies inactive admins and permits active system admins', async () => {
    const { service, tx } = await setup();
    tx.user.findUnique.mockResolvedValue({ role: 'SYSTEM_ADMIN', status: 'SUSPENDED' });
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toBeInstanceOf(ForbiddenException);
    tx.user.findUnique.mockResolvedValue({ role: 'SYSTEM_ADMIN', status: 'ACTIVE' });
    await expect(service.remove(actorId, 'topic', id, command)).resolves.toMatchObject({ action: 'deleted' });
  });
  it('replays a deletion after the target has gone', async () => {
    const { service, tx } = await setup();
    tx.ieltsTopic.findUnique.mockResolvedValue(null);
    tx.mutationReceipt.findUnique.mockResolvedValue({ requestHash: createHash('sha256').update(JSON.stringify({ kind: 'topic', id, expectedRevision: 3, expectedAction: 'deleted' })).digest('hex'), responseBody: { id, action: 'deleted' } });
    await expect(service.remove(actorId, 'topic', id, command)).resolves.toEqual({ id, action: 'deleted' });
    expect(tx.ieltsTopic.findUnique).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
  });
  it('rejects a receipt reused for another target or revision', async () => {
    const { service, tx } = await setup();
    tx.mutationReceipt.findUnique.mockResolvedValue({ requestHash: 'another-request', responseBody: {} });
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ieltsTopic.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a receipt replayed with a different expected action', async () => {
    const { service, tx } = await setup();
    await service.remove(actorId, 'topic', id, command);
    tx.mutationReceipt.findUnique.mockResolvedValue(tx.mutationReceipt.create.mock.calls[0]![0].data);
    await expect(service.remove(actorId, 'topic', id, { ...command, expectedAction: 'archived' })).rejects.toMatchObject({ response: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
    expect(tx.mutationReceipt.create).toHaveBeenCalledOnce();
  });
  it('returns not found for a missing resource', async () => {
    const { service, tx } = await setup(); tx.ieltsTopic.findUnique.mockResolvedValue(null);
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns a safe conflict for referenced drafts', async () => {
    const { service, tx } = await setup();
    tx.ieltsTopic.deleteMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('private constraint detail', { code: 'P2003', clientVersion: '6.19.1' }));
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toMatchObject({ response: { code: 'CONTENT_REFERENCED' } });
    expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
  });
  it('rejects a lost conditional mutation without recording success', async () => {
    const { service, tx } = await setup(); tx.ieltsTopic.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(actorId, 'topic', id, command)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('lesson: deletes only the unassociated import, under the publisher slug lock and row lock', async () => {
    const { service, tx } = await setup();
    await expect(service.remove(actorId, 'lesson', id, command)).resolves.toEqual({ id, action: 'deleted' });
    expect(tx.$executeRaw.mock.calls.some(call => call.includes('lesson-one'))).toBe(true);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.contentImport.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id, draftRevision: 3 }) }));
    expect(tx.lesson.deleteMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.deleteMany).not.toHaveBeenCalled();
  });
  it('lesson: checks linked publication history even if the import looks like a draft', async () => {
    const { service, tx } = await setup();
    const record = await tx.contentImport.findUnique();
    tx.contentImport.findUnique.mockResolvedValue({ ...record, lessonId: 'lesson-id', lessonVersionId: versionId, lesson: { id: 'lesson-id', slug: 'lesson-one', currentPublishedVersionId: versionId, versions: [{ id: versionId }] } });
    await expect(service.remove(actorId, 'lesson', id, { ...command, expectedAction: 'archived' })).resolves.toEqual({ id, action: 'archived' });
    expect(tx.contentImport.deleteMany).not.toHaveBeenCalled();
    expect(tx.lesson.updateMany).toHaveBeenCalledWith({ where: { id: 'lesson-id', currentPublishedVersionId: versionId }, data: { currentPublishedVersionId: null } });
    expect(tx.lessonVersion.update).toHaveBeenCalledWith({ where: { id: versionId }, data: { status: 'ARCHIVED' } });
    expect(tx.contentImport.updateMany).toHaveBeenCalledWith({ where: { id, draftRevision: 3 }, data: { status: 'ARCHIVED', draftRevision: { increment: 1 }, updatedById: actorId } });
  });
  it('lesson: stale revisions cannot remove or archive an import', async () => {
    const { service, tx } = await setup();
    await expect(service.remove(actorId, 'lesson', id, { ...command, expectedRevision: 1 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.contentImport.deleteMany).not.toHaveBeenCalled();
    expect(tx.contentImport.updateMany).not.toHaveBeenCalled();
  });
  it('lesson: removing an unassociated draft with a shared published slug leaves that publication intact', async () => {
    const { service, tx } = await setup();
    const published = { id: 'other-lesson', slug: 'lesson-one', currentPublishedVersionId: versionId, versions: [{ id: versionId }] };
    tx.lesson.findUnique.mockResolvedValue(published);
    await expect(service.remove(actorId, 'lesson', id, command)).resolves.toEqual({ id, action: 'deleted' });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.lesson.deleteMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.update).not.toHaveBeenCalled();
    expect(tx.lessonVersion.deleteMany).not.toHaveBeenCalled();
    expect(published.currentPublishedVersionId).toBe(versionId);
  });
  it('lesson: deletion of a referenced import returns a safe conflict without a receipt', async () => {
    const { service, tx } = await setup();
    tx.contentImport.deleteMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('private constraint detail', { code: 'P2003', clientVersion: '6.19.1' }));
    await expect(service.remove(actorId, 'lesson', id, command)).rejects.toMatchObject({ response: { code: 'CONTENT_REFERENCED' } });
    expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
  });
  it('lesson: re-reads history after the row lock if publication wins the race', async () => {
    const { service, tx } = await setup();
    const initial = await tx.contentImport.findUnique();
    tx.$queryRaw.mockImplementation(async () => {
      tx.contentImport.findUnique.mockResolvedValue({ ...initial, status: 'PUBLISHED', lessonId: 'lesson-id', lessonVersionId: versionId, lesson: { id: 'lesson-id', slug: 'lesson-one', currentPublishedVersionId: versionId, versions: [{ id: versionId }] } });
    });
    await expect(service.remove(actorId, 'lesson', id, { ...command, expectedAction: 'archived' })).resolves.toMatchObject({ action: 'archived' });
    expect(tx.contentImport.deleteMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.update).toHaveBeenCalledWith({ where: { id: versionId }, data: { status: 'ARCHIVED' } });
  });
  it('lesson: retains newer publication when removing an older imported version', async () => {
    const { service, tx } = await setup();
    const record = await tx.contentImport.findUnique();
    tx.contentImport.findUnique.mockResolvedValue({ ...record, status: 'PUBLISHED', lessonId: 'lesson-id', lessonVersionId: 'old-version', lesson: { id: 'lesson-id', slug: 'lesson-one', currentPublishedVersionId: versionId, versions: [{ id: versionId }] } });
    await expect(service.remove(actorId, 'lesson', id, { ...command, expectedAction: 'archived' })).resolves.toMatchObject({ action: 'archived' });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.update).not.toHaveBeenCalled();
  });
  it('lesson: publication after confirmation at the same revision cannot turn delete into archive', async () => {
    const { service, tx } = await setup();
    const initial = await tx.contentImport.findUnique();
    tx.$queryRaw.mockImplementation(async () => {
      tx.contentImport.findUnique.mockResolvedValue({ ...initial, status: 'PUBLISHED', lessonId: 'lesson-id', lessonVersionId: versionId, lesson: { id: 'lesson-id', slug: 'lesson-one', currentPublishedVersionId: versionId, versions: [{ id: versionId }] } });
    });
    await expect(service.remove(actorId, 'lesson', id, command)).rejects.toMatchObject({ response: { code: 'CONTENT_LIFECYCLE_CHANGED' } });
    expect(tx.contentImport.deleteMany).not.toHaveBeenCalled();
    expect(tx.contentImport.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.update).not.toHaveBeenCalled();
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.mutationReceipt.create).not.toHaveBeenCalled();
  });
});
