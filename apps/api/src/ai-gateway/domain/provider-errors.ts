export type ProviderErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_UPSTREAM'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'PROVIDER_REFUSED'
  | 'PROVIDER_AUTH_FAILED'
  | 'INVALID_AUDIO';

export interface ProviderErrorOptions {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;

  constructor(message: string, options: ProviderErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'ProviderError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs;
  }
}
