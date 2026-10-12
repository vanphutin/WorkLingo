import { randomUUID } from 'node:crypto';
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/u;

export function getCorrelationId(req: Request): string {
  return req.correlationId ?? (req.headers['x-correlation-id'] as string) ?? '';
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawInbound =
      req.headers['x-correlation-id'] ?? req.headers['x-request-id'];

    let validId: string;
    if (
      typeof rawInbound === 'string' &&
      VALID_ID_PATTERN.test(rawInbound.trim())
    ) {
      validId = rawInbound.trim();
    } else {
      validId = randomUUID();
    }

    req.correlationId = validId;
    res.setHeader('X-Correlation-ID', validId);

    next();
  }
}
