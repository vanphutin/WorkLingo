import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsMockLearnerService } from './ielts-mock-learner.service.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const mockId = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
const attemptId = '44444444-4444-4444-8444-444444444444';
const clientAttemptId = '55555555-5555-4555-8555-555555555555';
const startedAt = new Date('2026-10-14T00:00:00.000Z');
const version = { id: versionId, version: 1, content: INITIAL_IELTS_ACADEMIC_MOCK };
const attempt = {
  id: attemptId, learnerId, clientAttemptId, mockTestVersionId: versionId, mode: 'EXAM_SIMULATION', status: 'IN_PROGRESS',
  currentSection: 'LISTENING', revision: 1, responses: {}, submittedSections: [], objectiveScore: null, productiveEvaluation: null,
  reportSnapshot: null, sectionStartedAt: startedAt, sectionDeadlineAt: new Date(startedAt.getTime() + 30 * 60_000),
  startedAt, submittedAt: null, completedAt: null, updatedAt: startedAt, mockTestVersion: version,
};

async function setup(options: { journey?: boolean; existing?: typeof attempt | null } = {}) {
  const existing = options.existing ?? null;
  const tx = {
    $executeRaw: vi.fn(),
    ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue(options.journey === false ? null : { id: 'journey' }) },
    ieltsMockAttempt: {
      findUnique: vi.fn().mockResolvedValue(existing), findFirst: vi.fn().mockResolvedValue(existing), create: vi.fn().mockResolvedValue(attempt),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn().mockResolvedValue({ ...attempt, revision: 2 }),
    },
    ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id: mockId, status: 'PUBLISHED', currentPublishedVersion: version }) },
  };
  const database = {
    ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue(options.journey === false ? null : { id: 'journey' }) },
    ieltsMockTest: { findMany: vi.fn().mockResolvedValue([{ id: mockId, status: 'PUBLISHED', currentPublishedVersion: version }]) },
    ieltsMockAttempt: { findFirst: vi.fn().mockResolvedValue(existing), findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({ providers: [IeltsMockLearnerService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsMockLearnerService), tx };
}

describe('IeltsMockLearnerService', () => {
  it('keeps the catalog locked until a Band Pathway journey exists', async () => {
    const { service } = await setup({ journey: false });
    await expect(service.catalog(learnerId)).resolves.toEqual({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
  });

  it('pins the current immutable version and does not expose answer keys', async () => {
    const { service, tx } = await setup();
    const result = await service.start(learnerId, { clientAttemptId, mockTestId: mockId, mode: 'EXAM_SIMULATION' });
    expect(result.mockTestVersionId).toBe(versionId);
    expect(result.sectionContent.listening[0]).not.toHaveProperty('answerPolicy');
    expect(result.sectionContent.listening[0]).not.toHaveProperty('explanation');
    expect(tx.ieltsMockAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mockTestVersionId: versionId }) }));
  });

  it('replays the same client attempt without selecting a newer version', async () => {
    const { service, tx } = await setup({ existing: attempt });
    await expect(service.start(learnerId, { clientAttemptId, mockTestId: mockId, mode: 'PRACTICE' })).resolves.toMatchObject({ id: attemptId, mockTestVersionId: versionId });
    expect(tx.ieltsMockTest.findUnique).not.toHaveBeenCalled();
    expect(tx.ieltsMockAttempt.create).not.toHaveBeenCalled();
  });

  it('rejects stale response saves and out-of-order section submissions', async () => {
    const { service } = await setup({ existing: attempt });
    await expect(service.saveResponses(learnerId, attemptId, { expectedRevision: 2, responses: {} })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.submitSection(learnerId, attemptId, { expectedRevision: 1, section: 'READING' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('enforces owner scope when resuming an attempt', async () => {
    const { service } = await setup();
    await expect(service.get(learnerId, attemptId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
