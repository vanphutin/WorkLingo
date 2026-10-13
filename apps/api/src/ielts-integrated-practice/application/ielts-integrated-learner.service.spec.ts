import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IELTS_BRIDGE_SEEDS } from '../../ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { INITIAL_IELTS_INTEGRATED_PROFILES } from '@worklingo/contracts';
import { IeltsIntegratedLearnerService } from './ielts-integrated-learner.service.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const profileVersionId = '33333333-3333-4333-8333-333333333333';
const now = new Date('2026-10-13T00:00:00.000Z');
const profileContent = INITIAL_IELTS_INTEGRATED_PROFILES[0]!;
const moduleVersions = IELTS_BRIDGE_SEEDS.map((content, index) => ({
  id: `${index + 4}0000000-0000-4000-8000-000000000000`, content,
}));
const plan = {
  durationMinutes: 60, difficulty: 'foundation', profileVersionId,
  blocks: profileContent.allocations.map((allocation, index) => ({
    order: index + 1, skill: allocation.skill, targetMinutes: allocation.targetMinutes,
    moduleVersionId: moduleVersions[index]!.id, questionType: moduleVersions[index]!.content.questionType,
    mode: 'new_practice',
  })),
};
const session = {
  id: sessionId, learnerId, clientSessionId: '88888888-8888-4888-8888-888888888888',
  profileVersionId, durationMinutes: 60, difficulty: 'foundation', planSnapshot: plan,
  currentBlockIndex: 0, revision: 1, startedAt: now, completedAt: null, profileVersion: {},
  blocks: plan.blocks.map((block, index) => ({
    id: `9${index}000000-0000-4000-8000-000000000000`, ...block,
    result: null, completedAt: null, moduleVersion: moduleVersions[index]!,
  })),
};

async function setup(options: { bridgeCount?: number; existing?: typeof session | null } = {}) {
  const existing = options.existing ?? null;
  const tx = {
    $executeRaw: vi.fn(),
    ieltsBridgeProgress: { count: vi.fn().mockResolvedValue(options.bridgeCount ?? 4) },
    ieltsIntegratedSession: {
      findUnique: vi.fn().mockResolvedValue(existing), findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(session), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...session, revision: 2, currentBlockIndex: 1 }),
    },
    ieltsIntegratedSessionBlock: { update: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    ieltsIntegratedProfile: { findUnique: vi.fn().mockResolvedValue({ status: 'PUBLISHED', currentPublishedVersion: { id: profileVersionId, content: profileContent } }) },
    ieltsBridgeModule: { findMany: vi.fn().mockResolvedValue(moduleVersions.map((currentPublishedVersion) => ({ status: 'PUBLISHED', currentPublishedVersion }))) },
  };
  const database = {
    ieltsBridgeProgress: { count: vi.fn().mockResolvedValue(options.bridgeCount ?? 4) },
    ieltsIntegratedProfile: { findMany: vi.fn().mockResolvedValue(profileContent ? [60, 90, 120, 150].map((durationMinutes) => ({ durationMinutes })) : []) },
    ieltsIntegratedSession: { findFirst: vi.fn().mockResolvedValue(existing) },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({ providers: [IeltsIntegratedLearnerService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsIntegratedLearnerService), database, tx };
}

describe('IeltsIntegratedLearnerService', () => {
  it('keeps integrated practice locked until all required Bridge modules are complete', async () => {
    const { service } = await setup({ bridgeCount: 3 });
    await expect(service.availability(learnerId)).resolves.toMatchObject({ eligible: false, lockedReason: 'BRIDGE_REQUIRED' });
  });

  it('starts an immutable four-skill plan without leaking answer keys', async () => {
    const { service, tx } = await setup();
    const result = await service.start(learnerId, { clientSessionId: session.clientSessionId, durationMinutes: 60, difficulty: 'foundation' });
    expect(result.plan.profileVersionId).toBe(profileVersionId);
    expect(result.blocks).toHaveLength(4);
    expect(result.blocks[0]?.task).not.toHaveProperty('answerIndex');
    expect(tx.ieltsIntegratedSession.create).toHaveBeenCalledOnce();
  });

  it('marks skills with recent incorrect evidence for review', async () => {
    const { service, tx } = await setup();
    tx.ieltsIntegratedSessionBlock.findMany.mockResolvedValue([{
      skill: 'reading', questionType: 'reading_matching_headings', result: { correct: false },
    }]);
    await service.start(learnerId, { clientSessionId: session.clientSessionId, durationMinutes: 60, difficulty: 'foundation' });
    const createInput = tx.ieltsIntegratedSession.create.mock.calls[0]?.[0] as { data: { planSnapshot: typeof plan } };
    expect(createInput.data.planSnapshot.blocks.find((block) => block.skill === 'reading')?.mode).toBe('review');
  });

  it('replays an existing client session id without rebuilding its version-bound plan', async () => {
    const { service, tx } = await setup({ existing: session });
    await expect(service.start(learnerId, { clientSessionId: session.clientSessionId, durationMinutes: 60, difficulty: 'advanced' })).resolves.toMatchObject({ id: sessionId });
    expect(tx.ieltsIntegratedProfile.findUnique).not.toHaveBeenCalled();
    expect(tx.ieltsIntegratedSession.create).not.toHaveBeenCalled();
  });

  it('enforces owner scope when resuming a session', async () => {
    const { service } = await setup();
    await expect(service.get(learnerId, sessionId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a stale progress revision', async () => {
    const { service } = await setup({ existing: session });
    await expect(service.update(learnerId, sessionId, { expectedRevision: 2, blockIndex: 0, answer: 0 })).rejects.toBeInstanceOf(ConflictException);
  });
});
