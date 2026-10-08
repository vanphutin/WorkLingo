import { describe, expect, it, vi } from 'vitest';
import { foundationMissionFixture } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import type { MasteryService } from '../../mastery/application/mastery.service.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { LearningSessionsService } from './learning-sessions.service.js';

describe('LearningSessionsService state transitions', () => {
  it('queues writing evaluation in the attempt transaction before advancing', async () => {
    const learnerId = '00000000-0000-4000-8000-000000000001';
    const sessionId = '00000000-0000-4000-8000-000000000002';
    const writingId = '00000000-0000-4000-8000-000000000005';
    const plan = {
      durationMinutes: 45,
      missionId: '00000000-0000-4000-8000-000000000010',
      lessonVersionId: '00000000-0000-4000-8000-000000000011',
      blocks: [
        { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000003'], skills: ['reading'] },
        { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000004'], skills: ['listening'] },
        { type: 'respond', order: 3, targetMinutes: 15, activityIds: [writingId], skills: ['speaking', 'writing'] },
      ],
    };
    const now = new Date();
    const created = {
      id: '00000000-0000-4000-8000-000000000006', learnerId, sessionId,
      activityId: writingId, clientAttemptId: '00000000-0000-4000-8000-000000000007',
      rawResponse: { text: 'I will follow up with the customer.' }, normalizedResponse: null,
      evaluationStatus: 'SUBMITTED', score: null, feedback: null, createdAt: now, updatedAt: now,
    };
    const evaluated = { ...created, evaluationStatus: 'QUEUED', normalizedResponse: created.rawResponse };
    const transaction = {
      activityAttempt: {
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn().mockResolvedValue(evaluated),
      },
      activityDraft: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      learningSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      sessionBlock: { update: vi.fn().mockResolvedValue({}) },
    };
    const database = {
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
      activity: { findFirst: vi.fn().mockResolvedValue({
        id: writingId,
        lessonVersionId: plan.lessonVersionId,
        slug: 'write-follow-up',
        order: 2,
        activityType: 'writing',
        learningBlock: 'respond',
        skills: ['writing'],
        contentReferences: ['email-1'],
        languageBlockReferences: ['follow-up'],
        payload: {
          prompt: 'Write a follow-up.', sampleAnswer: 'I will follow up tomorrow.',
          requiredPhrases: ['follow up'], minWords: 5,
        },
      }) },
      learningSession: { findFirst: vi.fn().mockResolvedValue({
        id: sessionId, learnerId, status: 'IN_PROGRESS', currentCheckpoint: 2,
        lessonVersionId: plan.lessonVersionId, planSnapshot: plan, attempts: [], blocks: [],
        mission: { id: plan.missionId, title: 'Workplace follow-up' },
      }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const enqueue = vi.fn().mockResolvedValue({ id: 'evaluation-job' });
    const jobs = { enqueue } as unknown as JobDispatcher;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new LearningSessionsService(database, {} as CurriculumService, mastery, jobs);

    const result = await service.submitAttempt(learnerId, writingId, {
      clientAttemptId: created.clientAttemptId,
      sessionId,
      response: created.rawResponse,
    });

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: `evaluate:${created.id}`,
      payload: { attemptId: created.id },
      type: 'EVALUATE_ATTEMPT',
    }), transaction);
    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
    expect(result.evaluationStatus).toBe('queued');
  });

  it('does not overwrite a session that completed after a stale pause read', async () => {
    const sessionId = '018f06f6-4f68-7a72-9411-4bf894341234';
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const findFirst = vi.fn()
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'COMPLETED' });
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const database = { learningSession: { findFirst, updateMany } } as unknown as PrismaService;
    const service = new LearningSessionsService(database, {} as CurriculumService, {} as MasteryService);

    await expect(service.pauseSession(learnerId, sessionId)).rejects.toMatchObject({
      response: { code: 'INVALID_STATE_TRANSITION' },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, learnerId, status: 'IN_PROGRESS' },
      data: { status: 'PAUSED' },
    });
  });

  it('rejects unsupported session durations with 422 and typed code', async () => {
    const service = new LearningSessionsService({} as PrismaService, {} as CurriculumService, {} as MasteryService);
    await expect(
      service.createSession('learner-id', 30, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_SESSION_DURATION' },
      status: 422,
    });
  });

  it('passes reviewQueue into planner and handles insufficient content with 422', async () => {
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const database = {
      learningSession: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
      learnerProfile: { findUnique: vi.fn().mockResolvedValue({ currentLevelCode: 'FOUNDATION_1' }) },
    } as unknown as PrismaService;

    const fixture = foundationMissionFixture;
    const curriculum = {
      getPublishedMissionsForLevel: vi.fn().mockResolvedValue([{
        id: '00000000-0000-4000-8000-000000000200',
        slug: fixture.slug,
        title: fixture.title,
        objective: fixture.objective,
        levelCode: fixture.level.code,
        lessonVersion: {
          id: '00000000-0000-4000-8000-000000000201',
          version: 1,
          title: fixture.lesson.title,
          contentBlocks: fixture.lesson.contentBlocks.map((b, i) => ({ ...b, id: `00000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}` })),
          wordBanks: fixture.lesson.wordBanks.map((wb) => ({
            ...wb,
            id: '00000000-0000-4000-8000-000000000010',
            languageBlocks: wb.languageBlocks.map((lb, i) => ({ ...lb, id: `00000000-0000-4000-8000-${(i + 20).toString().padStart(12, '0')}` })),
          })),
          activities: fixture.lesson.activities.map((a, i) => ({ ...a, order: i, id: `00000000-0000-4000-8000-${(i + 100).toString().padStart(12, '0')}` })),
        },
      }]),
    } as unknown as CurriculumService;
    const getReviewQueue = vi.fn().mockResolvedValue([]);
    const mastery = { getReviewQueue } as unknown as MasteryService;

    const service = new LearningSessionsService(database, curriculum, mastery);

    await expect(
      service.createSession(learnerId, 90, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: {
        code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
        availableDurations: [45, 60],
      },
      status: 422,
    });
    expect(getReviewQueue).toHaveBeenCalledWith(learnerId);
  });
});
