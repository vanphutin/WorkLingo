import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsMockAdminService } from './ielts-mock-admin.service.js';

const actorId = '11111111-1111-4111-8111-111111111111'; const mockId = '22222222-2222-4222-8222-222222222222';
const command = { expectedRevision: 1, idempotencyKey: '33333333-3333-4333-8333-333333333333' };
async function setup(status = 'DRAFT') { const tx = { $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn() }, ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id: mockId, status, draftRevision: 1, draftContent: INITIAL_IELTS_ACADEMIC_MOCK, versions: [] }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, audioArtifact: { count: vi.fn().mockResolvedValue(0) } }; const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) }; const module = await Test.createTestingModule({ providers: [IeltsMockAdminService, { provide: PrismaService, useValue: database }] }).compile(); return { service: module.get(IeltsMockAdminService), tx }; }

describe('IeltsMockAdminService publish gate', () => {
  it('rejects publication unless the exact draft was validated', async () => { const { service } = await setup(); await expect(service.publish(actorId, mockId, command)).rejects.toBeInstanceOf(ConflictException); });
  it('rejects publication when listening audio is absent or not release-ready', async () => { const { service } = await setup('VALIDATED'); await expect(service.publish(actorId, mockId, command)).rejects.toBeInstanceOf(UnprocessableEntityException); });
  it('locks and conditionally validates the same draft revision', async () => { const { service, tx } = await setup(); await service.validate(mockId, command); expect(tx.$executeRaw).toHaveBeenCalledOnce(); expect(tx.ieltsMockTest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: mockId, draftRevision: 1 } })); });
});

describe('IeltsMockAdminService list', () => {
  it('returns a bounded page and a next offset when more mocks exist', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, slug: `mock-${index}`, status: 'DRAFT', draftRevision: 1,
      draftContent: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], createdAt: new Date(index), updatedAt: new Date(0),
    }));
    const database = { ieltsMockTest: { findMany: vi.fn().mockResolvedValue(rows) } };
    const module = await Test.createTestingModule({ providers: [IeltsMockAdminService, { provide: PrismaService, useValue: database }] }).compile();

    const page = await module.get(IeltsMockAdminService).list();

    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(database.ieltsMockTest.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 51 }));
  });
});
