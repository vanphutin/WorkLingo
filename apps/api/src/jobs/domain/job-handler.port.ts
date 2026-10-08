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
