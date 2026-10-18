import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { CurriculumService } from '../curriculum/application/curriculum.service.js';
import { IeltsBridgeLearnerService } from '../ielts-bridge/application/ielts-bridge-learner.service.js';
import { IELTS_BRIDGE_SEEDS } from '../ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { IeltsMockLearnerService } from '../ielts-mock/application/ielts-mock-learner.service.js';
import { IeltsStudyService } from '../ielts-study/application/ielts-study.service.js';
import { IeltsTopicAdminService } from '../ielts-study/application/ielts-topic-admin.service.js';
import { topicFixture } from '../ielts-study/domain/ielts-topic-validation.fixture.js';
import { LearningSessionsService } from '../learning-sessions/application/learning-sessions.service.js';
import { SessionCreationService } from '../learning-sessions/application/session-creation.service.js';
import { ProgramContextService } from '../learning-programs/application/program-context.service.js';
import { CurriculumEligibilityService } from '../curriculum-foundation/application/curriculum-eligibility.service.js';
import { CurriculumProgressService } from '../curriculum-foundation/application/curriculum-progress.service.js';
import { MasteryService } from '../mastery/application/mastery.service.js';
import { ObjectStorage } from '../storage/domain/object-storage.port.js';

const learnerId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const versionId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const clientId = '55555555-5555-4555-8555-555555555555';
const now = new Date();

function retainedSession() {
  return {
    id: sessionId, clientSessionId: clientId, learnerId, lessonVersionId: versionId,
    curriculumRevisionId: null, currentCheckpoint: 0, durationMinutes: 45, status: 'IN_PROGRESS',
    attempts: [], blocks: [], ieltsTopicSession: null,
    mission: { id, title: 'Retained mission', purpose: 'LEARNING' },
    planSnapshot: { durationMinutes: 45, missionId: id, lessonVersionId: versionId, blocks: [
      { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: [id], skills: ['reading'] },
      { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: [versionId], skills: ['listening'] },
      { type: 'respond', order: 3, targetMinutes: 15, activityIds: [sessionId], skills: ['speaking', 'writing'] },
    ] },
  };
}

