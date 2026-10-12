import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { toLocalDateKey, toWeekStartKey } from '../domain/engagement-week.js';

export interface RecordCompletionInput {
  readonly completedAt: Date;
  readonly learnerId: string;
  readonly purpose: 'learning' | 'placement';
  readonly sessionId: string;
  readonly timezone?: string;
}

@Injectable()
export class StudyDayProjectorService {
  async recordCompletion(
    tx: Prisma.TransactionClient,
    input: RecordCompletionInput,
  ): Promise<void> {
    if (input.purpose !== 'learning') {
      return;
    }

    const profile = await tx.learnerProfile.findUnique({
      select: { timezone: true, weeklyTargetDays: true },
      where: { userId: input.learnerId },
    });

    const timezone = input.timezone ?? profile?.timezone ?? 'Asia/Ho_Chi_Minh';
    const defaultTargetDays = profile?.weeklyTargetDays ?? 3;

    const dateKey = toLocalDateKey(input.completedAt, timezone);
    const weekStartKey = toWeekStartKey(dateKey);

    const studyDay = await tx.learnerStudyDay.upsert({
      create: {
        completedSessionCount: 0,
        dateKey,
        firstCompletedAt: input.completedAt,
        lastCompletedAt: input.completedAt,
        learnerId: input.learnerId,
        timezone,
      },
      update: {},
      where: {
        learnerId_dateKey: {
          dateKey,
          learnerId: input.learnerId,
        },
      },
    });

    const sessionInsert = await tx.learnerStudySession.createMany({
      data: [
        {
          completedAt: input.completedAt,
          learnerId: input.learnerId,
          sessionId: input.sessionId,
          studyDayId: studyDay.id,
        },
      ],
      skipDuplicates: true,
    });

    if (sessionInsert.count === 0) {
      return;
    }

    await tx.learnerStudyDay.update({
      data: {
        completedSessionCount: { increment: 1 },
        lastCompletedAt: input.completedAt,
      },
      where: { id: studyDay.id },
    });

    const week = await tx.learnerEngagementWeek.upsert({
      create: {
        learnerId: input.learnerId,
        status: 'ACTIVE',
        targetDays: defaultTargetDays,
        timezone,
        weekStartKey,
      },
      update: {},
      where: {
        learnerId_weekStartKey: {
          learnerId: input.learnerId,
          weekStartKey,
        },
      },
    });

    const [y, m, d] = weekStartKey.split('-').map(Number);
    const mondayMs = Date.UTC(y!, m! - 1, d!);
    const sundayKey = new Date(mondayMs + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const distinctDaysCount = await tx.learnerStudyDay.count({
      where: {
        completedSessionCount: { gt: 0 },
        dateKey: {
          gte: weekStartKey,
          lte: sundayKey,
        },
        learnerId: input.learnerId,
      },
    });

    if (distinctDaysCount >= week.targetDays && week.status !== 'MET') {
      await tx.learnerEngagementWeek.update({
        data: {
          metAt: week.metAt ?? input.completedAt,
          status: 'MET',
        },
        where: { id: week.id },
      });
    }
  }
}
