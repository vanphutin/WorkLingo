import { createHash } from 'node:crypto';

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';
import { aggregateEvaluation, resolveFoundationRubric } from '../domain/foundation-rubrics.js';

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

const hashEvaluationInput = (input: Readonly<Record<string, unknown>>): string =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(LanguageEvaluationPort) private readonly language: LanguageEvaluationPort,
    @Inject(MasteryService) private readonly mastery: MasteryService,
    @Inject(EVALUATION_SERVICE_OPTIONS) private readonly options: EvaluationServiceOptions,
  ) {}

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
      return { id: existing.id, score: existing.score };
    }

    const providerEvaluation = await this.language.evaluate({
      activityType: activity.activityType,
      learnerResponse: learnerResponse.trim(),
      levelCode: attempt.session.mission.level.code,
      prompt: activity.payload.prompt,
      referenceText: activity.payload.sampleAnswer,
      requiredPhrases: activity.payload.requiredPhrases,
      rubricId: rubric.id,
      rubricVersion: rubric.version,
    });
    const aggregated = aggregateEvaluation(
      rubric,
      providerEvaluation,
      activity.activityType === 'speaking'
        ? attempt.recording?.speechMetrics as Parameters<typeof aggregateEvaluation>[2]
        : undefined,
    );
    try {
      return await this.database.$transaction(async (transaction) => {
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
            providerConfigVersion: this.options.languageProviderConfigVersion ?? '1',
            providerModel: this.options.languageProviderModel ?? null,
            providerName: this.options.languageProviderName ?? 'fake-language-evaluation',
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
        return { id: result.id, score: result.score };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.database.evaluationResult.findUnique({
          where: { attemptId_rubricVersion: { attemptId, rubricVersion: rubric.version } },
        });
        if (winner && winner.inputHash === inputHash) return { id: winner.id, score: winner.score };
      }
      throw error;
    }
  }
}
