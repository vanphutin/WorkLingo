import { z } from 'zod';

export const adminJobStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'RETRY_WAIT',
  'COMPLETED',
  'FAILED',
]);
export type AdminJobStatus = z.infer<typeof adminJobStatusSchema>;

export const adminJobItemSchema = z.object({
  attemptCount: z.number().int().nonnegative(),
  availableAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  errorCode: z.string().nullable(),
  errorSummary: z.string().nullable(),
  id: z.string().uuid(),
  leaseOwner: z.string().nullable(),
  maxAttempts: z.number().int().positive(),
  resourceId: z.string().nullable(),
  resourceType: z.string().nullable(),
  retryable: z.boolean(),
  status: adminJobStatusSchema,
  type: z.string().min(1),
});
export type AdminJobItemDto = z.infer<typeof adminJobItemSchema>;

export const adminJobAttemptItemSchema = z.object({
  attemptNumber: z.number().int().positive(),
  completedAt: z.string().datetime().nullable(),
  errorCode: z.string().nullable(),
  errorSummary: z.string().nullable(),
  outcome: z.enum(['RUNNING', 'SUCCEEDED', 'FAILED']),
  providerModel: z.string().nullable(),
  providerName: z.string().nullable(),
  startedAt: z.string().datetime(),
});
export type AdminJobAttemptItemDto = z.infer<typeof adminJobAttemptItemSchema>;

export const adminJobDetailSchema = adminJobItemSchema.extend({
  attempts: z.array(adminJobAttemptItemSchema),
  payloadSummary: z.record(z.string(), z.unknown()),
});
export type AdminJobDetailDto = z.infer<typeof adminJobDetailSchema>;

export const adminJobPageSchema = z.object({
  items: z.array(adminJobItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type AdminJobPageDto = z.infer<typeof adminJobPageSchema>;

export const adminOperationsSummarySchema = z.object({
  activeWorkers: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  jobTypeBreakdown: z.record(
    z.string(),
    z.object({
      completed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      pending: z.number().int().nonnegative(),
      running: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    }),
  ),
  queueDepth: z.number().int().nonnegative(),
  runningCount: z.number().int().nonnegative(),
  workerConfig: z.object({
    leaseMs: z.number().int().positive(),
    pollIntervalMs: z.number().int().positive(),
    workerEnabled: z.boolean(),
  }),
});
export type AdminOperationsSummaryDto = z.infer<typeof adminOperationsSummarySchema>;

export const adminOperationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: adminJobStatusSchema.optional(),
  type: z.string().optional(),
});
export type AdminOperationsQueryDto = z.infer<typeof adminOperationsQuerySchema>;
