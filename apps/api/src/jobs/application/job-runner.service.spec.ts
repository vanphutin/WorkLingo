import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import type { JobsService } from './jobs.service.js';
import {
  JobHandlerRegistry,
  JobRunnerService,
  decideJobRetry,
} from './job-runner.service.js';

const claimedJob = {
  id: '6bbcd9d9-06e2-4d98-991d-aa3d3546834c',
  type: 'TEST_JOB',
  payload: { resourceId: 'safe-id' },
  attemptNumber: 1,
  maxAttempts: 3,
} as const;

describe('decideJobRetry', () => {
  it.each([
    ['PROVIDER_TIMEOUT'],
    ['PROVIDER_RATE_LIMITED'],
    ['PROVIDER_UPSTREAM'],
  ] as const)('backs off retryable provider failure %s within bounds', (code) => {
    const decision = decideJobRetry({
      attemptNumber: 1,
      code,
      maxAttempts: 3,
      now: new Date('2026-10-08T00:00:00.000Z'),
      random: () => 0.5,
    });

    expect(decision).toEqual({
      retry: true,
      availableAt: new Date('2026-10-08T00:00:01.000Z'),
    });
  });

  it('honors a bounded rate-limit hint and stops at maximum attempts', () => {
    expect(decideJobRetry({
      attemptNumber: 1,
      code: 'PROVIDER_RATE_LIMITED',
      maxAttempts: 3,
      now: new Date('2026-10-08T00:00:00.000Z'),
      random: () => 0.5,
      retryAfterMs: 5_000,
    })).toEqual({ retry: true, availableAt: new Date('2026-10-08T00:00:05.000Z') });

    expect(decideJobRetry({
      attemptNumber: 3,
      code: 'PROVIDER_TIMEOUT',
      maxAttempts: 3,
      now: new Date('2026-10-08T00:00:00.000Z'),
      random: () => 0.5,
    })).toEqual({ retry: false });
  });

  it.each([
    ['PROVIDER_RESPONSE_INVALID'],
    ['PROVIDER_REFUSED'],
  ] as const)('retries malformed/refused output only once: %s', (code) => {
    const base = {
      code,
      maxAttempts: 3,
      now: new Date('2026-10-08T00:00:00.000Z'),
      random: () => 0.5,
    } as const;

    expect(decideJobRetry({ ...base, attemptNumber: 1 }).retry).toBe(true);
    expect(decideJobRetry({ ...base, attemptNumber: 2 })).toEqual({ retry: false });
  });

  it.each([
    ['PROVIDER_AUTH_FAILED'],
    ['INVALID_AUDIO'],
    ['RECORDING_CONSENT_REQUIRED'],
    ['RECORDING_EXPIRED'],
  ] as const)('does not automatically retry terminal failure %s', (code) => {
    expect(decideJobRetry({
      attemptNumber: 1,
      code,
      maxAttempts: 3,
      now: new Date('2026-10-08T00:00:00.000Z'),
      random: () => 0.5,
    })).toEqual({ retry: false });
  });
});

describe('JobRunnerService', () => {
  it('claims, dispatches, and completes a registered job', async () => {
    const jobs = {
      claimNext: vi.fn().mockResolvedValue(claimedJob),
      completeClaim: vi.fn().mockResolvedValue(true),
      failClaim: vi.fn(),
    } as unknown as JobsService;
    const registry = new JobHandlerRegistry();
    const handler = { type: 'TEST_JOB', handle: vi.fn().mockResolvedValue({ ok: true }) };
    registry.register(handler);
    const runner = new JobRunnerService(jobs, registry, {
      enabled: false, leaseMs: 30_000, pollIntervalMs: 1_000, workerId: 'worker-test',
    });

    await expect(runner.runOnce(new Date('2026-10-08T00:00:00.000Z'))).resolves.toBe(true);
    expect(handler.handle).toHaveBeenCalledWith(claimedJob);
    expect(jobs.completeClaim).toHaveBeenCalledWith({
      attemptNumber: 1,
      jobId: claimedJob.id,
      result: { ok: true },
      workerId: 'worker-test',
    });
  });

  it('persists only a safe code and summary for provider failure', async () => {
    const jobs = {
      claimNext: vi.fn().mockResolvedValue(claimedJob),
      completeClaim: vi.fn(),
      failClaim: vi.fn().mockResolvedValue(true),
    } as unknown as JobsService;
    const registry = new JobHandlerRegistry();
    registry.register({
      type: 'TEST_JOB',
      handle: vi.fn().mockRejectedValue(new ProviderError(
        'upstream included secret-key and learner response',
        { code: 'PROVIDER_TIMEOUT', retryable: true },
      )),
    });
    const runner = new JobRunnerService(jobs, registry, {
      enabled: false, leaseMs: 30_000, pollIntervalMs: 1_000, workerId: 'worker-test',
    });

    await runner.runOnce(new Date('2026-10-08T00:00:00.000Z'));

    expect(jobs.failClaim).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PROVIDER_TIMEOUT',
      errorSummary: 'Provider request timed out.',
      jobId: claimedJob.id,
      manuallyRetryable: true,
      retry: true,
      workerId: 'worker-test',
    }));
    expect(JSON.stringify(vi.mocked(jobs.failClaim).mock.calls)).not.toContain('secret-key');
    expect(JSON.stringify(vi.mocked(jobs.failClaim).mock.calls)).not.toContain('learner response');
  });

  it('fails an unknown job type without retrying', async () => {
    const jobs = {
      claimNext: vi.fn().mockResolvedValue({ ...claimedJob, type: 'UNKNOWN' }),
      completeClaim: vi.fn(),
      failClaim: vi.fn().mockResolvedValue(true),
    } as unknown as JobsService;
    const runner = new JobRunnerService(jobs, new JobHandlerRegistry(), {
      enabled: false, leaseMs: 30_000, pollIntervalMs: 1_000, workerId: 'worker-test',
    });

    await runner.runOnce(new Date('2026-10-08T00:00:00.000Z'));

    expect(jobs.failClaim).toHaveBeenCalledWith(expect.objectContaining({
      code: 'UNKNOWN_JOB_TYPE', manuallyRetryable: false, retry: false,
    }));
  });

  it('returns false when there is no claimable work', async () => {
    const jobs = { claimNext: vi.fn().mockResolvedValue(null) } as unknown as JobsService;
    const runner = new JobRunnerService(jobs, new JobHandlerRegistry(), {
      enabled: false, leaseMs: 30_000, pollIntervalMs: 1_000, workerId: 'worker-test',
    });

    await expect(runner.runOnce()).resolves.toBe(false);
  });
});
