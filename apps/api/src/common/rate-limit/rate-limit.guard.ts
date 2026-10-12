import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import {
  RATE_LIMIT_METADATA_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator.js';
import { RateLimitService } from './rate-limit.service.js';

interface RequestWithAuthUser extends Request {
  authUser?: {
    id: string;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithAuthUser>();
    const res = http.getResponse<Response>();

    const clientAddress = this.rateLimitService.extractClientAddress(req);
    let subject: string;

    switch (options.keyType) {
      case 'IP':
        subject = clientAddress;
        break;
      case 'IP_AND_ROUTE':
        subject = `${clientAddress}:${req.method}:${req.baseUrl || req.path || req.url}`;
        break;
      case 'USER':
        subject = req.authUser?.id ?? clientAddress;
        break;
      case 'USER_AND_OPERATION':
        subject = `${req.authUser?.id ?? clientAddress}:${options.scope}`;
        break;
      default:
        subject = `${clientAddress}:${options.scope}`;
        break;
    }

    const subjectHash = this.rateLimitService.hashSubject(subject);
    const result = await this.rateLimitService.consume({
      limit: options.limit,
      scope: options.scope,
      subjectHash,
      windowSeconds: options.windowSeconds,
    });

    if (!res.headersSent) {
      res.setHeader('RateLimit-Limit', String(result.limit));
      res.setHeader('RateLimit-Remaining', String(result.remaining));
      res.setHeader(
        'RateLimit-Reset',
        String(Math.ceil(result.resetAt.getTime() / 1000)),
      );
    }

    if (!result.allowed) {
      if (!res.headersSent) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
