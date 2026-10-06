import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MasteryService } from './mastery.service';
import { TestClock } from '../domain/clock.port';
import type { PrismaService } from '../../common/database/prisma.service';

describe('MasteryService', () => {
  const clock = new TestClock(new Date('2026-10-06T12:00:00Z'));
  let prismaMock: {
    $executeRaw: ReturnType<typeof vi.fn>;
    $transaction: ReturnType<typeof vi.fn>;
    languageBlock: { findMany: ReturnType<typeof vi.fn> };
    masteryEvent: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    masteryRecord: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    errorBankEntry: {
      create: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    activityAttempt: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let service: MasteryService;

  beforeEach(() => {
    prismaMock = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $transaction: vi.fn(async (work: (client: typeof prismaMock) => Promise<unknown>) => work(prismaMock)),
      languageBlock: {
        findMany: vi.fn(),
      },
      masteryEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      masteryRecord: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      errorBankEntry: {
        create: vi.fn(),
        upsert: vi.fn(),
      },
      activityAttempt: {
        findUnique: vi.fn(),
      },
    };
    service = new MasteryService(prismaMock as unknown as PrismaService, clock);
  });

  it('records mastery event and upserts mastery record idempotently', async () => {
    const lbId = 'lb-uuid-1';
    prismaMock.languageBlock.findMany.mockResolvedValue([
      { id: lbId, slug: 'my-name-is' },
    ]);
    prismaMock.masteryEvent.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.upsert.mockResolvedValue({ id: 'mr-uuid-1' });
    prismaMock.masteryEvent.create.mockResolvedValue({ id: 'me-uuid-1' });

    const results = await service.recordAttemptEvaluation({
      attemptId: 'att-1',
      learnerId: 'learner-1',
      lessonVersionId: 'lv-1',
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 1.0,
      evaluationStatus: 'EVALUATED',
    });

    expect(results).toHaveLength(1);
    expect(prismaMock.masteryRecord.upsert).toHaveBeenCalled();
    expect(prismaMock.masteryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptId: 'att-1',
          learnerId: 'learner-1',
          lessonVersionId: 'lv-1',
          skill: 'reading',
          eventType: 'CORRECT_RECALL',
          score: 1.0,
        }),
      }),
    );
  });

  it('skips event creation if attempt event already exists (idempotency)', async () => {
    prismaMock.languageBlock.findMany.mockResolvedValue([
      { id: 'lb-1', slug: 'my-name-is' },
    ]);
    // Event already exists
    prismaMock.masteryEvent.findUnique.mockResolvedValue({ id: 'existing-event' });

    const results = await service.recordAttemptEvaluation({
      attemptId: 'att-1',
      learnerId: 'learner-1',
      lessonVersionId: 'lv-1',
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 1.0,
      evaluationStatus: 'EVALUATED',
    });

    expect(results).toHaveLength(0);
    expect(prismaMock.masteryRecord.upsert).not.toHaveBeenCalled();
    expect(prismaMock.masteryEvent.create).not.toHaveBeenCalled();
  });

  it('creates ErrorBankEntry when eventType is INCORRECT_ATTEMPT (score < 0.7)', async () => {
    const lbId = 'lb-uuid-1';
    prismaMock.languageBlock.findMany.mockResolvedValue([
      { id: lbId, slug: 'my-name-is' },
    ]);
    prismaMock.masteryEvent.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.upsert.mockResolvedValue({ id: 'mr-uuid-1' });
    prismaMock.masteryEvent.create.mockResolvedValue({
      id: 'me-uuid-1',
      eventType: 'INCORRECT_ATTEMPT',
      score: 0.4,
      skill: 'reading',
      createdAt: clock.now(),
    });
    prismaMock.activityAttempt.findUnique.mockResolvedValue({
      learnerId: 'learner-1',
      evaluationStatus: 'EVALUATED',
      score: 0.4,
      activity: {
        id: 'act-uuid-1',
        slug: 'greeting-read',
        lessonVersionId: 'lv-1',
        lessonVersion: { lessonId: 'lesson-uuid-1' },
      },
    });

    const results = await service.recordAttemptEvaluation({
      attemptId: 'att-1',
      learnerId: 'learner-1',
      lessonVersionId: 'lv-1',
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.4, // Incorrect attempt
      evaluationStatus: 'EVALUATED',
    });

    expect(results).toHaveLength(1);
    expect(prismaMock.errorBankEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          learnerId: 'learner-1',
          masteryEventId: 'me-uuid-1',
          languageBlockId: lbId,
          skill: 'reading',
          errorType: 'ACTIVITY_INCORRECT',
          evidenceGranularity: 'ACTIVITY',
          lessonVersionId: 'lv-1',
          activityId: 'act-uuid-1',
          activitySlug: 'greeting-read',
          contextKey: 'lesson-uuid-1:greeting-read',
          occurredAt: clock.now(),
        }),
      }),
    );
  });

  it('does NOT create ErrorBankEntry when score is >= 0.7 (CORRECT_RECALL)', async () => {
    const lbId = 'lb-uuid-1';
    prismaMock.languageBlock.findMany.mockResolvedValue([
      { id: lbId, slug: 'my-name-is' },
    ]);
    prismaMock.masteryEvent.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.findUnique.mockResolvedValue(null);
    prismaMock.masteryRecord.upsert.mockResolvedValue({ id: 'mr-uuid-1' });
    prismaMock.masteryEvent.create.mockResolvedValue({ id: 'me-uuid-1' });

    await service.recordAttemptEvaluation({
      attemptId: 'att-1',
      learnerId: 'learner-1',
      lessonVersionId: 'lv-1',
      skills: ['reading'],
      languageBlockSlugs: ['my-name-is'],
      score: 0.9, // Correct attempt
      evaluationStatus: 'EVALUATED',
    });

    expect(prismaMock.errorBankEntry.create).not.toHaveBeenCalled();
  });

  it('does NOT create ErrorBankEntry when evaluationStatus is SUBMITTED or score is null', async () => {
    await service.recordAttemptEvaluation({
      attemptId: 'att-1',
      learnerId: 'learner-1',
      lessonVersionId: 'lv-1',
      skills: ['speaking'],
      languageBlockSlugs: ['my-name-is'],
      score: null,
      evaluationStatus: 'SUBMITTED',
    });

    expect(prismaMock.masteryEvent.create).not.toHaveBeenCalled();
    expect(prismaMock.errorBankEntry.create).not.toHaveBeenCalled();
  });
});
