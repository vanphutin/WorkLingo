import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { JobDto, JobStatus } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getJob(jobId: string, _actorId: string): Promise<JobDto> {
    const job = await this.database.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Job ${jobId} not found`,
        statusCode: 404,
      });
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status as JobStatus,
      payload: (job.payload ?? {}) as Record<string, unknown>,
      result: (job.result ?? null) as Record<string, unknown> | null,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
