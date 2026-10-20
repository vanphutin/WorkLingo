import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsBandLearnerService } from './ielts-band-learner.service.js';

const now = new Date('2026-10-14T00:00:00.000Z');
const version = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', curriculumId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', version: 1, content: INITIAL_IELTS_BAND_CURRICULUM, sourceHash: 'hash', status: 'PUBLISHED', publishedAt: now, archivedAt: null };
const initialSnapshot = { proficiency: ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({ skill, descriptor: 'insufficient_evidence', confidence: 'none', sampleCount: 0 })), practicePerformance: { completedSessions: 0, evaluatedBlocks: 0, recentCorrectRate: null }, unmetCriteria: [], remediation: [], recommendedPracticeFormats: [], canAdvance: false };
const journey = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', learnerId: 'learner', clientJourneyId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', curriculumVersionId: version.id, currentStageCode: 'foundation_to_3', targetBand: 6, revision: 1, evidenceSnapshot: initialSnapshot, startedAt: now, completedAt: null, updatedAt: now, curriculumVersion: version };

async function setup(existing: typeof journey | null = null, earlyAccess = false) {
  const profile = { ieltsEarlyAccess: earlyAccess, user: { status: 'ACTIVE', role: 'LEARNER' } };
  const tx = {
    learnerProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
    $executeRaw: vi.fn(), ieltsBandJourney: {
      findUnique: vi.fn().mockResolvedValue(existing), findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(journey), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(journey),
    },
    ieltsBandCurriculum: { findFirst: vi.fn().mockResolvedValue({ status: 'PUBLISHED', currentPublishedVersion: version }) },
    ieltsBridgeProgress: { count: vi.fn().mockResolvedValue(4) },
    ieltsIntegratedSession: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const database = {
    learnerProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
    ieltsBridgeProgress: { count: vi.fn().mockResolvedValue(4) },
    ieltsBandCurriculum: { findFirst: vi.fn().mockResolvedValue({ status: 'PUBLISHED', currentPublishedVersionId: version.id }) },
    ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue(existing) },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({ providers: [IeltsBandLearnerService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsBandLearnerService), database, tx };
}

describe('IeltsBandLearnerService', () => {
  it('lets a granted learner view availability and start at the first stage without Bridge evidence', async () => {
    const { service, database, tx } = await setup(null, true);
    database.ieltsBridgeProgress.count.mockResolvedValue(0);
    tx.ieltsBridgeProgress.count.mockResolvedValue(0);
    await expect(service.availability('learner')).resolves.toMatchObject({ eligible: true, lockedReason: null, journey: null });
    await expect(service.start('learner', { clientJourneyId: journey.clientJourneyId, targetBand: 6 }))
      .resolves.toMatchObject({ currentStageCode: 'foundation_to_3', canAdvance: false,
        practicePerformance: { completedSessions: 0, evaluatedBlocks: 0, recentCorrectRate: null }, completedAt: null });
    const saved = tx.ieltsBandJourney.create.mock.calls[0]?.[0] as { data: { evidenceSnapshot: typeof initialSnapshot } };
    expect(saved.data.evidenceSnapshot.practicePerformance.completedSessions).toBe(0);
    expect(saved.data.evidenceSnapshot.proficiency.every((skill) => skill.sampleCount === 0)).toBe(true);
  });

  it('relocks availability and direct start after revocation without completed Bridge evidence', async () => {
    const { service, database, tx } = await setup(null, true);
    database.ieltsBridgeProgress.count.mockResolvedValue(0);
    tx.ieltsBridgeProgress.count.mockResolvedValue(0);
    const revoked = { ieltsEarlyAccess: false, user: { status: 'ACTIVE', role: 'LEARNER' } };
    database.learnerProfile.findUnique.mockResolvedValue(revoked);
    tx.learnerProfile.findUnique.mockResolvedValue(revoked);
    await expect(service.availability('learner')).resolves.toMatchObject({ eligible: false, lockedReason: 'BRIDGE_REQUIRED' });
    await expect(service.start('learner', { clientJourneyId: journey.clientJourneyId, targetBand: 6 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ieltsBandJourney.create).not.toHaveBeenCalled();
  });

  it('requires a published curriculum for granted learners in availability and direct start', async () => {
    const { service, database, tx } = await setup(null, true);
    database.ieltsBridgeProgress.count.mockResolvedValue(0);
    tx.ieltsBridgeProgress.count.mockResolvedValue(0);
    database.ieltsBandCurriculum.findFirst.mockResolvedValue(null);
    tx.ieltsBandCurriculum.findFirst.mockResolvedValue(null);
    await expect(service.availability('learner')).resolves.toMatchObject({ eligible: false, lockedReason: 'CURRICULUM_NOT_PUBLISHED' });
    await expect(service.start('learner', { clientJourneyId: journey.clientJourneyId, targetBand: 6 }))
      .rejects.toMatchObject({ response: { code: 'IELTS_BAND_CURRICULUM_UNAVAILABLE' } });
    expect(tx.ieltsBandJourney.create).not.toHaveBeenCalled();
  });

  it('starts a version-bound pathway after Bridge completion', async () => {
    const { service, tx } = await setup();
    await expect(service.start('learner', { clientJourneyId: journey.clientJourneyId, targetBand: 6 })).resolves.toMatchObject({ curriculumVersionId: version.id, currentStageCode: 'foundation_to_3', targetBand: 6 });
    expect(tx.ieltsBandJourney.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ curriculumVersionId: version.id }) }));
    expect(tx.learnerProfile.findUnique).not.toHaveBeenCalled();
  });

  it('does not expose another learner journey', async () => {
    const { service, database } = await setup();
    database.ieltsBandJourney.findUnique.mockResolvedValue(null);
    await expect(service.get('other')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('advances at most one stage when every authored criterion passes', async () => {
    const { service, tx } = await setup(journey);
    tx.ieltsIntegratedSession.findMany.mockResolvedValue([1, 2].map((index) => ({ id: String(index), blocks: ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({ skill, result: { correct: true } })) })) as never);
    tx.ieltsBandJourney.findUniqueOrThrow.mockResolvedValue({ ...journey, currentStageCode: 'band_3_to_4', revision: 2 });
    await expect(service.evaluate('learner', { expectedRevision: 1 })).resolves.toMatchObject({ currentStageCode: 'band_3_to_4' });
    expect(tx.ieltsBandJourney.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentStageCode: 'band_3_to_4' }) }));
  });

  it('blocks start when Bridge is incomplete', async () => {
    const { service, tx } = await setup(); tx.ieltsBridgeProgress.count.mockResolvedValue(3);
    await expect(service.start('learner', { clientJourneyId: journey.clientJourneyId, targetBand: 6 })).rejects.toBeInstanceOf(ConflictException);
  });
});
