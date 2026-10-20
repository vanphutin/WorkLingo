export interface ClaimedJob {
  readonly attemptNumber: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly type: string;
}

export interface JobHandler {
  readonly type: string;
  handle(job: ClaimedJob): Promise<Readonly<Record<string, unknown>>>;
}

/** Retryable local infrastructure failure; contains no storage path or learner data. */
export class RetryableJobError extends Error { readonly code='STORAGE_CLEANUP_FAILED'; }
