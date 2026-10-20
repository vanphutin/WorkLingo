import { createHash } from 'node:crypto';

import {
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type JobStatus } from '@prisma/client';
import { evaluationDtoSchema, evaluationStatusSchema, type EvaluationDto } from '@worklingo/contracts';

import { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import { PilotMetricsService } from '../../analytics/application/pilot-metrics.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { JobsService } from '../../jobs/application/jobs.service.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';
import { CurriculumProgressService } from '../../curriculum-foundation/application/curriculum-progress.service.js';
import { aggregateEvaluation, resolveFoundationRubric } from '../domain/foundation-rubrics.js';
import { evaluationProcessingSteps } from './evaluation-processing.js';

export interface EvaluationServiceOptions {
  readonly languageProviderConfigVersion?: string;
  readonly languageProviderModel?: string | null;
  readonly languageProviderName?: string;
  readonly recordingRetentionDays: number;
}

export const EVALUATION_SERVICE_OPTIONS = Symbol('EVALUATION_SERVICE_OPTIONS');

export interface EvaluationOutcome {
  readonly id: string;
  readonly score: number;
}

interface MetricAttempt {
  readonly id: string;
  readonly session: {
    readonly mission: {
      readonly level: { readonly code: string };
      readonly slug: string;
    };
  };
}

const hashEvaluationInput = (input: Readonly<Record<string, unknown>>): string =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(LanguageEvaluationPort) private readonly language: LanguageEvaluationPort,
    @Inject(MasteryService) private readonly mastery: MasteryService,
    @Inject(EVALUATION_SERVICE_OPTIONS) private readonly options: EvaluationServiceOptions,
    @Inject(CurriculumProgressService) private readonly curriculumProgress: CurriculumProgressService,
    @Optional() @Inject(JobsService) private readonly jobs?: JobsService,
    @Optional() @Inject(PilotMetricsService) private readonly pilotMetrics?: PilotMetricsService,
  ) {}

  async getForLearner(learnerId: string, attemptId: string): Promise<EvaluationDto> {
    const attempt = await this.database.activityAttempt.findFirst({
      where: { id: attemptId, learnerId },
      include: {
        evaluationResults: { orderBy: { completedAt: 'desc' }, take: 1 },
        recording: true,
      },
    });
    if (!attempt) throw new NotFoundException('Evaluation not found');
    const result = attempt.evaluationResults[0];
    const processingJobs = attempt.recording && (attempt.evaluationStatus === 'QUEUED' || attempt.evaluationStatus === 'PROCESSING')
      ? await this.database.job.findMany({ where: { resourceId: attempt.id, resourceType: 'ActivityAttempt', type: { in: ['TRANSCRIBE_SPEECH', 'EVALUATE_ATTEMPT'] } },
          select: { type: true, status: true }, orderBy: { createdAt: 'desc' }, take: 4 }) : [];
    const jobStates: { transcription?: JobStatus; evaluation?: JobStatus } = {};
    for (const job of processingJobs) {
      const key = job.type === 'TRANSCRIBE_SPEECH' ? 'transcription' : 'evaluation';
      jobStates[key] ??= job.status;
    }
    const failedJob = attempt.evaluationStatus === 'EVALUATION_FAILED'
      ? await this.database.job.findFirst({
          where: {
            resourceId: attempt.id,
            resourceType: 'ActivityAttempt',
            status: 'FAILED',
          },
          orderBy: { updatedAt: 'desc' },
          select: { retryable: true, type: true },
        })
      : null;
    const sourceAvailable = failedJob?.type !== 'TRANSCRIBE_SPEECH'
      || Boolean(attempt.recording
        && !attempt.recording.deletedAt
        && !attempt.recording.deletionRequestedAt);
    return evaluationDtoSchema.parse({
      processingSteps: evaluationProcessingSteps(evaluationStatusSchema.parse(attempt.evaluationStatus.toLowerCase()), attempt.recording, result ?? null, jobStates),
      attemptId: attempt.id,
      completedAt: result?.completedAt.toISOString() ?? null,
      feedback: result?.feedback ?? null,
      recording: attempt.recording
        ? {
            deletedAt: attempt.recording.deletedAt?.toISOString() ?? null,
            id: attempt.recording.id,
            retentionUntil: attempt.recording.retentionUntil?.toISOString() ?? null,
          }
        : null,
      retryable: Boolean(failedJob?.retryable && sourceAvailable),
      score: result?.score ?? attempt.score,
      scores: result?.scores ?? null,
      status: attempt.evaluationStatus.toLowerCase(),
      transcript: attempt.recording?.transcript ?? null,
    });
  }

  async retryForLearner(learnerId: string, attemptId: string): Promise<EvaluationDto> {
    const attempt = await this.database.activityAttempt.findFirst({
      where: { id: attemptId, learnerId }, include: { recording: true },
    });
    if (!attempt) throw new NotFoundException('Evaluation not found');
    if (attempt.evaluationStatus !== 'EVALUATION_FAILED' || !this.jobs) {
      throw this.notRetryable();
    }
    const failedJob = await this.database.job.findFirst({
      where: {
        resourceId: attempt.id,
        resourceType: 'ActivityAttempt',
        retryable: true,
        status: 'FAILED',
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!failedJob) throw this.notRetryable();
    if (failedJob.type === 'TRANSCRIBE_SPEECH'
      && (!attempt.recording
        || attempt.recording.deletedAt
        || attempt.recording.deletionRequestedAt)) {
      throw new GoneException({
        code: 'RECORDING_EXPIRED',
        message: 'The recording required for this retry is no longer available.',
        statusCode: 410,
      });
    }
    await this.jobs.retryJob(failedJob.id, learnerId);
    await this.database.activityAttempt.updateMany({
      where: { id: attempt.id, learnerId, evaluationStatus: 'EVALUATION_FAILED' },
      data: { evaluationStatus: 'QUEUED' },
    });
    return this.getForLearner(learnerId, attemptId);
  }

  async evaluateAttempt(attemptId: string): Promise<EvaluationOutcome> {
    const attempt = await this.database.activityAttempt.findUnique({
      where: { id: attemptId },
      include: {
        activity: true,
        evaluationResults: { orderBy: { createdAt: 'desc' } },
        recording: true,
        session: { include: { mission: { include: { level: true } } } },
      },
    });
    if (!attempt) throw new NotFoundException(`Attempt ${attemptId} was not found`);

    const activity = activitySchema.parse({
      activityType: attempt.activity.activityType,
      contentReferences: attempt.activity.contentReferences,
      id: attempt.activity.id,
      languageBlockReferences: attempt.activity.languageBlockReferences,
      learningBlock: attempt.activity.learningBlock,
      order: attempt.activity.order,
      payload: attempt.activity.payload,
      skills: attempt.activity.skills,
      slug: attempt.activity.slug,
    });
    if (activity.activityType !== 'speaking' && activity.activityType !== 'writing') {
      throw new UnprocessableEntityException('Only speaking and writing attempts use Teacher AI');
    }

    const rubric = activity.activityType === 'speaking'
      ? resolveFoundationRubric({ activityType: 'speaking', mode: activity.payload.mode })
      : resolveFoundationRubric({ activityType: 'writing' });
    const response = attempt.rawResponse as Record<string, unknown>;
    const learnerResponse = activity.activityType === 'speaking'
      ? attempt.recording?.transcript
      : response.text;
    if (typeof learnerResponse !== 'string' || learnerResponse.trim().length === 0) {
      throw new UnprocessableEntityException('The attempt has no response ready for evaluation');
    }

    const inputHash = hashEvaluationInput({
      activityId: activity.id,
      learnerResponse: learnerResponse.trim(),
      lessonVersionId: attempt.session.lessonVersionId,
      rubricId: rubric.id,
      rubricVersion: rubric.version,
      speechMetrics: attempt.recording?.speechMetrics ?? null,
    });
    const existing = attempt.evaluationResults.find(
      (candidate) => candidate.rubricVersion === rubric.version,
    );
    if (existing) {
      if (existing.inputHash !== inputHash) {
        throw new ConflictException('Completed evaluation input no longer matches the attempt');
      }
      await this.recordTerminalMetric(attempt, activity.activityType, existing.completedAt);
      return { id: existing.id, score: existing.score };
    }

    const evaluationInput = {
      routing: { userId: attempt.learnerId },
      activityType: activity.activityType,
      learnerResponse: learnerResponse.trim(),
      levelCode: attempt.session.mission.level.code,
      prompt: activity.payload.prompt,
      referenceText: activity.payload.sampleAnswer,
      requiredPhrases: activity.payload.requiredPhrases,
      rubricId: rubric.id,
      rubricVersion: rubric.version,
    };
    const routed = this.language.evaluateWithProvenance
      ? await this.language.evaluateWithProvenance(evaluationInput)
      : { evaluation: await this.language.evaluate(evaluationInput), provenance: null };
    const providerEvaluation = routed.evaluation;
    const aggregated = aggregateEvaluation(
      rubric,
      providerEvaluation,
      activity.activityType === 'speaking'
        ? attempt.recording?.speechMetrics as Parameters<typeof aggregateEvaluation>[2]
        : undefined,
    );
    try {
      const outcome = await this.database.$transaction(async (transaction) => {
        const duplicate = await transaction.evaluationResult.findUnique({
          where: { attemptId_rubricVersion: { attemptId, rubricVersion: rubric.version } },
        });
        if (duplicate) return { id: duplicate.id, score: duplicate.score };

        const completedAt = new Date();
        const result = await transaction.evaluationResult.create({
          data: {
            attemptId,
            completedAt,
            feedback: aggregated.feedback as Prisma.InputJsonValue,
            inputHash,
            lessonVersionId: attempt.session.lessonVersionId,
            providerConfigVersion: routed.provenance?.providerConfigVersion ?? this.options.languageProviderConfigVersion ?? '1',
            providerModel: routed.provenance?.providerModel ?? this.options.languageProviderModel ?? null,
            providerName: routed.provenance?.providerName ?? this.options.languageProviderName ?? 'fake-language-evaluation',
            rubricId: rubric.id,
            rubricVersion: rubric.version,
            score: aggregated.score,
            scores: aggregated.scores as Prisma.InputJsonValue,
            speechMetricsProvenance: activity.activityType === 'speaking'
              ? {
                  providerConfigVersion: attempt.recording?.providerConfigVersion ?? null,
                  providerName: attempt.recording?.providerName ?? null,
                }
              : Prisma.JsonNull,
          },
        });
        await transaction.activityAttempt.update({
          where: { id: attemptId },
          data: {
            evaluationStatus: 'EVALUATED',
            feedback: aggregated.feedback.summary,
            normalizedResponse: activity.activityType === 'speaking'
              ? { transcript: learnerResponse.trim() }
              : { text: learnerResponse.trim() },
            score: aggregated.score,
          },
        });
        if (attempt.recording) {
          const retentionUntil = new Date(completedAt);
          retentionUntil.setUTCDate(retentionUntil.getUTCDate() + this.options.recordingRetentionDays);
          await transaction.recording.update({
            where: { id: attempt.recording.id },
            data: { retentionUntil },
          });
        }
        if (attempt.session.mission.purpose === 'LEARNING') {
          await this.mastery.recordAttemptEvaluation({
            attemptId,
            evaluationStatus: 'EVALUATED',
            languageBlockSlugs: activity.languageBlockReferences,
            learnerId: attempt.learnerId,
            lessonVersionId: attempt.session.lessonVersionId,
            score: aggregated.score,
            skills: activity.skills,
            tx: transaction,
          });
          await this.curriculumProgress.projectSession(attempt.session.id, transaction);
        }
        return { id: result.id, score: result.score };
      });
      await this.recordTerminalMetric(attempt, activity.activityType, new Date());
      return outcome;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.evaluationResult.findUnique({
          where: { attemptId_rubricVersion: { attemptId, rubricVersion: rubric.version } },
        });
        if (winner && winner.inputHash === inputHash) {
          await this.recordTerminalMetric(attempt, activity.activityType, winner.completedAt);
          return { id: winner.id, score: winner.score };
        }
      }
      throw error;
    }
  }

  private async recordTerminalMetric(
    attempt: MetricAttempt,
    skill: 'speaking' | 'writing',
    occurredAt: Date,
  ): Promise<void> {
    await this.pilotMetrics?.recordBestEffort({
      dimensions: {
        levelCode: attempt.session.mission.level.code,
        missionCode: attempt.session.mission.slug,
        outcome: 'completed',
        skill,
      },
      eventType: 'EVALUATION_TERMINAL',
      occurredAt,
      sourceKey: `attempt:${attempt.id}:evaluation-terminal`,
    });
  }

  private notRetryable(): ConflictException {
    return new ConflictException({
      code: 'EVALUATION_NOT_RETRYABLE',
      message: 'This evaluation cannot be retried.',
      statusCode: 409,
    });
  }
}
