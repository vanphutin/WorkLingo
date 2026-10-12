import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { AppConfig } from '../config/app-config.schema.js';
import { PrismaService } from '../database/prisma.service.js';

export interface ConsumeInput {
  readonly limit: number;
  readonly scope: string;
  readonly subjectHash: string;
  readonly windowSeconds: number;
}

export interface ConsumeResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: Date;
  readonly retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly hashKey: string;
  private readonly trustProxyHops: number;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    configService: ConfigService<AppConfig, true>,
  ) {
    const rateLimitConfig = configService.get('rateLimit', { infer: true });
    this.hashKey = rateLimitConfig.hashKey;
    this.trustProxyHops = rateLimitConfig.trustProxyHops;
  }

  hashSubject(rawSubject: string): string {
    return createHmac('sha256', this.hashKey).update(rawSubject).digest('hex');
  }

  extractClientAddress(req: Request): string {
    if (this.trustProxyHops > 0) {
      const xff = req.headers['x-forwarded-for'];
      if (typeof xff === 'string') {
        const hops = xff
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean);
        if (hops.length >= this.trustProxyHops) {
          const hop = hops[hops.length - this.trustProxyHops];
          if (hop) return hop;
        }
      }
    }

    return req.socket.remoteAddress ?? '127.0.0.1';
  }

  async consume(input: ConsumeInput): Promise<ConsumeResult> {
    const nowMs = Date.now();
    const nowSeconds = Math.floor(nowMs / 1000);
    const windowStartSeconds =
      Math.floor(nowSeconds / input.windowSeconds) * input.windowSeconds;
    const windowStartDate = new Date(windowStartSeconds * 1000);
    const resetAt = new Date((windowStartSeconds + input.windowSeconds) * 1000);

    const bucket = await this.prisma.rateLimitBucket.upsert({
      create: {
        consumed: 1,
        scope: input.scope,
        subjectHash: input.subjectHash,
        windowStart: windowStartDate,
      },
      update: {
        consumed: { increment: 1 },
      },
      where: {
        scope_subjectHash_windowStart: {
          scope: input.scope,
          subjectHash: input.subjectHash,
          windowStart: windowStartDate,
        },
      },
    });

    const isAllowed = bucket.consumed <= input.limit;
    const remaining = isAllowed ? input.limit - bucket.consumed : 0;
    const retryAfterSeconds = isAllowed
      ? 0
      : Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / 1000));

    return {
      allowed: isAllowed,
      limit: input.limit,
      remaining,
      resetAt,
      retryAfterSeconds,
    };
  }
}
