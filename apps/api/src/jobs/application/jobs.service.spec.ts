import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../common/database/prisma.service.js';
import { JobsService } from './jobs.service.js';

describe('JobsService provider retry defaults', () => {
  it('uses the configured provider max attempts unless enqueue explicitly overrides it', async () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve({
      id: 'job-id', status: 'PENDING', type: data.type,
    }));
    const service = new JobsService(
      { job: { create } } as unknown as PrismaService,
      { maxAttempts: 5 },
    );
    const base = {
      createdById: 'actor-id', idempotencyKey: 'evaluate:attempt-id', payload: {},
      resourceId: 'attempt-id', resourceType: 'ActivityAttempt', type: 'EVALUATE_ATTEMPT',
    };

    await service.enqueue(base);
    await service.enqueue({ ...base, idempotencyKey: 'evaluate:second', maxAttempts: 2 });

    expect(create.mock.calls[0]?.[0].data.maxAttempts).toBe(5);
    expect(create.mock.calls[1]?.[0].data.maxAttempts).toBe(2);
  });

  it('does not expose a job that is not owned by the requesting actor', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new JobsService(
      { job: { findFirst } } as unknown as PrismaService,
      { maxAttempts: 3 },
    );

    await expect(service.getJob('job-id', 'different-actor')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { createdById: 'different-actor', id: 'job-id' },
    });
  });

  it('does not retry a job that is not owned by the requesting actor', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const transaction = { job: { findFirst } };
    const database = {
      $transaction: vi.fn((callback) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new JobsService(database, { maxAttempts: 3 });

    await expect(service.retryJob('job-id', 'different-actor')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { createdById: 'different-actor', id: 'job-id' },
    });
  });
});
