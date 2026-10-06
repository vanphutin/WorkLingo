import { Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { Clock } from '../domain/clock.port';
import { SystemClock } from '../domain/clock.port';
import { MasteryCalculator } from '../domain/mastery-calculator';
import { ReviewScheduler } from '../domain/review-scheduler';
import {
  summarizeMemoryHealth,
  type MemoryHealthSummary,
} from '../domain/memory-health-calculator.js';
import type {
  ActivityType,
  MasteryEventType,
  ReviewCandidate,
  ReviewSelectionOptions,
  ScheduledReviewItem,
} from '../domain/mastery.types';

export interface RecordAttemptEvaluationInput {
  attemptId: string;
  learnerId: string;
  lessonVersionId: string;
  skills: ActivityType[];
  languageBlockSlugs: string[];
  score: number | null;
  evaluationStatus: string;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}

export interface ErrorBankQueryOptions {
  skill?: ActivityType;
  page?: number;
  limit?: number;
}

export interface ErrorBankItem {
  id: string;
  languageBlockId: string;
  languageBlockSlug: string;
  canonicalForm: string;
  skill: ActivityType;
  errorType: string;
  evidenceGranularity: string;
  contextKey: string;
  activityId: string;
  activitySlug: string;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  lessonVersionId: string;
}

export interface PaginatedErrorBankResult {
  items: ErrorBankItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MasteryEventResult {
  id: string;
  languageBlockId: string;
  skill: ActivityType;
  eventType: MasteryEventType;
  score: number;
}

@Injectable()
export class MasteryService {
  private readonly clock: Clock;
  private readonly calculator: MasteryCalculator;
  private readonly scheduler: ReviewScheduler;

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Optional() @Inject('CLOCK') clock?: Clock,
  ) {
    this.clock = clock ?? new SystemClock();
    this.calculator = new MasteryCalculator(this.clock);
    this.scheduler = new ReviewScheduler(this.clock);
  }

  async recordAttemptEvaluation(
    input: RecordAttemptEvaluationInput,
  ): Promise<MasteryEventResult[]> {
    if (
      input.evaluationStatus !== 'EVALUATED' ||
      input.score === null ||
      input.languageBlockSlugs.length === 0 ||
      input.skills.length === 0
    ) {
      return [];
    }

    if (input.tx) {
      return this.recordInTransaction(input, input.tx);
    }
    return this.database.$transaction(
      (transaction) => this.recordInTransaction(input, transaction),
      { timeout: 15_000 },
    );
  }

  private async recordInTransaction(
    input: RecordAttemptEvaluationInput,
    client: Prisma.TransactionClient,
  ): Promise<MasteryEventResult[]> {
    const numericScore = input.score;
    if (numericScore === null) return [];

    const languageBlocks = await client.languageBlock.findMany({
      where: { slug: { in: input.languageBlockSlugs } },
    });

    if (languageBlocks.length === 0) {
      return [];
    }

    const results: MasteryEventResult[] = [];

    const isIncorrect = numericScore < 0.7;
    const errorContext = isIncorrect
      ? await client.activityAttempt.findUnique({
          where: { id: input.attemptId },
          select: {
            learnerId: true,
            evaluationStatus: true,
            score: true,
            activity: {
              select: {
                id: true,
                slug: true,
                lessonVersionId: true,
                lessonVersion: { select: { lessonId: true } },
              },
            },
          },
        })
      : null;
    if (
      isIncorrect &&
      (!errorContext ||
        errorContext.learnerId !== input.learnerId ||
        errorContext.evaluationStatus !== 'EVALUATED' ||
        errorContext.score !== numericScore ||
        errorContext.activity.lessonVersionId !== input.lessonVersionId)
    ) {
      throw new Error('Evaluated attempt context does not match mastery evidence');
    }

    const skills = [...new Set(input.skills)].sort();
    for (const lb of languageBlocks.sort((a, b) => a.id.localeCompare(b.id))) {
      for (const skill of skills) {
        await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`mastery:${input.learnerId}:${lb.id}:${skill}`}))`;

        const existingEvent = await client.masteryEvent.findUnique({
          where: {
            attemptId_languageBlockId_skill: {
              attemptId: input.attemptId,
              languageBlockId: lb.id,
              skill,
            },
          },
        });

        if (existingEvent) {
          continue;
        }

        const eventType: MasteryEventType =
          numericScore >= 0.7 ? 'CORRECT_RECALL' : 'INCORRECT_ATTEMPT';

        // Get current mastery record
        const currentRecord = await client.masteryRecord.findUnique({
          where: {
            learnerId_languageBlockId_skill: {
              learnerId: input.learnerId,
              languageBlockId: lb.id,
              skill,
            },
          },
        });

        const calculation = this.calculator.calculateNextState({
          currentRecord: currentRecord
            ? {
                confidence: currentRecord.confidence,
                intervalDays: currentRecord.intervalDays,
                score: currentRecord.score,
                state: currentRecord.state,
              }
            : null,
          eventType,
          score: numericScore,
        });

        const now = this.clock.now();

        // Upsert mastery record
        const masteryRecord = await client.masteryRecord.upsert({
          where: {
            learnerId_languageBlockId_skill: {
              learnerId: input.learnerId,
              languageBlockId: lb.id,
              skill,
            },
          },
          create: {
            confidence: calculation.confidence,
            intervalDays: calculation.intervalDays,
            languageBlockId: lb.id,
            lastEvidenceAt: now,
            lastLessonVersionId: input.lessonVersionId,
            learnerId: input.learnerId,
            nextReviewAt: calculation.nextReviewAt,
            score: calculation.score,
            skill,
            state: calculation.state,
          },
          update: {
            confidence: calculation.confidence,
            intervalDays: calculation.intervalDays,
            lastEvidenceAt: now,
            lastLessonVersionId: input.lessonVersionId,
            nextReviewAt: calculation.nextReviewAt,
            score: calculation.score,
            state: calculation.state,
          },
        });

        const event = await client.masteryEvent.create({
          data: {
            attemptId: input.attemptId,
            eventType,
            createdAt: now,
            languageBlockId: lb.id,
            learnerId: input.learnerId,
            lessonVersionId: input.lessonVersionId,
            masteryRecordId: masteryRecord.id,
            metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
            score: numericScore,
            skill,
          },
        });

        if (eventType === 'INCORRECT_ATTEMPT' && errorContext) {
          await client.errorBankEntry.create({
            data: {
              learnerId: input.learnerId,
              masteryEventId: event.id,
              languageBlockId: lb.id,
              skill,
              errorType: 'ACTIVITY_INCORRECT',
              evidenceGranularity: 'ACTIVITY',
              lessonVersionId: input.lessonVersionId,
              activityId: errorContext.activity.id,
              activitySlug: errorContext.activity.slug,
              contextKey: `${errorContext.activity.lessonVersion.lessonId}:${errorContext.activity.slug}`,
              occurredAt: event.createdAt,
            },
          });
        }

        results.push({
          eventType: event.eventType,
          id: event.id,
          languageBlockId: event.languageBlockId,
          score: event.score,
          skill: event.skill,
        });
      }
    }

    return results;
  }

  async getReviewQueue(
    learnerId: string,
    options: ReviewSelectionOptions = {},
  ): Promise<ScheduledReviewItem[]> {
    const records = await this.database.masteryRecord.findMany({
      where: {
        learnerId,
        ...(options.skill ? { skill: options.skill } : {}),
      },
    });

    const candidates: ReviewCandidate[] = records.map((r) => ({
      confidence: r.confidence,
      id: r.id,
      languageBlockId: r.languageBlockId,
      nextReviewAt: r.nextReviewAt,
      score: r.score,
      skill: r.skill,
      state: r.state,
    }));

    return this.scheduler.selectReviewItems(candidates, options);
  }

  async getMasteryRecords(learnerId: string, skill?: ActivityType) {
    return this.database.masteryRecord.findMany({
      where: {
        learnerId,
        ...(skill ? { skill } : {}),
      },
      include: {
        languageBlock: true,
      },
      orderBy: [{ skill: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async getErrorBank(
    learnerId: string,
    options: ErrorBankQueryOptions = {},
  ): Promise<PaginatedErrorBankResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, Math.min(100, options.limit ?? 20));
    const offset = (page - 1) * limit;

    const totalCountResult = await this.database.$queryRaw<Array<{ count: bigint | number }>>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT 1
        FROM "ErrorBankEntry"
        WHERE "learnerId" = ${learnerId}::uuid
          ${options.skill ? Prisma.sql`AND "skill" = ${options.skill}::"ActivityType"` : Prisma.empty}
        GROUP BY "learnerId", "languageBlockId", "skill", "errorType", "evidenceGranularity", "contextKey"
      ) t;
    `;
    const total = Number(totalCountResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const rows = await this.database.$queryRaw<
      Array<{
        id: string;
        languageBlockId: string;
        languageBlockSlug: string;
        canonicalForm: string;
        skill: ActivityType;
        errorType: string;
        evidenceGranularity: string;
        contextKey: string;
        activityId: string;
        activitySlug: string;
        occurrenceCount: number;
        firstOccurredAt: Date;
        lastOccurredAt: Date;
        lessonVersionId: string;
      }>
    >`
      SELECT
        latest."id",
        agg."languageBlockId",
        lb."slug" AS "languageBlockSlug",
        lb."canonicalForm" AS "canonicalForm",
        agg."skill",
        agg."errorType",
        agg."evidenceGranularity",
        agg."contextKey",
        latest."activityId",
        latest."activitySlug",
        agg."occurrenceCount",
        agg."firstOccurredAt",
        agg."lastOccurredAt",
        latest."lessonVersionId"
      FROM (
        SELECT
          "learnerId",
          "languageBlockId",
          "skill",
          "errorType",
          "evidenceGranularity",
          "contextKey",
          COUNT(*)::int AS "occurrenceCount",
          MIN("occurredAt") AS "firstOccurredAt",
          MAX("occurredAt") AS "lastOccurredAt"
        FROM "ErrorBankEntry"
        WHERE "learnerId" = ${learnerId}::uuid
          ${options.skill ? Prisma.sql`AND "skill" = ${options.skill}::"ActivityType"` : Prisma.empty}
        GROUP BY "learnerId", "languageBlockId", "skill", "errorType", "evidenceGranularity", "contextKey"
      ) agg
      JOIN LATERAL (
        SELECT e."id", e."activityId", e."activitySlug", e."lessonVersionId"
        FROM "ErrorBankEntry" e
        WHERE e."learnerId" = agg."learnerId"
          AND e."languageBlockId" = agg."languageBlockId"
          AND e."skill" = agg."skill"
          AND e."errorType" = agg."errorType"
          AND e."contextKey" = agg."contextKey"
        ORDER BY e."occurredAt" DESC, e."id" ASC
        LIMIT 1
      ) latest ON true
      JOIN "LanguageBlock" lb ON lb."id" = agg."languageBlockId"
      ORDER BY agg."lastOccurredAt" DESC, latest."id" ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return {
      items: rows.map((r) => ({
        id: r.id,
        languageBlockId: r.languageBlockId,
        languageBlockSlug: r.languageBlockSlug,
        canonicalForm: r.canonicalForm,
        skill: r.skill,
        errorType: r.errorType,
        evidenceGranularity: r.evidenceGranularity,
        contextKey: r.contextKey,
        activityId: r.activityId,
        activitySlug: r.activitySlug,
        occurrenceCount: Number(r.occurrenceCount),
        firstOccurredAt: r.firstOccurredAt,
        lastOccurredAt: r.lastOccurredAt,
        lessonVersionId: r.lessonVersionId,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getMemoryHealth(learnerId: string): Promise<MemoryHealthSummary> {
    const records = await this.database.masteryRecord.findMany({
      where: { learnerId },
    });
    return summarizeMemoryHealth(records, this.clock.now());
  }

  async backfillErrorBank(learnerId?: string): Promise<{ backfilledCount: number }> {
    const query = learnerId
      ? Prisma.sql`
          INSERT INTO "ErrorBankEntry" (
              "id", "learnerId", "masteryEventId", "languageBlockId", "skill",
              "errorType", "evidenceGranularity", "lessonVersionId", "activityId",
              "activitySlug", "contextKey", "occurredAt", "createdAt", "updatedAt"
          )
          SELECT
              gen_random_uuid(), me."learnerId", me."id", me."languageBlockId", me."skill",
              'ACTIVITY_INCORRECT'::"ErrorType", 'ACTIVITY'::"EvidenceGranularity",
              me."lessonVersionId", aa."activityId", a."slug",
              CONCAT(lv."lessonId", ':', a."slug"), me."createdAt",
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM "MasteryEvent" me
          JOIN "ActivityAttempt" aa ON aa."id" = me."attemptId"
          JOIN "Activity" a ON a."id" = aa."activityId"
          JOIN "LessonVersion" lv ON lv."id" = me."lessonVersionId"
          WHERE me."eventType" = 'INCORRECT_ATTEMPT'
            AND me."learnerId" = ${learnerId}::uuid
            AND NOT EXISTS (
              SELECT 1 FROM "ErrorBankEntry" ebe WHERE ebe."masteryEventId" = me."id"
            )
          ON CONFLICT ("masteryEventId") DO NOTHING;
        `
      : Prisma.sql`
          INSERT INTO "ErrorBankEntry" (
              "id", "learnerId", "masteryEventId", "languageBlockId", "skill",
              "errorType", "evidenceGranularity", "lessonVersionId", "activityId",
              "activitySlug", "contextKey", "occurredAt", "createdAt", "updatedAt"
          )
          SELECT
              gen_random_uuid(), me."learnerId", me."id", me."languageBlockId", me."skill",
              'ACTIVITY_INCORRECT'::"ErrorType", 'ACTIVITY'::"EvidenceGranularity",
              me."lessonVersionId", aa."activityId", a."slug",
              CONCAT(lv."lessonId", ':', a."slug"), me."createdAt",
              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM "MasteryEvent" me
          JOIN "ActivityAttempt" aa ON aa."id" = me."attemptId"
          JOIN "Activity" a ON a."id" = aa."activityId"
          JOIN "LessonVersion" lv ON lv."id" = me."lessonVersionId"
          WHERE me."eventType" = 'INCORRECT_ATTEMPT'
            AND NOT EXISTS (
              SELECT 1 FROM "ErrorBankEntry" ebe WHERE ebe."masteryEventId" = me."id"
            )
          ON CONFLICT ("masteryEventId") DO NOTHING;
        `;
    const result = await this.database.$executeRaw(query);
    return { backfilledCount: result };
  }
}
