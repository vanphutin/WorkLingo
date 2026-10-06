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
});
