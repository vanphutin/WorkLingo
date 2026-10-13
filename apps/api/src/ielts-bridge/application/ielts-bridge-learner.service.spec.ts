import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IELTS_BRIDGE_SEEDS } from '../infrastructure/seed-ielts-bridge.js';
import { IeltsBridgeLearnerService } from './ielts-bridge-learner.service.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const moduleId = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
const progressId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-10-13T00:00:00.000Z');
const content = IELTS_BRIDGE_SEEDS[0]!;
const version = { id: versionId, moduleId, version: 1, title: content.title, content, status: 'PUBLISHED' };
const progress = {
  id: progressId, learnerId, moduleId, moduleVersionId: versionId, currentStageIndex: 0, revision: 1,
  stageResults: [], timedStageStartedAt: null, timedStageDeadlineAt: null, completedAt: null,
  createdAt: now, updatedAt: now, moduleVersion: version,
};

async function setup(options: { orientationComplete?: boolean; existingProgress?: typeof progress | null } = {}) {
  const existing = options.existingProgress ?? null;
  const tx = {
    $executeRaw: vi.fn(), $queryRaw: vi.fn(),
    orientationProgress: { findFirst: vi.fn().mockResolvedValue(options.orientationComplete === false ? null : { completedAt: now }) },
    ieltsBridgeModule: { findUnique: vi.fn().mockResolvedValue({ id: moduleId, status: 'PUBLISHED', currentPublishedVersion: version }) },
    ieltsBridgeProgress: {
      findUnique: vi.fn().mockResolvedValue(existing), findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(progress), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const database = {
    orientationProgress: { findFirst: vi.fn().mockResolvedValue(options.orientationComplete === false ? null : { completedAt: now }) },
    ieltsBridgeModule: { findMany: vi.fn().mockResolvedValue([{ id: moduleId, currentPublishedVersion: version }]) },
    ieltsBridgeProgress: { findMany: vi.fn().mockResolvedValue(existing ? [existing] : []) },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const testingModule = await Test.createTestingModule({
    providers: [IeltsBridgeLearnerService, { provide: PrismaService, useValue: database }],
  }).compile();
  return { database, service: testingModule.get(IeltsBridgeLearnerService), tx };
}

describe('IeltsBridgeLearnerService', () => {
  it('returns an explicit locked catalog until Orientation is complete', async () => {
    const { service } = await setup({ orientationComplete: false });
    await expect(service.catalog(learnerId)).resolves.toEqual({
      eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [],
    });
  });

  it('starts on the current version without leaking answers or rubrics', async () => {
    const { service } = await setup();
    const result = await service.start(learnerId, moduleId);
    expect(result).toMatchObject({ module: { id: versionId, moduleId, version: 1 }, progress: { revision: 1 } });
    expect(result.module.stages[2]?.task).not.toHaveProperty('answerIndex');
    expect(result.module.stages[6]?.task).not.toHaveProperty('rubric');
  });

  it('resumes a pinned version even if Orientation evidence is no longer available', async () => {
    const { service, tx } = await setup({ orientationComplete: false, existingProgress: progress });
    await expect(service.start(learnerId, moduleId)).resolves.toMatchObject({ module: { id: versionId } });
    expect(tx.orientationProgress.findFirst).not.toHaveBeenCalled();
    expect(tx.ieltsBridgeProgress.create).not.toHaveBeenCalled();
  });

  it('rejects a new start while Orientation is incomplete', async () => {
    const { service } = await setup({ orientationComplete: false });
    await expect(service.start(learnerId, moduleId)).rejects.toBeInstanceOf(ConflictException);
  });
});