// Pure unit tests: the fixtures below are values; no fixture seeding functions are called.
describe('Archive compatibility with learner services', () => {
  it('Bridge: denies new entry while existing progress still resumes its archived snapshot', async () => {
    const content = IELTS_BRIDGE_SEEDS[0]!;
    const version = { id: versionId, moduleId: id, version: 1, title: content.title, content, status: 'ARCHIVED' };
    const progress = { id: sessionId, learnerId, moduleId: id, moduleVersionId: versionId, currentStageIndex: 0, revision: 1, stageResults: [], timedStageStartedAt: null, timedStageDeadlineAt: null, completedAt: null, createdAt: now, updatedAt: now, moduleVersion: version };
    const tx = {
      $executeRaw: vi.fn(), orientationProgress: { findFirst: vi.fn().mockResolvedValue({ completedAt: now }) },
      ieltsBridgeModule: { findUnique: vi.fn().mockResolvedValue({ id, status: 'ARCHIVED', currentPublishedVersion: null }) },
      ieltsBridgeProgress: { findUnique: vi.fn(), create: vi.fn() },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };
    const module = await Test.createTestingModule({ providers: [IeltsBridgeLearnerService, { provide: PrismaService, useValue: database }] }).compile();
    const service = module.get(IeltsBridgeLearnerService);
    await expect(service.start(learnerId, id)).rejects.toBeInstanceOf(NotFoundException);
    tx.ieltsBridgeProgress.findUnique.mockResolvedValue(progress);
    await expect(service.start(learnerId, id)).resolves.toMatchObject({ module: { id: versionId }, progress: { moduleVersionId: versionId } });
    expect(tx.ieltsBridgeProgress.create).not.toHaveBeenCalled();
  });

  it('Mock: denies a new attempt while a retained attempt still resumes its archived version', async () => {
    const version = { id: versionId, mockTestId: id, version: 1, content: INITIAL_IELTS_ACADEMIC_MOCK, status: 'ARCHIVED' };
    const attempt = { id: sessionId, learnerId, clientAttemptId: clientId, mockTestVersionId: versionId, mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'LISTENING', revision: 1, responses: {}, submittedSections: [], objectiveScore: null, productiveEvaluation: null, reportSnapshot: null, sectionStartedAt: now, sectionDeadlineAt: new Date(now.getTime() + 30 * 60_000), audioPlayEvents: {}, startedAt: now, submittedAt: null, completedAt: null, updatedAt: now, mockTestVersion: version };
    const tx = {
      $executeRaw: vi.fn(), ieltsBandJourney: { findUnique: vi.fn().mockResolvedValue({ id: 'journey' }) },
      ieltsMockTest: { findUnique: vi.fn().mockResolvedValue({ id, status: 'ARCHIVED', currentPublishedVersion: null }) },
      ieltsMockAttempt: { findUnique: vi.fn(), create: vi.fn() },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };
    const module = await Test.createTestingModule({ providers: [IeltsMockLearnerService, { provide: PrismaService, useValue: database }, { provide: ObjectStorage, useValue: {} }] }).compile();
    const service = module.get(IeltsMockLearnerService);
    const input = { clientAttemptId: clientId, mockTestId: id, mode: 'PRACTICE' };
    await expect(service.start(learnerId, input)).rejects.toMatchObject({ response: { code: 'IELTS_MOCK_NOT_PUBLISHED' } });
    tx.ieltsMockAttempt.findUnique.mockResolvedValue(attempt);
    await expect(service.start(learnerId, input)).resolves.toMatchObject({ id: sessionId, mockTestVersionId: versionId });
    expect(tx.ieltsMockAttempt.create).not.toHaveBeenCalled();
  });

  it('Topic: denies new entry while an existing session resumes its retained topic version', async () => {
    const fixture = topicFixture();
    const content = { schemaVersion: 1, title: 'Education', description: 'Education study.', packs: [fixture.pack] };
    const version = { id: versionId, content, status: 'ARCHIVED', topic: { id, status: 'ARCHIVED', currentPublishedVersionId: null } };
    const tx = {
      $executeRaw: vi.fn(), $queryRaw: vi.fn(), learningSession: { findUnique: vi.fn() },
      user: { findUnique: vi.fn().mockResolvedValue({ role: 'LEARNER', status: 'ACTIVE', profile: { onboardingStatus: 'COMPLETE' } }) },
      learningProgram: { findUnique: vi.fn().mockResolvedValue({ id, availabilityStatus: 'AVAILABLE' }) },
      ieltsTopicVersion: { findUnique: vi.fn().mockResolvedValue(version) },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };
    const module = await Test.createTestingModule({ providers: [IeltsStudyService,
      { provide: PrismaService, useValue: database }, { provide: ConfigService, useValue: { get: () => 'v3' } },
      ...[CurriculumService, SessionCreationService, MasteryService, IeltsTopicAdminService].map(provide => ({ provide, useValue: {} })),
    ] }).compile();
    const service = module.get(IeltsStudyService);
    const input = { clientSessionId: clientId, topicVersionId: versionId, packSlug: fixture.pack.slug, durationMinutes: 90 };
    await expect(service.start(learnerId, input)).rejects.toMatchObject({ response: { code: 'IELTS_TOPIC_NOT_PUBLISHED' } });
    tx.learningSession.findUnique.mockResolvedValue({ ...retainedSession(), durationMinutes: 90, ieltsTopicSession: { topicVersionId: versionId, packSlug: fixture.pack.slug, topicVersion: version } });
    await expect(service.start(learnerId, input)).resolves.toMatchObject({ id: sessionId, ieltsTopic: { topicVersionId: versionId } });
  });

  it('Lesson: an archived current version blocks new curriculum binding but retained sessions remain readable', async () => {
    const database = {
      curriculumRevision: { findUnique: vi.fn().mockResolvedValue({ status: 'PUBLISHED', lessons: [{ lessonVersion: { id: versionId, status: 'ARCHIVED' } }] }) },
      learningSession: { findFirst: vi.fn().mockResolvedValue(retainedSession()) },
    };
    const module = await Test.createTestingModule({ providers: [CurriculumService, LearningSessionsService,
      { provide: PrismaService, useValue: database },
      ...[MasteryService, SessionCreationService, ProgramContextService, CurriculumEligibilityService, CurriculumProgressService].map(provide => ({ provide, useValue: {} })),
    ] }).compile();
    await expect(module.get(CurriculumService).getPublishedMissionForRevision(id)).rejects.toBeInstanceOf(ConflictException);
    await expect(module.get(LearningSessionsService).getSession(learnerId, sessionId)).resolves.toMatchObject({ id: sessionId, lessonVersionId: versionId, status: 'in_progress' });
  });
});
