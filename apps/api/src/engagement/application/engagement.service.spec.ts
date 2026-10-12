import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import type { PrismaService } from '../../common/database/prisma.service.js';
import { EngagementService } from './engagement.service.js';

describe('EngagementService', () => {
  const learnerId = '00000000-0000-4000-8000-000000000001';

  it('calculates default engagement summary for an empty learner', async () => {
    const database = {
      learnerProfile: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 3 }),
      },
      learnerEngagementWeek: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          id: 'w-1',
          learnerId,
          metAt: null,
          status: 'ACTIVE',
          targetDays: 3,
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-12',
        }),
      },
      learnerStudyDay: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      learnerStudySession: {
        count: vi.fn().mockResolvedValue(0),
      },
      activityAttempt: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      masteryEvent: {
        count: vi.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaClient;

    const service = new EngagementService(database as unknown as PrismaService);
    const summary = await service.getSummary(learnerId, new Date('2026-10-12T10:00:00Z'));

    expect(summary.currentWeek).toMatchObject({
      completedDays: 0,
      effectiveTargetNextWeek: null,
      remainingDays: 3,
      status: 'ACTIVE',
      targetChangeAppliesImmediately: true,
      targetDays: 3,
      timezone: 'Asia/Ho_Chi_Minh',
      weekStartKey: '2026-10-12',
    });
    expect(summary.consistency).toEqual({
      bestStreakWeeks: 0,
      currentStreakWeeks: 0,
    });
    expect(summary.evidenceOfProgress.skills.reading.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('applies target update immediately when current week has no study days', async () => {
    const database = {
      $transaction: vi.fn(async (cb) => cb(database)),
      learnerProfile: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 4 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 3 }),
        update: vi.fn().mockResolvedValue({}),
      },
      learnerStudyDay: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      learnerStudySession: { count: vi.fn().mockResolvedValue(0) },
      activityAttempt: { findMany: vi.fn().mockResolvedValue([]) },
      masteryEvent: { count: vi.fn().mockResolvedValue(0) },
      learnerEngagementWeek: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          id: 'w-1',
          learnerId,
          metAt: null,
          status: 'ACTIVE',
          targetDays: 4,
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-12',
        }),
      },
    } as unknown as PrismaClient;

    const service = new EngagementService(database as unknown as PrismaService);
    const summary = await service.updateWeeklyTarget(learnerId, 4, new Date('2026-10-12T10:00:00Z'));

    expect(database.learnerProfile.update).toHaveBeenCalledWith({
      data: { weeklyTargetDays: 4 },
      where: { userId: learnerId },
    });
    expect(summary.currentWeek.targetDays).toBe(4);
    expect(summary.currentWeek.targetChangeAppliesImmediately).toBe(true);
    expect(summary.currentWeek.effectiveTargetNextWeek).toBeNull();
  });

  it('keeps current week target unchanged and sets effectiveTargetNextWeek when learner already studied', async () => {
    const database = {
      $transaction: vi.fn(async (cb) => cb(database)),
      learnerProfile: {
        findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 2 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: 'Asia/Ho_Chi_Minh', weeklyTargetDays: 3 }),
        update: vi.fn().mockResolvedValue({}),
      },
      learnerStudyDay: {
        count: vi.fn().mockResolvedValue(1), // already studied 1 day!
        findMany: vi.fn().mockResolvedValue([{ completedSessionCount: 1, dateKey: '2026-10-12' }]),
      },
      learnerStudySession: { count: vi.fn().mockResolvedValue(1) },
      activityAttempt: { findMany: vi.fn().mockResolvedValue([]) },
      masteryEvent: { count: vi.fn().mockResolvedValue(0) },
      learnerEngagementWeek: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'w-1',
          learnerId,
          metAt: null,
          status: 'ACTIVE',
          targetDays: 3,
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-12',
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'w-1',
          learnerId,
          metAt: null,
          status: 'ACTIVE',
          targetDays: 3, // stays 3!
          timezone: 'Asia/Ho_Chi_Minh',
          weekStartKey: '2026-10-12',
        }),
      },
    } as unknown as PrismaClient;

    const service = new EngagementService(database as unknown as PrismaService);
    const summary = await service.updateWeeklyTarget(learnerId, 2, new Date('2026-10-12T10:00:00Z'));

    expect(summary.currentWeek.targetDays).toBe(3); // unchanged
    expect(summary.currentWeek.targetChangeAppliesImmediately).toBe(false);
    expect(summary.currentWeek.effectiveTargetNextWeek).toBe(2);
  });
});
