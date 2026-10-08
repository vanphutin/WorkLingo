import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type JobStatus as PrismaJobStatus } from '@prisma/client';
import type { JobDto, JobStatus } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import {
  JobDispatcher,
  type EnqueueJobInput,
  type JobReference,
} from '../domain/job-dispatcher.port.js';
import type { ClaimedJob } from '../domain/job-handler.port.js';

interface ClaimedJobRow {
  readonly attemptCount: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly payload: Prisma.JsonValue;
  readonly status: PrismaJobStatus;
  readonly type: string;
}

export interface CompleteClaimInput {
  readonly attemptNumber: number;
  readonly jobId: string;
  readonly result: Readonly<Record<string, unknown>>;
  readonly workerId: string;
}

export interface FailClaimInput {
  readonly attemptNumber: number;
  readonly availableAt?: Date;
  readonly code: string;
  readonly errorSummary: string;
  readonly jobId: string;
  readonly manuallyRetryable: boolean;
  readonly retry: boolean;
  readonly workerId: string;
}

const recordPayload = (value: Prisma.JsonValue): Readonly<Record<string, unknown>> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

@Injectable()
export class JobsService extends JobDispatcher {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {
    super();
  }

  async enqueue(
    input: EnqueueJobInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<JobReference> {
    const database = transaction ?? this.database;
    try {
      const job = await database.job.create({
        data: {
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
          createdById: input.createdById,
          idempotencyKey: input.idempotencyKey,
          maxAttempts: input.maxAttempts ?? 3,
          ...(input.contentImportId ? { contentImportId: input.contentImportId } : {}),
          ...(input.resourceId ? { resourceId: input.resourceId } : {}),
          ...(input.resourceType ? { resourceType: input.resourceType } : {}),
        },
      });
      return { id: job.id, status: job.status, type: job.type };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const existing = await database.job.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!existing
        || existing.type !== input.type
        || existing.resourceType !== (input.resourceType ?? null)
        || existing.resourceId !== (input.resourceId ?? null)) {
        throw new ConflictException({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'Idempotency key was already used for different work.',
          statusCode: 409,
        });
      }
      return { id: existing.id, status: existing.status, type: existing.type };
    }
  }

  async claimNext(workerId: string, now: Date, leaseMs: number): Promise<ClaimedJob | null> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<ClaimedJobRow[]>`
        SELECT "id", "type", "payload", "status", "attemptCount", "maxAttempts"
        FROM "Job"
        WHERE
          ("status" IN ('PENDING'::"JobStatus", 'RETRY_WAIT'::"JobStatus")
            AND "availableAt" <= ${now}
            AND "attemptCount" < "maxAttempts")
          OR ("status" = 'RUNNING'::"JobStatus" AND "leaseExpiresAt" <= ${now})
        ORDER BY
          CASE WHEN "status" = 'RUNNING'::"JobStatus" THEN 0 ELSE 1 END,
          "availableAt" ASC,
          "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;

      if (row.status === 'RUNNING') {
        await transaction.jobAttempt.updateMany({
          where: { jobId: row.id, outcome: 'RUNNING' },
          data: {
            outcome: 'FAILED',
            completedAt: now,
            errorCode: 'LEASE_EXPIRED',
            errorSummary: 'Worker lease expired before completion.',
          },
        });
        if (row.attemptCount >= row.maxAttempts) {
          await transaction.job.update({
            where: { id: row.id },
            data: {
              status: 'FAILED',
              completedAt: now,
              leaseOwner: null,
              leaseExpiresAt: null,
              retryable: true,
              error: 'Worker lease expired on the final automatic attempt.',
              errorCode: 'LEASE_EXPIRED',
              errorSummary: 'Worker lease expired on the final automatic attempt.',
            },
          });
          return null;
        }
      }

      const attemptNumber = row.attemptCount + 1;
      await transaction.job.update({
        where: { id: row.id },
        data: {
          status: 'RUNNING',
          attemptCount: attemptNumber,
          leaseOwner: workerId,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          startedAt: now,
          errorCode: null,
          errorSummary: null,
        },
      });
      await transaction.jobAttempt.create({
        data: { jobId: row.id, attemptNumber, startedAt: now },
      });

      return {
        id: row.id,
        type: row.type,
        payload: recordPayload(row.payload),
        attemptNumber,
        maxAttempts: row.maxAttempts,
      };
    });
  }

  async completeClaim(input: CompleteClaimInput): Promise<boolean> {
    const completedAt = new Date();
    return this.database.$transaction(async (transaction) => {
      const updated = await transaction.job.updateMany({
        where: {
          id: input.jobId,
          status: 'RUNNING',
          leaseOwner: input.workerId,
          attemptCount: input.attemptNumber,
        },
        data: {
          status: 'COMPLETED',
          result: input.result as Prisma.InputJsonValue,
          completedAt,
          leaseOwner: null,
          leaseExpiresAt: null,
          retryable: false,
          error: null,
          errorCode: null,
          errorSummary: null,
        },
      });
      if (updated.count === 0) return false;
      await transaction.jobAttempt.update({
        where: {
          jobId_attemptNumber: { jobId: input.jobId, attemptNumber: input.attemptNumber },
        },
        data: { outcome: 'SUCCEEDED', completedAt },
      });
      return true;
    });
  }

  async failClaim(input: FailClaimInput): Promise<boolean> {
    const completedAt = new Date();
    return this.database.$transaction(async (transaction) => {
      const updated = await transaction.job.updateMany({
        where: {
          id: input.jobId,
          status: 'RUNNING',
          leaseOwner: input.workerId,
          attemptCount: input.attemptNumber,
        },
        data: {
          status: input.retry ? 'RETRY_WAIT' : 'FAILED',
          availableAt: input.availableAt ?? completedAt,
          leaseOwner: null,
          leaseExpiresAt: null,
          retryable: input.manuallyRetryable,
          error: input.errorSummary,
          errorCode: input.code,
          errorSummary: input.errorSummary,
          ...(!input.retry ? { completedAt } : {}),
        },
      });
      if (updated.count === 0) return false;
      await transaction.jobAttempt.update({
        where: {
          jobId_attemptNumber: { jobId: input.jobId, attemptNumber: input.attemptNumber },
        },
        data: {
          outcome: 'FAILED', completedAt, errorCode: input.code, errorSummary: input.errorSummary,
        },
      });
      return true;
    });
  }

  async retryJob(jobId: string, _actorId: string): Promise<JobReference> {
    return this.database.$transaction(async (transaction) => {
      const job = await transaction.job.findUnique({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException({
          code: 'NOT_FOUND', message: `Job ${jobId} not found`, statusCode: 404,
        });
      }
      if (job.status !== 'FAILED' || !job.retryable) {
        throw new ConflictException({
          code: 'JOB_NOT_RETRYABLE',
          message: 'This job cannot be retried.',
          statusCode: 409,
        });
      }
      const updated = await transaction.job.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          availableAt: new Date(),
          maxAttempts: job.maxAttempts + 1,
          retryable: false,
          completedAt: null,
          error: null,
          errorCode: null,
          errorSummary: null,
        },
      });
      return { id: updated.id, status: updated.status, type: updated.type };
    });
  }

  async getJob(jobId: string, _actorId: string): Promise<JobDto> {
    const job = await this.database.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({
        code: 'NOT_FOUND', message: `Job ${jobId} not found`, statusCode: 404,
      });
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status as JobStatus,
      payload: recordPayload(job.payload),
      result: job.result === null ? null : recordPayload(job.result),
      error: job.errorSummary ?? job.error,
      errorCode: job.errorCode,
      retryable: job.retryable,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
