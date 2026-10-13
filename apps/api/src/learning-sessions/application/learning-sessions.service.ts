import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type Activity, type ActivityAttempt } from '@prisma/client';
import {
  sessionDurationSchema,
  sessionPlanSchema,
  supportedSessionDurations,
  type SessionPlan,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { CurriculumEligibilityService } from '../../curriculum-foundation/application/curriculum-eligibility.service.js';
import { CurriculumProgressService } from '../../curriculum-foundation/application/curriculum-progress.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import {
  activitySchema,
  lessonSnapshotSchema,
  type CurriculumActivity,
} from '../../curriculum/domain/curriculum.types.js';
import {
  InsufficientContentForDurationError,
  UnsupportedSessionDurationError,
} from '../domain/session-plan.types.js';
import { computeAvailableDurations } from '../domain/session-planner.js';
import { selectMissionForReview } from '../domain/context-transfer.js';
import {
  learningSessionInclude,
  type LearningSessionRecord,
  SessionCreationService,
  toLearningSessionDto,
} from './session-creation.service.js';
import { StudyDayProjectorService } from '../../engagement/application/study-day-projector.service.js';
import { PilotMetricsService } from '../../analytics/application/pilot-metrics.service.js';
import type {
  ActivityAttemptDto,
  LearnerActivityDto,
  LearningSessionDto,
  SessionAvailabilityDto,
  SubmitAttemptInput,
} from './learning-session.types.js';

interface Evaluation {
  readonly advance: boolean;
  readonly evaluationStatus: 'SUBMITTED' | 'QUEUED' | 'EVALUATED';
  readonly feedback: string;
  readonly normalizedResponse: Prisma.InputJsonValue;
  readonly score: number | null;
}

export interface CurrentActivitySubmission {
  readonly activityId: string;
  readonly activityIndex: number;
  readonly activityIds: readonly string[];
  readonly lessonVersionId: string;
  readonly plan: SessionPlan;
  readonly purpose: 'learning' | 'placement';
  readonly sessionId: string;
}

