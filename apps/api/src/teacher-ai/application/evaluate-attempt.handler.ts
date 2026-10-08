import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../common/database/prisma.service.js';
import type { ClaimedJob, JobHandler } from '../../jobs/domain/job-handler.port.js';
import { EvaluationService } from './evaluation.service.js';

const payloadSchema = z.object({ attemptId: z.string().min(1) }).strict();

@Injectable()
export class EvaluateAttemptHandler implements JobHandler {
  readonly type = 'EVALUATE_ATTEMPT';

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(EvaluationService) private readonly evaluations: EvaluationService,
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
      await this.database.activityAttempt.updateMany({
        where: { id: attemptId, evaluationStatus: { not: 'EVALUATED' } },
        data: { evaluationStatus: 'EVALUATION_FAILED' },
      });
      throw error;
    }
  }
}
