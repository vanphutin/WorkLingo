import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsMockAdminService } from './ielts-mock-admin.service.js';

const actorId = '11111111-1111-4111-8111-111111111111'; const mockId = '22222222-2222-4222-8222-222222222222';
const command = { expectedRevision: 1, idempotencyKey: '33333333-3333-4333-8333-333333333333' };
async function setup(status = 'DRAFT') { const tx = { $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn() }, ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id: mockId, status, draftRevision: 1, draftContent: INITIAL_IELTS_ACADEMIC_MOCK, versions: [] }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, audioArtifact: { count: vi.fn().mockResolvedValue(0) } }; const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) }; const module = await Test.createTestingModule({ providers: [IeltsMockAdminService, { provide: PrismaService, useValue: database }] }).compile(); return { service: module.get(IeltsMockAdminService), tx }; }

describe('IeltsMockAdminService publish gate', () => {
  it('rejects a schema-valid V2 draft whose audio/content qualification was only declared', async () => {
    const { service, tx } = await setup();
    const base = await tx.ieltsMockTest.findUnique();
    tx.ieltsMockTest.findUnique.mockResolvedValue({ ...base, draftContent: { ...INITIAL_IELTS_ACADEMIC_MOCK, schemaVersion: 2, allowedModes: ['PRACTICE', 'EXAM_SIMULATION'], qualification: { reviewedBy: 'Declared only', reviewedAt: new Date().toISOString(), evidenceRevision: 'unverified', qualifiedModes: ['PRACTICE','EXAM_SIMULATION'] } } } as typeof base);
    expect((await service.validate(mockId, command)).canPublish).toBe(false);
  });
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

describe('IeltsMockAdminService create', () => {
  async function createSetup() {
    const rows: Array<Record<string, unknown>> = [];
    const tx = {
      $executeRaw: vi.fn(), user: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', role: 'CONTENT_ADMIN' }) },
      mutationReceipt: { findUnique: vi.fn(), create: vi.fn() }, auditLog: { create: vi.fn() },
      ieltsMockTest: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { status: 'DRAFT', draftRevision: 1, currentPublishedVersion: null, versions: [], createdAt: new Date(0), updatedAt: new Date(0), ...data };
        rows.push(row); return row;
      }) },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };
    const module = await Test.createTestingModule({ providers: [IeltsMockAdminService, { provide: PrismaService, useValue: database }] }).compile();
    return { service: module.get(IeltsMockAdminService), tx, rows, database };
  }
  const input = { idempotencyKey: command.idempotencyKey, content: INITIAL_IELTS_ACADEMIC_MOCK };
  it('creates independent schema-valid draft papers with unique slugs and atomic audit receipts', async () => {
    const { service, tx } = await createSetup();
    const first = await service.create(actorId, input);
    const second = await service.create(actorId, { ...input, idempotencyKey: crypto.randomUUID() });
    expect(first).toMatchObject({ status: 'DRAFT', draftRevision: 1, draft: input.content, versions: [], currentPublishedVersion: null });
    expect(first.id).not.toBe(second.id);
    expect(first.slug).not.toBe(second.slug);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    expect(tx.mutationReceipt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ responseBody: first, responseStatus: 201 }) }));
  });
  it('rejects invalid paper content before opening a transaction', async () => {
    const { service, database } = await createSetup();
    await expect(service.create(actorId, { ...input, content: {} })).rejects.toBeInstanceOf(BadRequestException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });
  it('rejects non-admin and inactive creators', async () => {
    const { service, tx } = await createSetup();
    for (const user of [{ role: 'LEARNER', status: 'ACTIVE' }, { role: 'CONTENT_ADMIN', status: 'SUSPENDED' }]) {
      tx.user.findUnique.mockResolvedValue(user);
      await expect(service.create(actorId, input)).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(tx.ieltsMockTest.create).not.toHaveBeenCalled();
  });
  it('replays the original DTO after acquiring the idempotency lock', async () => {
    const { service, tx } = await createSetup();
    const first = await service.create(actorId, input);
    const data = tx.mutationReceipt.create.mock.calls[0]![0].data;
    tx.mutationReceipt.findUnique.mockResolvedValue(data);
    await expect(service.create(actorId, input)).resolves.toEqual(first);
    expect(tx.ieltsMockTest.create).toHaveBeenCalledOnce();
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });
  it('rejects idempotency key reuse with different content', async () => {
    const { service, tx } = await createSetup();
    tx.mutationReceipt.findUnique.mockResolvedValue({ requestHash: 'different', responseBody: {} });
    await expect(service.create(actorId, input)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ieltsMockTest.create).not.toHaveBeenCalled();
  });
});