@Injectable()
export class LearningSessionsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(CurriculumService) private readonly curriculum: CurriculumService,
    @Inject(MasteryService) private readonly mastery: MasteryService,
    @Inject(SessionCreationService) private readonly sessionCreation: SessionCreationService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
    @Inject(CurriculumEligibilityService) private readonly curriculumEligibility: CurriculumEligibilityService,
    @Inject(CurriculumProgressService) private readonly curriculumProgress: CurriculumProgressService,
    @Optional() @Inject(JobDispatcher) private readonly jobs?: JobDispatcher,
    @Optional() @Inject(StudyDayProjectorService) private readonly studyDayProjector?: StudyDayProjectorService,
    @Optional() @Inject(PilotMetricsService) private readonly pilotMetrics?: PilotMetricsService,
  ) {}

  private async selectCurriculum(learnerId: string, transaction: Prisma.TransactionClient) {
    const context = await this.programContext.resolve(learnerId, transaction);
    const [missions, reviewQueue, completed] = await Promise.all([
      this.curriculum.getPublishedMissionsForLevel(context.levelCode, 'learning', transaction, context.programId),
      this.mastery.getReviewQueue(learnerId),
      transaction.learningSession.findMany({
        where: { learnerId, status: 'COMPLETED', mission: { purpose: 'LEARNING', level: { path: { programId: context.programId } } } },
        select: { missionId: true },
      }),
    ]);
    if (!missions.length) throw new NotFoundException('No published mission for this level');
    const blockIds = new Set(missions.flatMap((mission) => mission.lessonVersion.wordBanks.flatMap((bank) => bank.languageBlocks.map((block) => block.id))));
    const scopedReview = reviewQueue.filter((item) => blockIds.has(item.languageBlockId));
    const selected = selectMissionForReview(missions, scopedReview, completed.map((s) => s.missionId));
    const eligibility = await this.curriculumEligibility.resolve(learnerId, selected.id, transaction);
    if (!eligibility.available) {
      throw new UnprocessableEntityException({
        code: 'CURRICULUM_UNAVAILABLE',
        message: 'The selected curriculum is not currently available',
        reasons: eligibility.reasons,
        statusCode: 422,
      });
    }
    const mission = eligibility.revisionId
      ? await this.curriculum.getPublishedMissionForRevision(eligibility.revisionId, transaction)
      : selected;
    return { curriculumRevisionId: eligibility.revisionId, mission, reviewQueue: scopedReview };
  }

  async getAvailability(learnerId: string): Promise<SessionAvailabilityDto> {
    const { mission } = await this.database.$transaction((tx) => this.selectCurriculum(learnerId, tx), { isolationLevel: 'RepeatableRead' });
    const availableDurations = computeAvailableDurations(mission);
    return {
      mission: {
        id: mission.id,
        title: mission.title,
      },
      lessonVersionId: mission.lessonVersion.id,
      supportedDurations: [...supportedSessionDurations],
      availableDurations: [...availableDurations],
      defaultDurationMinutes: 60,
    };
  }

  async createSession(
    learnerId: string,
    durationMinutes: number,
    clientSessionId: string,
  ): Promise<LearningSessionDto> {
    if (!sessionDurationSchema.safeParse(durationMinutes).success) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SESSION_DURATION',
        message: 'Session duration must be 45, 60, 90, 120, or 150 minutes',
        statusCode: 422,
      });
    }
    await this.requireCompletedOnboarding(learnerId);
    const existing = await this.database.learningSession.findUnique({
      where: { learnerId_clientSessionId: { learnerId, clientSessionId } },
      include: learningSessionInclude,
    });
    if (existing) return this.toSessionDto(existing);

    try {
      return await this.database.$transaction(async (transaction) => {
        await transaction.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId" = ${learnerId}::uuid FOR UPDATE`;
        const { curriculumRevisionId, mission, reviewQueue } = await this.selectCurriculum(learnerId, transaction);
        return this.sessionCreation.create(transaction, {
          clientSessionId, curriculumRevisionId, learnerId, mission, durationMinutes, reviewItems: reviewQueue,
        });
      }, { timeout: 15_000 });
    } catch (error) {
      if (error instanceof InsufficientContentForDurationError) {
        throw new UnprocessableEntityException({
          availableDurations: error.availableDurations,
          code: error.code,
          message: error.message,
          statusCode: 422,
        });
      }
      if (error instanceof UnsupportedSessionDurationError) {
        throw new UnprocessableEntityException({
          code: 'INVALID_SESSION_DURATION',
          message: error.message,
          statusCode: 422,
        });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.database.learningSession.findUnique({
          where: { learnerId_clientSessionId: { learnerId, clientSessionId } },
          include: learningSessionInclude,
        });
        if (duplicate) return this.toSessionDto(duplicate);
      }
      throw error;
    }
  }

  async getSession(learnerId: string, id: string): Promise<LearningSessionDto> {
    return this.toSessionDto(await this.findOwnedSession(learnerId, id));
  }

  async getActivity(learnerId: string, sessionId: string, activityId: string): Promise<LearnerActivityDto> {
    const session = await this.findOwnedSession(learnerId, sessionId);
    const plan = sessionPlanSchema.parse(session.planSnapshot);
    if (!plan.blocks.some((block) => block.activityIds.includes(activityId))) {
      throw new NotFoundException('Activity not found in this session');
    }
    const lessonVersion = await this.database.lessonVersion.findUnique({
      where: { id: session.lessonVersionId },
      select: { parsedContent: true },
    });
    if (!lessonVersion) throw new NotFoundException('Activity not found in this session');
    const snapshot = lessonSnapshotSchema.parse(lessonVersion.parsedContent);
    const activity = snapshot.activities.find((candidate) => candidate.id === activityId);
    if (!activity) throw new NotFoundException('Activity not found in this session');
    const content = snapshot.contentBlocks.filter((block) => activity.contentReferences.includes(block.slug));
    const languageBlocks = snapshot.wordBanks
      .flatMap((bank) => bank.languageBlocks)
      .filter((block) => activity.languageBlockReferences.includes(block.slug));
    const payload = activity.activityType === 'reading' || activity.activityType === 'listening'
      ? {
          prompt: activity.payload.prompt,
          questions: activity.payload.questions.map(({ options, prompt, slug }) => ({ options, prompt, slug })),
        }
      : {
          prompt: activity.payload.prompt,
          requiredPhrases: activity.payload.requiredPhrases,
          minWords: activity.payload.minWords,
          ...(activity.activityType === 'speaking' ? { mode: activity.payload.mode } : {}),
        };
    return {
      activityType: activity.activityType,
      content,
      id: activity.id,
      languageBlocks,
      learningBlock: activity.learningBlock,
      payload,
      skills: activity.skills,
      slug: activity.slug,
    };
  }

  async startSession(learnerId: string, id: string): Promise<LearningSessionDto> {
    const session = await this.findOwnedSession(learnerId, id);
    if (session.status === 'IN_PROGRESS') return this.toSessionDto(session);
    if (session.status !== 'PLANNED' && session.status !== 'PAUSED') {
      throw this.invalidTransition(session.status, 'IN_PROGRESS');
    }
    const update = await this.database.learningSession.updateMany({
      where: { id, learnerId, status: session.status },
      data: { status: 'IN_PROGRESS', startedAt: session.startedAt ?? new Date() },
    });
    if (update.count !== 1) {
      const latest = await this.findOwnedSession(learnerId, id);
      if (latest.status === 'IN_PROGRESS') return this.toSessionDto(latest);
      throw this.invalidTransition(latest.status, 'IN_PROGRESS');
    }
    const started = await this.getSession(learnerId, id);
    if (session.mission.purpose === 'LEARNING') {
      await this.pilotMetrics?.recordBestEffort({
        dimensions: {
          durationBucket: String(started.durationMinutes) as '45' | '60' | '90' | '120' | '150',
          levelCode: session.mission.level.code,
          missionCode: session.mission.slug,
        },
        eventType: 'LEARNING_SESSION_STARTED',
        sourceKey: `session:${id}:started`,
      });
    }
    return started;
  }

  async pauseSession(learnerId: string, id: string): Promise<LearningSessionDto> {
    const session = await this.findOwnedSession(learnerId, id);
    if (session.status !== 'IN_PROGRESS') throw this.invalidTransition(session.status, 'PAUSED');
    const update = await this.database.learningSession.updateMany({
      where: { id, learnerId, status: 'IN_PROGRESS' }, data: { status: 'PAUSED' },
    });
    if (update.count !== 1) {
      const latest = await this.findOwnedSession(learnerId, id);
      throw this.invalidTransition(latest.status, 'PAUSED');
    }
    return this.getSession(learnerId, id);
  }

  async resumeSession(learnerId: string, id: string): Promise<LearningSessionDto> {
    const session = await this.findOwnedSession(learnerId, id);
    if (session.status === 'IN_PROGRESS') return this.toSessionDto(session);
    if (session.status !== 'PAUSED') throw this.invalidTransition(session.status, 'IN_PROGRESS');
    const update = await this.database.learningSession.updateMany({
      where: { id, learnerId, status: 'PAUSED' }, data: { status: 'IN_PROGRESS' },
    });
    if (update.count !== 1) {
      const latest = await this.findOwnedSession(learnerId, id);
      if (latest.status === 'IN_PROGRESS') return this.toSessionDto(latest);
      throw this.invalidTransition(latest.status, 'IN_PROGRESS');
    }
    const resumed = await this.getSession(learnerId, id);
    if (session.mission.purpose === 'LEARNING') {
      await this.pilotMetrics?.recordBestEffort({
        dimensions: {
          durationBucket: String(resumed.durationMinutes) as '45' | '60' | '90' | '120' | '150',
          levelCode: session.mission.level.code,
          missionCode: session.mission.slug,
        },
        eventType: 'LEARNING_SESSION_RESUMED',
        sourceKey: `session:${id}:resumed:${session.updatedAt.toISOString()}`,
      });
    }
    return resumed;
  }

  async requireCurrentActivity(
    learnerId: string,
    sessionId: string,
    activityId: string,
    expectedType: 'speaking' | 'writing',
  ): Promise<CurrentActivitySubmission> {
    const session = await this.findOwnedSession(learnerId, sessionId);
    if (session.status !== 'IN_PROGRESS') throw this.invalidTransition(session.status, 'IN_PROGRESS');
    const plan = sessionPlanSchema.parse(session.planSnapshot);
    const activityIds = plan.blocks.flatMap((block) => block.activityIds);
    const activityIndex = activityIds.indexOf(activityId);
    if (activityIndex < 0) throw new NotFoundException('Activity not found in this session');
    if (activityIndex !== session.currentCheckpoint) {
      throw new ConflictException({
        code: 'INVALID_CHECKPOINT', message: 'Submit the current activity before continuing', statusCode: 409,
      });
    }
    const activity = await this.database.activity.findFirst({
      where: { id: activityId, lessonVersionId: session.lessonVersionId },
      select: { activityType: true },
    });
    if (!activity) throw new NotFoundException('Activity not found in this session');
    if (activity.activityType !== expectedType) {
      throw new BadRequestException(`Activity must be ${expectedType}`);
    }
    return {
      activityId, activityIndex, activityIds, lessonVersionId: session.lessonVersionId,
      plan, sessionId: session.id,
      purpose: session.mission.purpose === 'PLACEMENT' ? 'placement' : 'learning',
    };
  }

  async advanceSubmittedActivity(
    transaction: Prisma.TransactionClient,
    learnerId: string,
    context: CurrentActivitySubmission,
  ): Promise<void> {
    const nextCheckpoint = context.activityIndex + 1;
    const isCompleted = nextCheckpoint === context.activityIds.length;
    const completedAt = isCompleted ? new Date() : null;
    const update = await transaction.learningSession.updateMany({
      where: {
        currentCheckpoint: context.activityIndex,
        id: context.sessionId,
        learnerId,
        status: 'IN_PROGRESS',
      },
      data: isCompleted
        ? {
            completedAt,
            currentCheckpoint: nextCheckpoint,
            status: 'COMPLETED',
          }
        : {
            currentCheckpoint: nextCheckpoint,
            status: 'IN_PROGRESS',
          },
    });
    if (update.count !== 1) throw new ConflictException('Session checkpoint changed while submitting');
    await this.completeFinishedBlock(transaction, context.sessionId, context.plan, nextCheckpoint);
    if (isCompleted && completedAt) {
      await this.studyDayProjector?.recordCompletion(transaction, {
        completedAt,
        learnerId,
        purpose: context.purpose,
        sessionId: context.sessionId,
      });
    }
  }

  async submitAttempt(
    learnerId: string,
    activityId: string,
    input: SubmitAttemptInput,
  ): Promise<ActivityAttemptDto> {
    const session = await this.findOwnedSession(learnerId, input.sessionId);
    const duplicate = await this.database.activityAttempt.findUnique({
      where: { learnerId_clientAttemptId: { learnerId, clientAttemptId: input.clientAttemptId } },
    });
    if (duplicate) return this.resolveDuplicateAttempt(duplicate, session.id, activityId);
    if (session.status !== 'IN_PROGRESS') throw this.invalidTransition(session.status, 'IN_PROGRESS');
    const plan = sessionPlanSchema.parse(session.planSnapshot);
    const activityIds = plan.blocks.flatMap((block) => block.activityIds);
    const activityIndex = activityIds.indexOf(activityId);
    if (activityIndex < 0) throw new NotFoundException('Activity not found in this session');
    if (activityIndex !== session.currentCheckpoint) {
      throw new ConflictException({
        code: 'INVALID_CHECKPOINT', message: 'Submit the current activity before continuing', statusCode: 409,
      });
    }
    const storedActivity = await this.database.activity.findFirst({
      where: { id: activityId, lessonVersionId: session.lessonVersionId },
    });
    if (!storedActivity) throw new NotFoundException('Activity not found in this session');
    const activity = this.parseActivity(storedActivity);

    try {
      const attempt = await this.database.$transaction(async (transaction) => {
        const created = await transaction.activityAttempt.create({
          data: {
            activityId,
            clientAttemptId: input.clientAttemptId,
            evaluationStatus: 'SUBMITTED',
            learnerId,
            rawResponse: input.response as Prisma.InputJsonValue,
            sessionId: session.id,
          },
        });
        const evaluation = this.evaluate(activity, input.response);
        const evaluated = await transaction.activityAttempt.update({
          where: { id: created.id },
          data: {
            evaluationStatus: evaluation.evaluationStatus,
            feedback: evaluation.feedback,
            normalizedResponse: evaluation.normalizedResponse,
            score: evaluation.score,
          },
        });
        if (evaluation.evaluationStatus === 'EVALUATED' && session.mission.purpose === 'LEARNING') {
          await this.mastery.recordAttemptEvaluation({
            attemptId: evaluated.id,
            evaluationStatus: evaluation.evaluationStatus,
            languageBlockSlugs: activity.languageBlockReferences,
            learnerId,
            lessonVersionId: session.lessonVersionId,
            score: evaluation.score,
            skills: activity.skills.length > 0 ? activity.skills : [activity.activityType],
            tx: transaction,
          });
        }
        if (evaluation.evaluationStatus === 'QUEUED') {
          await this.jobs?.enqueue({
            createdById: learnerId,
            idempotencyKey: `evaluate:${evaluated.id}`,
            payload: { attemptId: evaluated.id },
            resourceId: evaluated.id,
            resourceType: 'ActivityAttempt',
            type: 'EVALUATE_ATTEMPT',
          }, transaction);
          await transaction.activityDraft.deleteMany({
            where: { activityId, learnerId, sessionId: session.id },
          });
        }
        if (evaluation.advance) {
          await this.advanceSubmittedActivity(transaction, learnerId, {
            activityId,
            activityIds,
            activityIndex,
            lessonVersionId: session.lessonVersionId,
            plan,
            purpose: session.mission.purpose === 'PLACEMENT' ? 'placement' : 'learning',
            sessionId: session.id,
          });
        }
        await this.curriculumProgress.projectSession(session.id, transaction);
        return evaluated;
      });
      if (
        activityIndex + 1 === activityIds.length
        && session.mission.purpose === 'LEARNING'
      ) {
        const completed = await this.database.learningSession.findUnique({
          select: { completedAt: true, status: true },
          where: { id: session.id },
        });
        if (completed?.status === 'COMPLETED' && completed.completedAt) {
          await this.pilotMetrics?.recordBestEffort({
            dimensions: {
              durationBucket: String(session.durationMinutes) as '45' | '60' | '90' | '120' | '150',
              levelCode: session.mission.level.code,
              missionCode: session.mission.slug,
              outcome: 'completed',
            },
            eventType: 'LEARNING_SESSION_COMPLETED',
            occurredAt: completed.completedAt,
            sourceKey: `session:${session.id}:completed`,
          });
          const metWeek = await this.database.learnerEngagementWeek.findFirst({
            orderBy: { metAt: 'desc' },
            select: { id: true, metAt: true },
            where: { learnerId, status: 'MET' },
          });
          if (metWeek?.metAt) {
            await this.pilotMetrics?.recordBestEffort({
              dimensions: { outcome: 'completed' },
              eventType: 'ENGAGEMENT_TARGET_MET',
              occurredAt: metWeek.metAt,
              sourceKey: `engagement-week:${metWeek.id}:met`,
            });
          }
        }
      }
      return this.toAttemptDto(attempt);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.database.activityAttempt.findUnique({
          where: { learnerId_clientAttemptId: { learnerId, clientAttemptId: input.clientAttemptId } },
        });
        if (existing) return this.resolveDuplicateAttempt(existing, session.id, activityId);
      }
      throw error;
    }
  }

  private async findOwnedSession(learnerId: string, id: string): Promise<LearningSessionRecord> {
    const session = await this.database.learningSession.findFirst({
      where: { id, learnerId }, include: learningSessionInclude,
    });
    if (!session) throw new NotFoundException('Learning session not found');
    return session;
  }

  private async requireCompletedOnboarding(learnerId: string) {
    const profile = await this.database.learnerProfile.findUnique({ where: { userId: learnerId } });
    if (profile?.onboardingStatus !== 'COMPLETE') {
      throw new ConflictException({
        code: 'ONBOARDING_REQUIRED',
        message: 'Complete onboarding before starting a learning session',
        statusCode: 409,
      });
    }
    return profile;
  }

  private parseActivity(activity: Activity): CurriculumActivity {
    return activitySchema.parse({
      activityType: activity.activityType,
      contentReferences: activity.contentReferences,
      id: activity.id,
      languageBlockReferences: activity.languageBlockReferences,
      learningBlock: activity.learningBlock,
      order: activity.order,
      payload: activity.payload,
      skills: activity.skills,
      slug: activity.slug,
    });
  }

  private evaluate(activity: CurriculumActivity, response: Record<string, unknown>): Evaluation {
    if (activity.activityType === 'reading' || activity.activityType === 'listening') {
      const answerIndexes = response.answerIndexes;
      if (!Array.isArray(answerIndexes) ||
          answerIndexes.length !== activity.payload.questions.length ||
          !answerIndexes.every((answer) => Number.isInteger(answer))) {
        throw new BadRequestException('One answer index is required for every question');
      }
      const correct = activity.payload.questions.reduce(
        (count, question, index) => count + (answerIndexes[index] === question.answerIndex ? 1 : 0),
        0,
      );
      const score = correct / activity.payload.questions.length;
      return {
        advance: score === 1,
        evaluationStatus: 'EVALUATED',
        feedback: score === 1 ? 'Correct' : 'Review the evidence and try again',
        normalizedResponse: { answerIndexes: [...answerIndexes] } as Prisma.InputJsonValue,
        score,
      };
    }
    const text = response.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new BadRequestException('A non-empty text response is required');
    }
    const queued = activity.activityType === 'writing' && this.jobs !== undefined;
    return {
      advance: true,
      evaluationStatus: queued ? 'QUEUED' : 'SUBMITTED',
      feedback: queued
        ? 'Saved. Teacher AI evaluation is queued.'
        : 'Saved. Advanced speaking and writing feedback is not available yet.',
      normalizedResponse: { text: text.trim() },
      score: null,
    };
  }

  private async completeFinishedBlock(
    transaction: Prisma.TransactionClient,
    sessionId: string,
    plan: SessionPlan,
    nextCheckpoint: number,
  ): Promise<void> {
    let blockEnd = 0;
    for (const block of plan.blocks) {
      blockEnd += block.activityIds.length;
      if (nextCheckpoint === blockEnd) {
        await transaction.sessionBlock.update({
          where: { sessionId_order: { sessionId, order: block.order } },
          data: { status: 'COMPLETED' },
        });
        return;
      }
    }
  }

  private invalidTransition(from: string, to: string): ConflictException {
    return new ConflictException({
      code: 'INVALID_STATE_TRANSITION',
      message: `Cannot transition a learning session from ${from} to ${to}`,
      statusCode: 409,
    });
  }

  private resolveDuplicateAttempt(
    attempt: ActivityAttempt,
    sessionId: string,
    activityId: string,
  ): ActivityAttemptDto {
    if (attempt.sessionId !== sessionId || attempt.activityId !== activityId) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'The client attempt ID is already associated with another target',
        statusCode: 409,
      });
    }
    return this.toAttemptDto(attempt);
  }

  private toSessionDto(session: LearningSessionRecord): LearningSessionDto {
    return toLearningSessionDto(session);
  }

  private toAttemptDto(attempt: ActivityAttempt): ActivityAttemptDto {
    return {
      activityId: attempt.activityId,
      clientAttemptId: attempt.clientAttemptId,
      createdAt: attempt.createdAt.toISOString(),
      evaluationStatus: attempt.evaluationStatus.toLowerCase() as ActivityAttemptDto['evaluationStatus'],
      feedback: attempt.feedback,
      id: attempt.id,
      learnerId: attempt.learnerId,
      normalizedResponse: attempt.normalizedResponse,
      rawResponse: attempt.rawResponse,
      score: attempt.score,
      sessionId: attempt.sessionId,
    };
  }
}
