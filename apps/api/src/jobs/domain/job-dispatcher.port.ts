import type { Prisma } from '@prisma/client';

export interface EnqueueJobInput {
  readonly contentImportId?: string;
  readonly createdById: string;
  readonly idempotencyKey: string;
  readonly maxAttempts?: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly resourceId?: string;
  readonly resourceType?: string;
  readonly type: string;
}

export interface JobReference {
  readonly id: string;
  readonly status: 'PENDING' | 'RUNNING' | 'RETRY_WAIT' | 'COMPLETED' | 'FAILED';
  readonly type: string;
}

export abstract class JobDispatcher {
  abstract enqueue(
    input: EnqueueJobInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<JobReference>;
}
