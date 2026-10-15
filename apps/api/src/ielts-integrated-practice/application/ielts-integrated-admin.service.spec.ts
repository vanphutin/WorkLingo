import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsIntegratedAdminService } from './ielts-integrated-admin.service.js';

const now = new Date('2026-10-13T00:00:00.000Z');
const content = { durationMinutes: 60 as const, allocations: [
  { skill: 'listening' as const, targetMinutes: 15 }, { skill: 'reading' as const, targetMinutes: 15 },
  { skill: 'writing' as const, targetMinutes: 20 }, { skill: 'speaking' as const, targetMinutes: 10 },
] };
const record = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', durationMinutes: 60, status: 'DRAFT', draftRevision: 1, draftContent: content, currentPublishedVersionId: null, createdAt: now, updatedAt: now };

async function setup() {
  const tx = { $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() }, ieltsIntegratedProfile: { findUnique: vi.fn().mockResolvedValue({ ...record, versions: [] }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn() }, ieltsIntegratedProfileVersion: { create: vi.fn(), update: vi.fn() } };
  const database = {
    ieltsIntegratedProfile: { findMany: vi.fn().mockResolvedValue([{ ...record, currentPublishedVersion: null, versions: [] }]), findUnique: vi.fn().mockResolvedValue({ ...record, currentPublishedVersion: null, versions: [] }), update: vi.fn() },
    mutationReceipt: { findUnique: vi.fn() }, $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({ providers: [IeltsIntegratedAdminService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsIntegratedAdminService), database, tx };
}

describe('IeltsIntegratedAdminService', () => {
  it('lists configurable duration profiles', async () => {
    const { service } = await setup();
    await expect(service.list()).resolves.toEqual([expect.objectContaining({ durationMinutes: 60, draft: content })]);
  });
  it('rejects stale draft writes before mutation', async () => {
    const { service, tx } = await setup(); tx.ieltsIntegratedProfile.findUnique.mockResolvedValue({ ...record, draftRevision: 1 });
    await expect(service.save('actor', record.id, { expectedRevision: 2, idempotencyKey: crypto.randomUUID(), content })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ieltsIntegratedProfile.updateMany).not.toHaveBeenCalled();
  });
  it('replays a successful draft save before checking the advanced revision', async () => {
    const { service, tx } = await setup();
    tx.mutationReceipt.findUnique.mockResolvedValue({ requestHash: (service as unknown as { hash(value: unknown): string }).hash({ expectedRevision: 1, idempotencyKey: '11111111-1111-4111-8111-111111111111', content }) });
    await expect(service.save('actor', record.id, { expectedRevision: 1, idempotencyKey: '11111111-1111-4111-8111-111111111111', content })).resolves.toMatchObject({ id: record.id });
    expect(tx.ieltsIntegratedProfile.findUnique).not.toHaveBeenCalled();
  });
  it('validates exact four-skill allocation', async () => {
    const { service, database } = await setup();
    await expect(service.validate(record.id, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() })).resolves.toMatchObject({ canPublish: true, status: 'VALIDATED' });
    expect(database.ieltsIntegratedProfile.update).toHaveBeenCalled();
  });
});
