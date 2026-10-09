import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

import { ProviderError } from '../../ai-gateway/domain/provider-errors.js';
import type { JobHandler } from '../domain/job-handler.port.js';
import { JobsService } from './jobs.service.js';

const MAX_BACKOFF_MS = 60_000;
const TRANSIENT_CODES = new Set([
  'PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UPSTREAM',
]);
const SINGLE_RETRY_CODES = new Set(['PROVIDER_RESPONSE_INVALID', 'PROVIDER_REFUSED']);
const MANUAL_RETRY_CODES = new Set([
  ...TRANSIENT_CODES,
  ...SINGLE_RETRY_CODES,
  'LEASE_EXPIRED',
]);

export interface JobRetryInput {
  readonly attemptNumber: number;
  readonly code: string;
  readonly maxAttempts: number;
  readonly now: Date;
  readonly random: () => number;
  readonly retryAfterMs?: number;
}

export type JobRetryDecision =
  | { readonly retry: false }
  | { readonly retry: true; readonly availableAt: Date };

export const decideJobRetry = (input: JobRetryInput): JobRetryDecision => {
  if (input.attemptNumber >= input.maxAttempts) return { retry: false };
  const transient = TRANSIENT_CODES.has(input.code);
  const singleRetry = SINGLE_RETRY_CODES.has(input.code) && input.attemptNumber === 1;
  if (!transient && !singleRetry) return { retry: false };

  const exponentialMs = Math.min(MAX_BACKOFF_MS, 1_000 * (2 ** (input.attemptNumber - 1)));
  const jitteredMs = Math.round(exponentialMs * (0.8 + input.random() * 0.4));
  const delayMs = Math.min(
    MAX_BACKOFF_MS,
    Math.max(jitteredMs, input.retryAfterMs ?? 0),
  );
  return { retry: true, availableAt: new Date(input.now.getTime() + delayMs) };
};

const safeErrorSummary = (code: string): string => ({
  PROVIDER_TIMEOUT: 'Provider request timed out.',
  PROVIDER_RATE_LIMITED: 'Provider rate limit was reached.',
  PROVIDER_UPSTREAM: 'Provider service is temporarily unavailable.',
  PROVIDER_RESPONSE_INVALID: 'Provider returned an invalid response.',
  PROVIDER_REFUSED: 'Provider refused the evaluation.',
  PROVIDER_AUTH_FAILED: 'Provider credentials were rejected.',
  INVALID_AUDIO: 'Recording does not contain supported recognizable audio.',
  RECORDING_CONSENT_REQUIRED: 'Recording consent is required.',
  RECORDING_EXPIRED: 'Recording is no longer available.',
  UNKNOWN_JOB_TYPE: 'No handler is registered for this job type.',
  JOB_HANDLER_FAILED: 'Background processing failed.',
})[code] ?? 'Background processing failed.';

@Injectable()
export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`A handler is already registered for ${handler.type}`);
    }
    this.handlers.set(handler.type, handler);
  }

  resolve(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }
}

export interface JobRunnerOptions {
  readonly enabled: boolean;
  readonly leaseMs: number;
  readonly pollIntervalMs: number;
  readonly workerId: string;
}

export const JOB_RUNNER_OPTIONS = Symbol('JOB_RUNNER_OPTIONS');

@Injectable()
export class JobRunnerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JobRunnerService.name);
  private pollActive = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(JobHandlerRegistry) private readonly handlers: JobHandlerRegistry,
    @Inject(JOB_RUNNER_OPTIONS) private readonly options: JobRunnerOptions,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.options.enabled || this.timer) return;
    this.timer = setInterval(() => void this.poll(), this.options.pollIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(now = new Date()): Promise<boolean> {
    const job = await this.jobs.claimNext(this.options.workerId, now, this.options.leaseMs);
    if (!job) return false;

    const handler = this.handlers.resolve(job.type);
    if (!handler) {
      await this.jobs.failClaim({
        attemptNumber: job.attemptNumber,
        code: 'UNKNOWN_JOB_TYPE',
        errorSummary: safeErrorSummary('UNKNOWN_JOB_TYPE'),
        jobId: job.id,
        manuallyRetryable: false,
        retry: false,
        workerId: this.options.workerId,
      });
      return true;
    }

    try {
      const result = await handler.handle(job);
      await this.jobs.completeClaim({
        attemptNumber: job.attemptNumber,
        jobId: job.id,
        result,
        workerId: this.options.workerId,
      });
    } catch (error) {
      const code = error instanceof ProviderError ? error.code : 'JOB_HANDLER_FAILED';
      const retry = error instanceof ProviderError && error.retryable
        ? decideJobRetry({
            attemptNumber: job.attemptNumber,
            code,
            maxAttempts: job.maxAttempts,
            now,
            random: Math.random,
            ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }),
          })
        : { retry: false } as const;
      await this.jobs.failClaim({
        attemptNumber: job.attemptNumber,
        code,
        errorSummary: safeErrorSummary(code),
        jobId: job.id,
        manuallyRetryable: error instanceof ProviderError
          && error.retryable
          && MANUAL_RETRY_CODES.has(code),
        retry: retry.retry,
        workerId: this.options.workerId,
        ...(retry.retry ? { availableAt: retry.availableAt } : {}),
      });
      this.logger.warn(`Job ${job.id} failed with safe code ${code}.`);
    }
    return true;
  }

  private async poll(): Promise<void> {
    if (this.pollActive) return;
    this.pollActive = true;
    try {
      await this.runOnce();
    } catch {
      this.logger.error('Job worker poll failed with an internal error.');
    } finally {
      this.pollActive = false;
    }
  }
}

export const createJobRunnerOptions = (
  options: Omit<JobRunnerOptions, 'workerId'>,
): JobRunnerOptions => ({ ...options, workerId: `local-${process.pid}-${randomUUID()}` });
