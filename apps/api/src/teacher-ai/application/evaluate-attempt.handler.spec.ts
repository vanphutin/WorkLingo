import type { PrismaService } from '../../common/database/prisma.service.js';
import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import type { EvaluationService } from './evaluation.service.js';
import { EvaluateAttemptHandler } from './evaluate-attempt.handler.js';

describe('EvaluateAttemptHandler', () => {
  it('does not regress an already evaluated attempt when a lease retry finds the result', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const database = { activityAttempt: { updateMany } } as unknown as PrismaService;
    const evaluations = {
      evaluateAttempt: vi.fn().mockResolvedValue({ id: 'result-id', score: 0.8 }),
    } as unknown as EvaluationService;
    const handler = new EvaluateAttemptHandler(database, evaluations);

    await expect(handler.handle({
      attemptNumber: 2,
      id: 'job-id',
      maxAttempts: 3,
      payload: { attemptId: 'attempt-id' },
      type: 'EVALUATE_ATTEMPT',
    })).resolves.toEqual({ attemptId: 'attempt-id', evaluationResultId: 'result-id', score: 0.8 });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'attempt-id', evaluationStatus: { not: 'EVALUATED' } },
      data: { evaluationStatus: 'PROCESSING' },
    });
  });

  it('returns a retryable attempt to queued until the durable job reaches its last attempt', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const handler = new EvaluateAttemptHandler(
      { activityAttempt: { updateMany } } as unknown as PrismaService,
      { evaluateAttempt: vi.fn().mockRejectedValue(new ProviderError('limited', {
        code: 'PROVIDER_RATE_LIMITED', retryable: true,
      })) } as unknown as EvaluationService,
    );

    await expect(handler.handle({
      attemptNumber: 1, id: 'job-id', maxAttempts: 3,
      payload: { attemptId: 'attempt-id' }, type: 'EVALUATE_ATTEMPT',
    })).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMITED' });
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'attempt-id', evaluationStatus: { not: 'EVALUATED' } },
      data: { evaluationStatus: 'QUEUED' },
    });
  });

  it('marks the attempt failed when the provider error is terminal for the durable job', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T00:00:00.000Z'));
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const updateRecording = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      activityAttempt: { updateMany },
      recording: { updateMany: updateRecording },
    };
    const handler = new EvaluateAttemptHandler(
      {
        activityAttempt: { updateMany },
        $transaction: vi.fn((work) => work(transaction)),
      } as unknown as PrismaService,
      { evaluateAttempt: vi.fn().mockRejectedValue(new ProviderError('limited', {
        code: 'PROVIDER_RATE_LIMITED', retryable: true,
      })) } as unknown as EvaluationService,
      { recordingRetentionDays: 7 },
    );

    await expect(handler.handle({
      attemptNumber: 3, id: 'job-id', maxAttempts: 3,
      payload: { attemptId: 'attempt-id' }, type: 'EVALUATE_ATTEMPT',
    })).rejects.toMatchObject({ code: 'PROVIDER_RATE_LIMITED' });
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'attempt-id', evaluationStatus: { not: 'EVALUATED' } },
      data: { evaluationStatus: 'EVALUATION_FAILED' },
    });
    expect(updateRecording).toHaveBeenCalledWith({
      where: { attemptId: 'attempt-id', retentionUntil: null },
      data: { retentionUntil: new Date('2026-10-15T00:00:00.000Z') },
    });
    vi.useRealTimers();
  });
});
