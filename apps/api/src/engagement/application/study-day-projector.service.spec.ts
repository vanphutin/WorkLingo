import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';

import { StudyDayProjectorService } from './study-day-projector.service.js';

describe('StudyDayProjectorService', () => {
  const service = new StudyDayProjectorService();

  it('skips projection when purpose is placement', async () => {
    const tx = {
      learnerProfile: { findUnique: vi.fn() },
      learnerStudyDay: { upsert: vi.fn(), update: vi.fn() },
      learnerStudySession: { createMany: vi.fn() },
      learnerEngagementWeek: { upsert: vi.fn(), update: vi.fn() },
    } as unknown as Prisma.TransactionClient;

    await service.recordCompletion(tx, {
      completedAt: new Date('2026-10-12T10:00:00Z'),
      learnerId: 'learner-1',
      purpose: 'placement',
      sessionId: 'session-1',
    });

    expect(tx.learnerStudyDay.upsert).not.toHaveBeenCalled();
    expect(tx.learnerStudySession.createMany).not.toHaveBeenCalled();
  });

  it('projects an ordinary learning session and increments count when new', async () => {
    const studyDay = { id: 'day-1', learnerId: 'learner-1', dateKey: '2026-10-12' };
    const week = { id: 'week-1', targetDays: 3, status: 'ACTIVE', metAt: null };

    const tx = {
      learnerProfile: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 3 }),
      },
      learnerStudyDay: {
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue({}),
        upsert: vi.fn().mockResolvedValue(studyDay),
      },
      learnerStudySession: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      learnerEngagementWeek: {
        update: vi.fn(),
        upsert: vi.fn().mockResolvedValue(week),
      },
    } as unknown as Prisma.TransactionClient;

    await service.recordCompletion(tx, {
      completedAt: new Date('2026-10-12T10:00:00Z'),
      learnerId: 'learner-1',
      purpose: 'learning',
      sessionId: 'session-1',
    });

    expect(tx.learnerStudyDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ completedSessionCount: 0, dateKey: '2026-10-12' }),
      }),
    );
    expect(tx.learnerStudySession.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ learnerId: 'learner-1', sessionId: 'session-1', studyDayId: 'day-1' })],
      skipDuplicates: true,
    });
    expect(tx.learnerStudyDay.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ completedSessionCount: { increment: 1 } }),
      where: { id: 'day-1' },
    });
  });

  it('does not increment count or touch weekly status on idempotent replay of same session', async () => {
    const studyDay = { id: 'day-1', learnerId: 'learner-1', dateKey: '2026-10-12' };

    const tx = {
      learnerProfile: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 3 }),
      },
      learnerStudyDay: {
        update: vi.fn(),
        upsert: vi.fn().mockResolvedValue(studyDay),
      },
      learnerStudySession: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      learnerEngagementWeek: {
        update: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    await service.recordCompletion(tx, {
      completedAt: new Date('2026-10-12T10:00:00Z'),
      learnerId: 'learner-1',
      purpose: 'learning',
      sessionId: 'session-1',
    });

    expect(tx.learnerStudyDay.update).not.toHaveBeenCalled();
    expect(tx.learnerEngagementWeek.upsert).not.toHaveBeenCalled();
  });
});
