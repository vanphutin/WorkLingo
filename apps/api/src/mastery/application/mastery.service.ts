import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { Clock } from '../domain/clock.port';
import { SystemClock } from '../domain/clock.port';
import { MasteryCalculator } from '../domain/mastery-calculator';
import { ReviewScheduler } from '../domain/review-scheduler';
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
            languageBlockId: lb.id,
            learnerId: input.learnerId,
            lessonVersionId: input.lessonVersionId,
            masteryRecordId: masteryRecord.id,
            metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
            score: numericScore,
            skill,
          },
        });

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
}
