import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { INTERMEDIATE_PROGRAM_ID } from '../../learning-programs/domain/program-catalog.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { OrientationLearnerService } from './orientation-learner.service.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const orientationId = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
const assetId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-10-13T00:00:00.000Z');
const content = {
  title: 'IELTS Orientation', description: 'Know the pathway.',
  slides: [
    { id: '51111111-1111-4111-8111-111111111111', slug: 'welcome', title: 'Welcome', body: 'Welcome.', transcript: 'Welcome.', imageAssetId: null, audioAssetId: assetId, question: null },
    { id: '52222222-2222-4222-8222-222222222222', slug: 'check', title: 'Check', body: 'Check.', transcript: 'Check.', imageAssetId: null, audioAssetId: null, question: { slug: 'format-check', prompt: 'How many skills?', options: ['Two', 'Four'], answerIndex: 1, explanation: 'IELTS assesses four skills.' } },
    { id: '53333333-3333-4333-8333-333333333333', slug: 'ready', title: 'Ready', body: 'Ready.', transcript: 'Ready.', imageAssetId: null, audioAssetId: null, question: null },
  ],
};
const version = { id: versionId, orientationId, version: 1, title: content.title, content };
const progress = { id: '66666666-6666-4666-8666-666666666666', learnerId, orientationVersionId: versionId, currentSlideIndex: 0, revision: 1, answers: [], completedAt: null, createdAt: now, updatedAt: now, orientationVersion: version };
const passedSkills = Object.fromEntries(['reading', 'listening', 'speaking', 'writing'].map((skill) => [skill, { score: 1, threshold: 0.8, passed: true, evaluatedCount: 1, pendingCount: 0 }]));

async function setup(overrides: { profile?: unknown; enrollment?: unknown; checkpoint?: unknown; existingProgress?: unknown } = {}) {
  const tx = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    learnerProfile: { findUnique: vi.fn().mockResolvedValue(overrides.profile === undefined ? { onboardingStatus: 'COMPLETE' } : overrides.profile) },
    learnerProgramEnrollment: { findUnique: vi.fn().mockResolvedValue(overrides.enrollment === undefined ? { id: 'enrollment' } : overrides.enrollment) },
    checkpointAssessment: { findFirst: vi.fn().mockResolvedValue(overrides.checkpoint === undefined ? { status: 'passed', canAdvance: true, skills: passedSkills } : overrides.checkpoint) },
    ieltsOrientation: { findUnique: vi.fn().mockResolvedValue({ id: orientationId, currentPublishedVersion: version }) },
    orientationProgress: {
      findFirst: vi.fn().mockResolvedValue(overrides.existingProgress ?? null),
      findUnique: vi.fn().mockResolvedValue(progress),
      create: vi.fn().mockResolvedValue(progress),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const database = {
    learnerProfile: { findUnique: vi.fn().mockResolvedValue(overrides.profile === undefined ? { onboardingStatus: 'COMPLETE' } : overrides.profile) },
    learnerProgramEnrollment: { findUnique: vi.fn().mockResolvedValue(overrides.enrollment === undefined ? { id: 'enrollment' } : overrides.enrollment) },
    checkpointAssessment: { findFirst: vi.fn().mockResolvedValue(overrides.checkpoint === undefined ? { status: 'passed', canAdvance: true, skills: passedSkills } : overrides.checkpoint) },
    ieltsOrientation: { findUnique: vi.fn().mockResolvedValue({ id: orientationId, currentPublishedVersion: version }) },
    orientationProgress: {
      findFirst: vi.fn().mockResolvedValue(overrides.existingProgress ?? null),
      create: vi.fn().mockResolvedValue(progress),
      findMany: vi.fn().mockResolvedValue([progress]),
    },
    orientationMediaAsset: { findFirst: vi.fn().mockResolvedValue({ id: assetId, orientationId, mimeType: 'audio/mpeg', storageKey: 'orientation/audio.mp3' }) },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const storage = { delete: vi.fn(), put: vi.fn(), read: vi.fn().mockResolvedValue(Buffer.from('audio')) };
  const module = await Test.createTestingModule({ providers: [
    OrientationLearnerService,
    { provide: PrismaService, useValue: database },
    { provide: ObjectStorage, useValue: storage },
  ] }).compile();
  return { database, service: module.get(OrientationLearnerService), storage, tx };
}

describe('OrientationLearnerService', () => {
  it('reports explicit lock reasons before Foundation evidence is complete', async () => {
    const { service } = await setup({ checkpoint: null });
    await expect(service.getStatus(learnerId)).resolves.toMatchObject({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'], presentation: null });
  });

  it('uses the latest Foundation checkpoint instead of an older passing attempt', async () => {
    const { database, service } = await setup({ checkpoint: { status: 'not_ready', canAdvance: false, skills: passedSkills } });
    await expect(service.getStatus(learnerId)).resolves.toMatchObject({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'] });
    expect(database.checkpointAssessment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { learnerId, levelCode: { startsWith: 'FOUNDATION_' } },
      orderBy: { createdAt: 'desc' },
    }));
  });

  it('starts an eligible learner on the current immutable version without answer keys', async () => {
    const { service, tx } = await setup();
    const result = await service.start(learnerId);
    expect(tx.learnerProgramEnrollment.findUnique).toHaveBeenCalledWith({ where: { learnerId_programId: { learnerId, programId: INTERMEDIATE_PROGRAM_ID } } });
    expect(result).toMatchObject({ state: 'in_progress', progress: { orientationVersionId: versionId, currentSlideIndex: 0 } });
    expect(result.presentation?.slides[1]?.question).not.toHaveProperty('answerIndex');
    expect(result.presentation?.slides[0]).not.toHaveProperty('audioAssetId');
  });

  it('keeps a wrong knowledge-check answer on the same slide and returns authored feedback', async () => {
    const { service, tx } = await setup({ existingProgress: progress });
    tx.orientationProgress.findUnique.mockResolvedValue({ ...progress, currentSlideIndex: 1 });
    const result = await service.updateProgress(learnerId, { orientationVersionId: versionId, expectedRevision: 1, targetSlideIndex: 2, answer: { questionSlug: 'format-check', selectedIndex: 0 }, complete: false });
    expect(result).toMatchObject({ progress: { currentSlideIndex: 1, revision: 2 }, answerFeedback: { correct: false, explanation: 'IELTS assesses four skills.' } });
  });

  it('streams only media referenced by a version pinned to the learner', async () => {
    const { service, storage } = await setup();
    await expect(service.getMedia(learnerId, assetId)).resolves.toEqual({ body: Buffer.from('audio'), mimeType: 'audio/mpeg' });
    expect(storage.read).toHaveBeenCalledWith('orientation/audio.mp3');
  });

  it('rejects media that is not referenced by a learner-pinned version', async () => {
    const { database, service } = await setup();
    database.orientationProgress.findMany.mockResolvedValue([]);
    await expect(service.getMedia(learnerId, assetId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not start when eligibility is locked', async () => {
    const { service } = await setup({ profile: { onboardingStatus: 'PENDING' } });
    await expect(service.start(learnerId)).rejects.toBeInstanceOf(ConflictException);
  });
});
