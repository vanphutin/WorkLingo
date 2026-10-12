import { Inject, Injectable } from '@nestjs/common';
import type { EngagementSummaryDto, EngagementWeekStatus } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import {
  calculateConsistency,
  toLocalDateKey,
  toWeekStartKey,
  type ConsistencyWeekInput,
} from '../domain/engagement-week.js';
import {
  compareEvidence,
  type ActivitySkill,
  type RawEvaluatedSample,
} from '../domain/evidence-of-progress.js';

@Injectable()
export class EngagementService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
  ) {}

  async getSummary(learnerId: string, now = new Date()): Promise<EngagementSummaryDto> {
    const profile = await this.database.learnerProfile.findUnique({
      select: { timezone: true, weeklyTargetDays: true },
      where: { userId: learnerId },
    });

    const timezone = profile?.timezone ?? 'Asia/Ho_Chi_Minh';
    const defaultTargetDays = profile?.weeklyTargetDays ?? 3;

    const todayKey = toLocalDateKey(now, timezone);
    const currentWeekStartKey = toWeekStartKey(todayKey);
    const [y, m, d] = currentWeekStartKey.split('-').map(Number);
    const mondayMs = Date.UTC(y!, m! - 1, d!);
    const currentSundayKey = new Date(mondayMs + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const existingCurrentWeek = await this.database.learnerEngagementWeek.findUnique({
      where: {
        learnerId_weekStartKey: {
          learnerId,
          weekStartKey: currentWeekStartKey,
        },
      },
    });

    const currentWeekTargetDays = existingCurrentWeek?.targetDays ?? defaultTargetDays;

    const currentCompletedDays = await this.database.learnerStudyDay.count({
      where: {
        completedSessionCount: { gt: 0 },
        dateKey: {
          gte: currentWeekStartKey,
          lte: currentSundayKey,
        },
        learnerId,
      },
    });

    const currentWeekStatus: EngagementWeekStatus =
      currentCompletedDays >= currentWeekTargetDays ? 'MET' : 'ACTIVE';
    const remainingDays = Math.max(0, currentWeekTargetDays - currentCompletedDays);
    const targetChangeAppliesImmediately = currentCompletedDays === 0;
    const effectiveTargetNextWeek =
      !targetChangeAppliesImmediately && defaultTargetDays !== currentWeekTargetDays
        ? defaultTargetDays
        : null;

    // Past weeks consistency
    const pastWeeks = await this.database.learnerEngagementWeek.findMany({
      orderBy: { weekStartKey: 'asc' },
      where: {
        learnerId,
        weekStartKey: { lt: currentWeekStartKey },
      },
    });

    const pastStudyDays = await this.database.learnerStudyDay.findMany({
      select: { dateKey: true },
      where: {
        completedSessionCount: { gt: 0 },
        dateKey: { lt: currentWeekStartKey },
        learnerId,
      },
    });

    const pastDaysCountByWeek = new Map<string, number>();
    for (const day of pastStudyDays) {
      const wk = toWeekStartKey(day.dateKey);
      pastDaysCountByWeek.set(wk, (pastDaysCountByWeek.get(wk) ?? 0) + 1);
    }

    const consistencyPastWeeks: ConsistencyWeekInput[] = pastWeeks.map((pw) => ({
      completedDays: pastDaysCountByWeek.get(pw.weekStartKey) ?? 0,
      status: pw.status,
      targetDays: pw.targetDays,
      weekStartKey: pw.weekStartKey,
    }));

    const consistency = calculateConsistency({
      currentWeek: {
        completedDays: currentCompletedDays,
        targetDays: currentWeekTargetDays,
        weekStartKey: currentWeekStartKey,
      },
      pastWeeks: consistencyPastWeeks,
    });

    // Evidence of Progress (28-day windows)
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const fiftySixDaysAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgoKey = toLocalDateKey(twentyEightDaysAgo, timezone);

    const [completedSessions, distinctStudyDays, completedReviewsCount, attempts] = await Promise.all([
      this.database.learnerStudySession.count({
        where: {
          completedAt: { gte: twentyEightDaysAgo, lte: now },
          learnerId,
        },
      }),
      this.database.learnerStudyDay.count({
        where: {
          completedSessionCount: { gt: 0 },
          dateKey: { gte: twentyEightDaysAgoKey, lte: todayKey },
          learnerId,
        },
      }),
      this.database.masteryEvent.count({
        where: {
          createdAt: { gte: twentyEightDaysAgo, lte: now },
          eventType: { in: ['CORRECT_RECALL', 'ASSISTED_RECALL'] },
          learnerId,
        },
      }),
      this.database.activityAttempt.findMany({
        select: {
          activity: {
            select: {
              activityType: true,
              languageBlockReferences: true,
            },
          },
          score: true,
          session: {
            select: {
              mission: {
                select: {
                  purpose: true,
                },
              },
            },
          },
          updatedAt: true,
        },
        where: {
          evaluationStatus: 'EVALUATED',
          learnerId,
          score: { not: null },
          updatedAt: { gte: fiftySixDaysAgo, lte: now },
        },
      }),
    ]);

    const samples: RawEvaluatedSample[] = attempts.map((a) => ({
      evaluatedAt: a.updatedAt,
      languageBlockId: a.activity.languageBlockReferences[0] ?? null,
      purpose: a.session.mission.purpose === 'PLACEMENT' ? 'placement' : 'learning',
      score: a.score!,
      skill: a.activity.activityType as ActivitySkill,
    }));

    const evidenceOfProgress = compareEvidence({
      completedReviewsCount,
      completedSessions,
      distinctStudyDays,
      now,
      samples,
    });

    return {
      consistency,
      currentWeek: {
        completedDays: currentCompletedDays,
        effectiveTargetNextWeek,
        remainingDays,
        status: currentWeekStatus,
        targetChangeAppliesImmediately,
        targetDays: currentWeekTargetDays,
        timezone,
        weekStartKey: currentWeekStartKey,
      },
      evidenceOfProgress,
    };
  }

  async updateWeeklyTarget(
    learnerId: string,
    targetDays: number,
    now = new Date(),
  ): Promise<EngagementSummaryDto> {
    await this.database.$transaction(async (tx) => {
      const profile = await tx.learnerProfile.findUniqueOrThrow({
        select: { timezone: true },
        where: { userId: learnerId },
      });
      const timezone = profile.timezone;
      const todayKey = toLocalDateKey(now, timezone);
      const currentWeekStartKey = toWeekStartKey(todayKey);
      const [y, m, d] = currentWeekStartKey.split('-').map(Number);
      const mondayMs = Date.UTC(y!, m! - 1, d!);
      const currentSundayKey = new Date(mondayMs + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const completedDays = await tx.learnerStudyDay.count({
        where: {
          completedSessionCount: { gt: 0 },
          dateKey: {
            gte: currentWeekStartKey,
            lte: currentSundayKey,
          },
          learnerId,
        },
      });

      await tx.learnerProfile.update({
        data: { weeklyTargetDays: targetDays },
        where: { userId: learnerId },
      });

      if (completedDays === 0) {
        await tx.learnerEngagementWeek.upsert({
          create: {
            learnerId,
            status: 'ACTIVE',
            targetDays,
            timezone,
            weekStartKey: currentWeekStartKey,
          },
          update: {
            targetDays,
          },
          where: {
            learnerId_weekStartKey: {
              learnerId,
              weekStartKey: currentWeekStartKey,
            },
          },
        });
      }
    });

    return this.getSummary(learnerId, now);
  }
}
