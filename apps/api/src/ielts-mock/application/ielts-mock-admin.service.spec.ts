import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsMockAdminService } from './ielts-mock-admin.service.js';

const actorId = '11111111-1111-4111-8111-111111111111'; const mockId = '22222222-2222-4222-8222-222222222222';
const command = { expectedRevision: 1, idempotencyKey: '33333333-3333-4333-8333-333333333333' };
async function setup(status = 'DRAFT') { const tx = { $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn() }, ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id: mockId, status, draftRevision: 1, draftContent: INITIAL_IELTS_ACADEMIC_MOCK, versions: [] }) }, audioArtifact: { count: vi.fn().mockResolvedValue(0) } }; const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) }; const module = await Test.createTestingModule({ providers: [IeltsMockAdminService, { provide: PrismaService, useValue: database }] }).compile(); return { service: module.get(IeltsMockAdminService), tx }; }

describe('IeltsMockAdminService publish gate', () => {
  it('rejects publication unless the exact draft was validated', async () => { const { service } = await setup(); await expect(service.publish(actorId, mockId, command)).rejects.toBeInstanceOf(ConflictException); });
  it('rejects publication when listening audio is absent or not release-ready', async () => { const { service } = await setup('VALIDATED'); await expect(service.publish(actorId, mockId, command)).rejects.toBeInstanceOf(UnprocessableEntityException); });
});
