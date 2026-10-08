import { Inject, Injectable, Optional } from '@nestjs/common';
import { z } from 'zod';

import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { decideJobRetry } from '../../jobs/application/job-runner.service.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import {
  EVALUATION_SERVICE_OPTIONS,
  EvaluationService,
  type EvaluationServiceOptions,
} from './evaluation.service.js';

const payloadSchema = z.object({ attemptId: z.string().min(1) }).strict();

@Injectable()
export class EvaluateAttemptHandler implements JobHandler {
  readonly type = 'EVALUATE_ATTEMPT';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(EvaluationService) private readonly evaluations: EvaluationService,
    @Optional()
    @Inject(EVALUATION_SERVICE_OPTIONS)
    private readonly options?: Pick<EvaluationServiceOptions, 'recordingRetentionDays'>,
  ) {}

  async handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>> {
    const { attemptId } = payloadSchema.parse(job.payload);
    await this.database.activityAttempt.updateMany({
      where: { id: attemptId, evaluationStatus: { not: 'EVALUATED' } },
      data: { evaluationStatus: 'PROCESSING' },
    });
    try {
      const result = await this.evaluations.evaluateAttempt(attemptId);
      return { attemptId, evaluationResultId: result.id, score: result.score };
    } catch (error) {
      const retry = error instanceof ProviderError && error.retryable
        ? decideJobRetry({
            attemptNumber: job.attemptNumber,
            code: error.code,
            maxAttempts: job.maxAttempts,
            now: new Date(),
            random: () => 0,
            ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }),
          })
        : { retry: false } as const;
      if (retry.retry) {
        await this.database.activityAttempt.updateMany({
          where: { id: attemptId, evaluationStatus: { not: 'EVALUATED' } },
          data: { evaluationStatus: 'QUEUED' },
        });
      } else {
        const retentionUntil = new Date();
        retentionUntil.setUTCDate(
          retentionUntil.getUTCDate() + (this.options?.recordingRetentionDays ?? 7),
        );
        await this.database.$transaction(async (transaction) => {
          await transaction.activityAttempt.updateMany({
            where: { id: attemptId, evaluationStatus: { not: 'EVALUATED' } },
            data: { evaluationStatus: 'EVALUATION_FAILED' },
          });
          await transaction.recording.updateMany({
            where: { attemptId, retentionUntil: null },
            data: { retentionUntil },
          });
        });
      }
      throw error;
    }
  }
}
