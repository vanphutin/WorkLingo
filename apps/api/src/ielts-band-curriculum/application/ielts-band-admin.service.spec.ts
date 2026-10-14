import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsBandAdminService } from './ielts-band-admin.service.js';

const now = new Date('2026-10-14T00:00:00.000Z');
const record = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'ielts-band-pathway', status: 'DRAFT', draftRevision: 1, draftContent: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersionId: null, createdAt: now, updatedAt: now };

async function setup() {
  const tx = {
    $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() },
    ieltsBandCurriculum: { findUnique: vi.fn().mockResolvedValue({ ...record, versions: [] }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() },
    ieltsBandCurriculumVersion: { create: vi.fn().mockResolvedValue({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', curriculumId: record.id, version: 1, sourceHash: 'hash', content: INITIAL_IELTS_BAND_CURRICULUM, status: 'PUBLISHED', publishedAt: now, archivedAt: null }), update: vi.fn() },
  };
  const database = {
    ieltsBandCurriculum: { findFirst: vi.fn().mockResolvedValue({ ...record, currentPublishedVersion: null, versions: [] }), findUnique: vi.fn().mockResolvedValue(record), update: vi.fn() },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({ providers: [IeltsBandAdminService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsBandAdminService), database, tx };
}

describe('IeltsBandAdminService', () => {
  it('returns the complete seven-stage draft', async () => {
    const { service } = await setup();
    await expect(service.get()).resolves.toMatchObject({ draft: { stages: expect.arrayContaining([expect.objectContaining({ code: 'band_8_to_9' })]) } });
  });

  it('rejects stale writes before changing the draft', async () => {
    const { service, tx } = await setup();
    await expect(service.save('actor', { expectedRevision: 2, idempotencyKey: crypto.randomUUID(), content: INITIAL_IELTS_BAND_CURRICULUM })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ieltsBandCurriculum.updateMany).not.toHaveBeenCalled();
  });

  it('publishes an immutable version and audit event', async () => {
    const { service, tx } = await setup();
    await expect(service.publish('actor', { expectedRevision: 1, idempotencyKey: crypto.randomUUID() })).resolves.toMatchObject({ version: 1 });
    expect(tx.ieltsBandCurriculumVersion.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'PUBLISH_IELTS_BAND_CURRICULUM' }) }));
  });
});
