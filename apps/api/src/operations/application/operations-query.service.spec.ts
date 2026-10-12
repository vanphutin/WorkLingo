import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../common/config/app-config.schema.js';
import { OperationsQueryService } from './operations-query.service.js';

describe('OperationsQueryService', () => {
  let prismaMock: {
    job: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
  };

  let configMock: {
    get: ReturnType<typeof vi.fn>;
  };

  let service: OperationsQueryService;

  beforeEach(() => {
    prismaMock = {
      job: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        groupBy: vi.fn(),
      },
    };

    configMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'jobs') {
          return {
            leaseMs: 30000,
            pollIntervalMs: 5000,
            workerEnabled: true,
          };
        }
        return undefined;
      }),
    };

    service = new OperationsQueryService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService<AppConfig, true>,
    );
  });

  describe('getSummary', () => {
    it('aggregates job counts, breakdown, active workers, and config', async () => {
      prismaMock.job.groupBy.mockResolvedValueOnce([
        { _count: { id: 5 }, status: 'PENDING', type: 'AUDIO_GENERATION' },
        { _count: { id: 2 }, status: 'RUNNING', type: 'AUDIO_GENERATION' },
        { _count: { id: 1 }, status: 'FAILED', type: 'AUDIO_GENERATION' },
        { _count: { id: 20 }, status: 'COMPLETED', type: 'AUDIO_GENERATION' },
        { _count: { id: 3 }, status: 'COMPLETED', type: 'EVALUATE_ATTEMPT' },
      ]);

      prismaMock.job.findMany.mockResolvedValueOnce([
        { leaseOwner: 'worker-node-1' },
      ]);

      const summary = await service.getSummary();

      expect(summary.queueDepth).toBe(7); // 5 pending + 2 running
      expect(summary.runningCount).toBe(2);
      expect(summary.failedCount).toBe(1);
      expect(summary.completedCount).toBe(23);
      expect(summary.activeWorkers).toBe(1);
      expect(summary.workerConfig).toEqual({
        leaseMs: 30000,
        pollIntervalMs: 5000,
        workerEnabled: true,
      });
      expect(summary.jobTypeBreakdown.AUDIO_GENERATION).toEqual({
        completed: 20,
        failed: 1,
        pending: 5,
        running: 2,
        total: 28,
      });
      expect(summary.jobTypeBreakdown.EVALUATE_ATTEMPT).toEqual({
        completed: 3,
        failed: 0,
        pending: 0,
        running: 0,
        total: 3,
      });
    });
  });

  describe('listJobs', () => {
    it('paginates and formats job items', async () => {
      prismaMock.job.count.mockResolvedValueOnce(1);
      prismaMock.job.findMany.mockResolvedValueOnce([
        {
          attemptCount: 1,
          availableAt: new Date('2026-10-12T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-10-12T00:00:00.000Z'),
          errorCode: null,
          errorSummary: null,
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          leaseOwner: 'worker-1',
          maxAttempts: 3,
          resourceId: 'res-1',
          resourceType: 'AudioArtifact',
          retryable: true,
          status: 'RUNNING',
          type: 'AUDIO_GENERATION',
        },
      ]);

      const result = await service.listJobs({ page: 1, pageSize: 10 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items[0]?.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(result.items[0]?.status).toBe('RUNNING');
    });

    it('normalizes numeric query strings at the service boundary', async () => {
      prismaMock.job.count.mockResolvedValueOnce(0);
      prismaMock.job.findMany.mockResolvedValueOnce([]);

      const result = await service.listJobs({
        page: '2',
        pageSize: '20',
      } as unknown as { page: number; pageSize: number });

      expect(result).toMatchObject({ page: 2, pageSize: 20 });
      expect(prismaMock.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
    });
  });

  describe('getJobDetail', () => {
    it('throws NotFoundException when job does not exist', async () => {
      prismaMock.job.findUnique.mockResolvedValueOnce(null);

      await expect(service.getJobDetail('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns scrubbed job detail without leaking sensitive payload data', async () => {
      prismaMock.job.findUnique.mockResolvedValueOnce({
        attemptCount: 1,
        attempts: [
          {
            attemptNumber: 1,
            completedAt: new Date('2026-10-12T00:01:00.000Z'),
            errorCode: 'PROVIDER_TIMEOUT',
            errorSummary: 'Request timed out after 30s',
            outcome: 'FAILED',
            providerModel: 'azure-neural',
            providerName: 'azure-speech',
            startedAt: new Date('2026-10-12T00:00:00.000Z'),
          },
        ],
        availableAt: new Date('2026-10-12T00:00:00.000Z'),
        completedAt: null,
        createdAt: new Date('2026-10-12T00:00:00.000Z'),
        errorCode: 'PROVIDER_TIMEOUT',
        errorSummary: 'Request timed out after 30s',
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        leaseOwner: null,
        maxAttempts: 3,
        payload: {
          activityId: 'act-123',
          audioScriptSlug: 'greeting-dialogue',
          contentImportId: 'imp-456',
          learnerText: 'Sensitive learner secret answer text',
          recordingSecretToken: 'tok_secret_999',
        },
        resourceId: 'res-1',
        resourceType: 'AudioArtifact',
        retryable: true,
        status: 'RETRY_WAIT',
        type: 'AUDIO_GENERATION',
      });

      const detail = await service.getJobDetail(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      );

      expect(detail.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(detail.attempts).toHaveLength(1);
      // Verify safe metadata is kept
      expect(detail.payloadSummary).toEqual({
        activityId: 'act-123',
        audioScriptSlug: 'greeting-dialogue',
        contentImportId: 'imp-456',
      });
      // Verify sensitive text and token are scrubbed out
      expect(detail.payloadSummary).not.toHaveProperty('learnerText');
      expect(detail.payloadSummary).not.toHaveProperty('recordingSecretToken');
    });
  });
});
