import { describe, expect, it } from 'vitest';
import {
  adminJobDetailSchema,
  adminJobPageSchema,
  adminOperationsQuerySchema,
  adminOperationsSummarySchema,
} from './admin-operations.contracts.js';

describe('Admin Operations Contracts', () => {
  it('validates admin operations summary', () => {
    const valid = {
      activeWorkers: 1,
      completedCount: 42,
      failedCount: 2,
      jobTypeBreakdown: {
        AUDIO_GENERATION: {
          completed: 40,
          failed: 1,
          pending: 3,
          running: 1,
          total: 45,
        },
      },
      queueDepth: 4,
      runningCount: 1,
      workerConfig: {
        leaseMs: 30000,
        pollIntervalMs: 5000,
        workerEnabled: true,
      },
    };
    expect(adminOperationsSummarySchema.parse(valid)).toEqual(valid);
  });

  it('validates admin job page DTO', () => {
    const page = {
      items: [
        {
          attemptCount: 1,
          availableAt: '2026-10-12T00:00:00.000Z',
          completedAt: null,
          createdAt: '2026-10-12T00:00:00.000Z',
          errorCode: null,
          errorSummary: null,
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          leaseOwner: 'worker-1',
          maxAttempts: 3,
          resourceId: null,
          resourceType: null,
          retryable: true,
          status: 'RUNNING',
          type: 'AUDIO_GENERATION',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    };
    expect(adminJobPageSchema.parse(page)).toEqual(page);
  });

  it('validates admin job detail DTO', () => {
    const detail = {
      attemptCount: 2,
      attempts: [
        {
          attemptNumber: 1,
          completedAt: '2026-10-12T00:01:00.000Z',
          errorCode: 'PROVIDER_TIMEOUT',
          errorSummary: 'Request timed out after 30s',
          outcome: 'FAILED',
          providerModel: 'tts-1',
          providerName: 'azure-speech',
          startedAt: '2026-10-12T00:00:00.000Z',
        },
      ],
      availableAt: '2026-10-12T00:02:00.000Z',
      completedAt: null,
      createdAt: '2026-10-12T00:00:00.000Z',
      errorCode: 'PROVIDER_TIMEOUT',
      errorSummary: 'Request timed out after 30s',
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      leaseOwner: null,
      maxAttempts: 3,
      payloadSummary: { scriptSlug: 'intro-meeting' },
      resourceId: null,
      resourceType: null,
      retryable: true,
      status: 'RETRY_WAIT',
      type: 'AUDIO_GENERATION',
    };
    expect(adminJobDetailSchema.parse(detail)).toEqual(detail);
  });

  it('validates and applies defaults for operations query', () => {
    const parsed = adminOperationsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
    expect(parsed.status).toBeUndefined();
    expect(parsed.type).toBeUndefined();
  });
});
