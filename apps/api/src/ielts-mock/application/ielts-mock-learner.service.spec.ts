import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { IeltsMockLearnerService } from './ielts-mock-learner.service.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const mockId = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
const attemptId = '44444444-4444-4444-8444-444444444444';
const clientAttemptId = '55555555-5555-4555-8555-555555555555';
const startedAt = new Date('2026-10-14T00:00:00.000Z');
  const version = { id: versionId, mockTestId: mockId, version: 1, content: INITIAL_IELTS_ACADEMIC_MOCK };
const attempt = {
  id: attemptId, learnerId, clientAttemptId, mockTestVersionId: versionId, mode: 'EXAM_SIMULATION', status: 'IN_PROGRESS',
  currentSection: 'LISTENING', revision: 1, responses: {}, submittedSections: [], objectiveScore: null, productiveEvaluation: null,
  reportSnapshot: null, sectionStartedAt: startedAt, sectionDeadlineAt: new Date(startedAt.getTime() + 30 * 60_000),
  audioPlayEvents: {},
  startedAt, submittedAt: null, completedAt: null, updatedAt: startedAt, mockTestVersion: version,
};

async function setup(options: { journey?: boolean; existing?: typeof attempt | null } = {}) {
  const existing = options.existing ?? null;
  const tx = {
    $executeRaw: vi.fn(),
    ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue(options.journey === false ? null : { id: 'journey' }) },
    ieltsMockAttempt: {
      findUnique: vi.fn().mockResolvedValue(existing), findFirst: vi.fn().mockResolvedValue(existing), create: vi.fn().mockResolvedValue(attempt),
      update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn().mockResolvedValue({ ...attempt, revision: 2 }),
    },
    ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id: mockId, status: 'PUBLISHED', currentPublishedVersion: version }) },
    audioArtifact: { findFirst: vi.fn() },
  };
  const database = {
    ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue(options.journey === false ? null : { id: 'journey' }) },
    ieltsMockTest: { findMany: vi.fn().mockResolvedValue([{ id: mockId, status: 'PUBLISHED', currentPublishedVersion: version }]) },
    ieltsMockAttempt: { findFirst: vi.fn().mockResolvedValue(existing), findMany: vi.fn().mockResolvedValue([]) },
    audioArtifact: { findFirst: vi.fn() },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const storage = { read: vi.fn() };
  const module = await Test.createTestingModule({ providers: [IeltsMockLearnerService, { provide: PrismaService, useValue: database }, { provide: ObjectStorage, useValue: storage }] }).compile();
  return { service: module.get(IeltsMockLearnerService), tx, storage };
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
    expect(result.sectionContent.listening[0]?.questions[0]).not.toHaveProperty('answerPolicy');
    expect(result.sectionContent.listening[0]?.questions[0]).not.toHaveProperty('explanation');
    expect(result.sectionContent.reading).toEqual([]);
    expect(result.sectionContent.writing).toEqual([]);
    expect(result.sectionContent.speaking).toEqual([]);
    expect(tx.ieltsMockAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mockTestVersionId: versionId }) }));
  });

  it('replays the same client attempt without selecting a newer version', async () => {
    const { service, tx } = await setup({ existing: attempt });
    await expect(service.start(learnerId, { clientAttemptId, mockTestId: mockId, mode: 'EXAM_SIMULATION' })).resolves.toMatchObject({ id: attemptId, mockTestVersionId: versionId });
    expect(tx.ieltsMockTest.findUnique).not.toHaveBeenCalled();
    expect(tx.ieltsMockAttempt.create).not.toHaveBeenCalled();
  });

  it('rejects a reused client attempt id with a conflicting command', async () => {
    const { service } = await setup({ existing: attempt });
    await expect(service.start(learnerId, { clientAttemptId, mockTestId: mockId, mode: 'PRACTICE' })).rejects.toBeInstanceOf(ConflictException);
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

  it('does not create a misleading report before all sections are submitted', async () => {
    const { service } = await setup({ existing: attempt });
    await expect(service.report(learnerId, attemptId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects response changes after the server deadline', async () => {
    const expired = { ...attempt, sectionDeadlineAt: new Date('2020-01-01T00:00:00.000Z') };
    const { service } = await setup({ existing: expired });
    await expect(service.saveResponses(learnerId, attemptId, { expectedRevision: 1, responses: {} })).rejects.toBeInstanceOf(ConflictException);
  });

  it('server-submits an expired section when the learner resumes', async () => {
    const expired = { ...attempt, sectionDeadlineAt: new Date('2020-01-01T00:00:00.000Z') };
    const { service, tx } = await setup({ existing: expired });
    await service.get(learnerId, attemptId);
    expect(tx.ieltsMockAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ currentSection: 'READING' }) }));
  });

  it('allows only one server-recorded audio play in exam simulation', async () => {
    const assetId = crypto.randomUUID(); const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => index === 0 ? { ...part, audioAssetId: assetId } : part) } };
    const played = { ...attempt, audioPlayEvents: { [assetId]: 1 }, mockTestVersion: { ...version, content } };
    const { service, tx } = await setup({ existing: played });
    tx.audioArtifact = { findFirst: vi.fn().mockResolvedValue({ id: assetId, status: 'READY', adapterName: 'azure-speech', storageKey: 'audio.wav', byteSize: 10, mimeType: 'audio/wav' }) };
    await expect(service.getAudio(learnerId, attemptId, assetId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('serves the first exam play as one full response without range follow-ups', async () => {
    const assetId = crypto.randomUUID(); const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => index === 0 ? { ...part, audioAssetId: assetId } : part) } };
    const fresh = { ...attempt, audioPlayEvents: {}, mockTestVersion: { ...version, content } }; const { service, tx } = await setup({ existing: fresh });
    tx.audioArtifact.findFirst.mockResolvedValue({ id: assetId, status: 'READY', adapterName: 'azure-speech', storageKey: 'audio.wav', byteSize: 10, mimeType: 'audio/wav' });
    await expect(service.getAudio(learnerId, attemptId, assetId)).resolves.toMatchObject({ allowRange: false, byteSize: 10 });
    expect(tx.ieltsMockAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ data: { audioPlayEvents: { [assetId]: 1 } } }));
  });

  it('does not consume the exam play when storage cannot return audio', async () => {
    const assetId = crypto.randomUUID(); const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => index === 0 ? { ...part, audioAssetId: assetId } : part) } };
    const fresh = { ...attempt, audioPlayEvents: {}, mockTestVersion: { ...version, content } }; const { service, tx, storage } = await setup({ existing: fresh });
    tx.audioArtifact.findFirst.mockResolvedValue({ id: assetId, status: 'READY', adapterName: 'azure-speech', storageKey: 'audio.wav', byteSize: 10, mimeType: 'audio/wav' });
    storage.read.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(service.getAudio(learnerId, attemptId, assetId)).rejects.toThrow('storage unavailable');
    expect(tx.ieltsMockAttempt.update).not.toHaveBeenCalled();
  });
});
