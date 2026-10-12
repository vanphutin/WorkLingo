import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'RATE_LIMIT_METADATA_KEY';

export type RateLimitKeyType =
  | 'IP'
  | 'IP_AND_ROUTE'
  | 'USER'
  | 'USER_AND_OPERATION';

export interface RateLimitOptions {
  keyType?: RateLimitKeyType;
  limit: number;
  scope: string;
  windowSeconds: number;
}

export const RateLimit = (options: RateLimitOptions): CustomDecorator<string> =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
