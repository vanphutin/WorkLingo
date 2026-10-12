import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus, type Prisma } from '@prisma/client';
import type {
  AdminJobDetailDto,
  AdminJobItemDto,
  AdminJobPageDto,
  AdminOperationsSummaryDto,
} from '@worklingo/contracts';

import type { AppConfig } from '../../common/config/app-config.schema.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import type { OperationsQueryDto } from '../dto/operations-query.dto.js';

const SAFE_PAYLOAD_ALLOWLIST = new Set([
  'activityId',
  'audioScriptSlug',
  'contentImportId',
  'lessonId',
  'lessonVersionId',
  'mimeType',
  'recordingId',
  'resourceId',
  'resourceType',
  'rubricId',
  'rubricVersion',
  'scriptHash',
  'sourceHash',
  'variantKey',
]);

@Injectable()
export class OperationsQueryService {
  private readonly workerConfig: {
    leaseMs: number;
    pollIntervalMs: number;
    workerEnabled: boolean;
  };

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    configService: ConfigService<AppConfig, true>,
  ) {
    const jobsConfig = configService.get('jobs', { infer: true });
    this.workerConfig = {
      leaseMs: jobsConfig.leaseMs,
      pollIntervalMs: jobsConfig.pollIntervalMs,
      workerEnabled: jobsConfig.workerEnabled,
    };
  }

  async getSummary(): Promise<AdminOperationsSummaryDto> {
    const grouped = await this.prisma.job.groupBy({
      by: ['status', 'type'],
      _count: { id: true },
    });

    let queueDepth = 0;
    let runningCount = 0;
    let failedCount = 0;
    let completedCount = 0;

    const jobTypeBreakdown: Record<
      string,
      {
        completed: number;
        failed: number;
        pending: number;
        running: number;
        total: number;
      }
    > = {};

    for (const group of grouped) {
      const count = group._count.id;
      const type = group.type;
      const status = group.status;

      if (!jobTypeBreakdown[type]) {
        jobTypeBreakdown[type] = {
          completed: 0,
          failed: 0,
          pending: 0,
          running: 0,
          total: 0,
        };
      }

      jobTypeBreakdown[type].total += count;

      switch (status) {
        case JobStatus.PENDING:
          jobTypeBreakdown[type].pending += count;
          queueDepth += count;
          break;
        case JobStatus.RUNNING:
          jobTypeBreakdown[type].running += count;
          queueDepth += count;
          runningCount += count;
          break;
        case JobStatus.RETRY_WAIT:
          jobTypeBreakdown[type].pending += count;
          queueDepth += count;
          break;
        case JobStatus.COMPLETED:
          jobTypeBreakdown[type].completed += count;
          completedCount += count;
          break;
        case JobStatus.FAILED:
          jobTypeBreakdown[type].failed += count;
          failedCount += count;
          break;
      }
    }

    const activeRunning = await this.prisma.job.findMany({
      where: {
        leaseExpiresAt: { gt: new Date() },
        leaseOwner: { not: null },
        status: JobStatus.RUNNING,
      },
      select: { leaseOwner: true },
    });

    const activeWorkers = new Set(
      activeRunning
        .map((j) => j.leaseOwner)
        .filter((o): o is string => typeof o === 'string' && o.length > 0),
    ).size;

    return {
      activeWorkers,
      completedCount,
      failedCount,
      jobTypeBreakdown,
      queueDepth,
      runningCount,
      workerConfig: this.workerConfig,
    };
  }

  async listJobs(query: OperationsQueryDto): Promise<AdminJobPageDto> {
    const where: Prisma.JobWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }

    const total = await this.prisma.job.count({ where });
    // Keep this boundary defensive: the production tsx bootstrap can surface
    // query values as strings even when ValidationPipe transformation metadata
    // is unavailable. Prisma requires concrete integers for skip/take.
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const page = Math.max(1, Number(query.page) || 1);
    const totalPages = Math.ceil(total / pageSize);

    const jobs = await this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    });

    const items: AdminJobItemDto[] = jobs.map((job) => ({
      attemptCount: job.attemptCount,
      availableAt: job.availableAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
      errorCode: job.errorCode,
      errorSummary: job.errorSummary,
      id: job.id,
      leaseOwner: job.leaseOwner,
      maxAttempts: job.maxAttempts,
      resourceId: job.resourceId,
      resourceType: job.resourceType,
      retryable: job.retryable,
      status: job.status,
      type: job.type,
    }));

    return {
      items,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  async getJobDetail(id: string): Promise<AdminJobDetailDto> {
    const job = await this.prisma.job.findUnique({
      include: {
        attempts: {
          orderBy: { attemptNumber: 'asc' },
        },
      },
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found.`);
    }

    const payloadSummary = this.scrubPayload(job.payload);

    return {
      attemptCount: job.attemptCount,
      attempts: job.attempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
        errorCode: attempt.errorCode,
        errorSummary: attempt.errorSummary,
        outcome: attempt.outcome,
        providerModel: attempt.providerModel,
        providerName: attempt.providerName,
        startedAt: attempt.startedAt.toISOString(),
      })),
      availableAt: job.availableAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
      errorCode: job.errorCode,
      errorSummary: job.errorSummary,
      id: job.id,
      leaseOwner: job.leaseOwner,
      maxAttempts: job.maxAttempts,
      payloadSummary,
      resourceId: job.resourceId,
      resourceType: job.resourceType,
      retryable: job.retryable,
      status: job.status,
      type: job.type,
    };
  }

  private scrubPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (SAFE_PAYLOAD_ALLOWLIST.has(key)) {
        scrubbed[key] = value;
      }
    }
    return scrubbed;
  }
}
