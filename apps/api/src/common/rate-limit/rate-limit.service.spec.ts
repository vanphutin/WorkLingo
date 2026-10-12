import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/app-config.schema.js';
import { RateLimitService } from './rate-limit.service.js';
import type { Request } from 'express';

describe('RateLimitService', () => {
  let prismaMock: {
    rateLimitBucket: {
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  let configMock: {
    get: ReturnType<typeof vi.fn>;
  };

  let service: RateLimitService;

  beforeEach(() => {
    prismaMock = {
      rateLimitBucket: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    configMock = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'rateLimit') {
          return {
            hashKey: 'test-rate-limit-hash-key-secret-1234',
            trustProxyHops: 0,
          };
        }
        return undefined;
      }),
    };

    service = new RateLimitService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService<AppConfig, true>,
    );
  });

  it('hashes subject using HMAC-SHA256 deterministically without exposing raw subject', () => {
    const rawIp = '192.168.1.100';
    const hash1 = service.hashSubject(rawIp);
    const hash2 = service.hashSubject(rawIp);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
    expect(hash1).not.toContain(rawIp);
  });

  it('extracts socket remoteAddress when trustProxyHops is 0 and ignores X-Forwarded-For', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
      },
      socket: {
        remoteAddress: '10.0.0.1',
      },
    } as unknown as Request;

    const address = service.extractClientAddress(req);
    expect(address).toBe('10.0.0.1');
  });

  it('extracts trusted hop from X-Forwarded-For when trustProxyHops > 0', () => {
    configMock.get.mockReturnValue({
      hashKey: 'test-rate-limit-hash-key-secret-1234',
      trustProxyHops: 1,
    });
    const customService = new RateLimitService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService<AppConfig, true>,
    );

    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
      },
      socket: {
        remoteAddress: '10.0.0.1',
      },
    } as unknown as Request;

    const address = customService.extractClientAddress(req);
    // 1 hop behind proxy -> 70.41.3.18
    expect(address).toBe('70.41.3.18');
  });

  it('allows consumption within limit and returns remaining tokens', async () => {
    prismaMock.rateLimitBucket.upsert.mockResolvedValue({
      consumed: 3,
      id: 'uuid-1',
      scope: 'auth:login',
      subjectHash: 'hash-abc',
      windowStart: new Date(),
    });

    const result = await service.consume({
      limit: 5,
      scope: 'auth:login',
      subjectHash: 'hash-abc',
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('rejects consumption when limit is exceeded and provides bounded retryAfterSeconds', async () => {
    prismaMock.rateLimitBucket.upsert.mockResolvedValue({
      consumed: 6,
      id: 'uuid-1',
      scope: 'auth:login',
      subjectHash: 'hash-abc',
      windowStart: new Date(),
    });

    const result = await service.consume({
      limit: 5,
      scope: 'auth:login',
      subjectHash: 'hash-abc',
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});
