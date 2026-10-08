import type { PrismaService } from '../../common/database/prisma.service.js';
import { describe, expect, it, vi } from 'vitest';

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
});
