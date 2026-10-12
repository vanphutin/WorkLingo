import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  adminPilotAnalyticsQuerySchema,
  adminPilotAnalyticsResponseSchema,
  pilotMetricDimensionsSchema,
  type AdminPilotAnalyticsQuery,
  type AdminPilotAnalyticsResponse,
  type PilotMetricEventType,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';

export const PILOT_METRIC_DEFINITIONS: ReadonlyArray<{
  description: string;
  eventType: PilotMetricEventType;
}> = [
  { eventType: 'REGISTRATION_COMPLETED', description: 'A learner account was created successfully.' },
  { eventType: 'ONBOARDING_CONFIRMED', description: 'A learner confirmed a self-placement or test-placement onboarding result.' },
  { eventType: 'LEARNING_SESSION_STARTED', description: 'A normal learning session moved into active study.' },
  { eventType: 'LEARNING_SESSION_COMPLETED', description: 'A normal learning session completed all planned activities.' },
  { eventType: 'LEARNING_SESSION_RESUMED', description: 'A paused normal learning session resumed.' },
  { eventType: 'PLACEMENT_CONFIRMED', description: 'A placement recommendation was confirmed.' },
  { eventType: 'EVALUATION_TERMINAL', description: 'A Teacher AI evaluation reached a completed or failed terminal outcome.' },
  { eventType: 'CONTENT_IMPORT_VALIDATED', description: 'A content import passed structural and semantic validation.' },
  { eventType: 'CONTENT_PUBLISHED', description: 'An immutable lesson version was published.' },
  { eventType: 'ENGAGEMENT_TARGET_MET', description: 'A learner met the stored weekly distinct-study-day target.' },
] as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function retentionPoint(
  learners: readonly { createdAt: Date; studyDays: readonly { dateKey: string }[] }[],
  now: Date,
  fromDay: number,
  toDay: number,
): { cohortSize: number; retainedCount: number; retentionRate: number } {
  const matured = learners.filter((learner) =>
    startOfUtcDay(learner.createdAt) + toDay * DAY_MS <= now.getTime(),
  );
  const retainedCount = matured.filter((learner) => {
    const registered = startOfUtcDay(learner.createdAt);
    return learner.studyDays.some((day) => {
      const studied = Date.parse(`${day.dateKey}T00:00:00.000Z`);
      const ageDays = Math.floor((studied - registered) / DAY_MS);
      return ageDays >= fromDay && ageDays <= toDay;
    });
  }).length;
  return {
    cohortSize: matured.length,
    retainedCount,
    retentionRate: matured.length === 0 ? 0 : retainedCount / matured.length,
  };
}

@Injectable()
export class PilotRetentionService {
  constructor(
    @Inject(PrismaService)
    private readonly database: PrismaService,
  ) {}

  async summarize(
    input: AdminPilotAnalyticsQuery,
    now = new Date(),
  ): Promise<AdminPilotAnalyticsResponse> {
    const parsed = adminPilotAnalyticsQuerySchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_ANALYTICS_RANGE',
        message: parsed.error.issues.map((issue) => issue.message).join('; '),
      });
    }
    const fromDate = new Date(`${parsed.data.from}T00:00:00.000Z`);
    const toExclusive = new Date(Date.parse(`${parsed.data.to}T00:00:00.000Z`) + DAY_MS);
    const maxStudyDateKey = new Date(toExclusive.getTime() + 34 * DAY_MS)
      .toISOString().slice(0, 10);

    const [rows, learners] = await Promise.all([
      this.database.pilotMetricDaily.findMany({
        orderBy: [{ dateKey: 'asc' }, { eventType: 'asc' }, { dimensionKey: 'asc' }],
        select: { count: true, dateKey: true, dimensions: true, eventType: true },
        where: { dateKey: { gte: parsed.data.from, lte: parsed.data.to } },
      }),
      this.database.user.findMany({
        select: {
          createdAt: true,
          id: true,
          studyDays: {
            select: { dateKey: true },
            where: { dateKey: { gte: parsed.data.from, lte: maxStudyDateKey } },
          },
        },
        where: {
          createdAt: { gte: fromDate, lt: toExclusive },
          role: 'LEARNER',
        },
      }),
    ]);

    const response = {
      definitions: [...PILOT_METRIC_DEFINITIONS],
      from: parsed.data.from,
      metrics: rows.map((row) => ({
        count: row.count,
        dateKey: row.dateKey,
        dimensions: pilotMetricDimensionsSchema.parse(row.dimensions),
        eventType: row.eventType,
      })),
      retention: {
        week1: retentionPoint(learners, now, 7, 13),
        week4: retentionPoint(learners, now, 28, 34),
      },
      to: parsed.data.to,
    };

    return adminPilotAnalyticsResponseSchema.parse(response);
  }
}
