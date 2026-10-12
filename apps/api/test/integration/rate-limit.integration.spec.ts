import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('Durable PostgreSQL Rate Limiting HTTP Integration', () => {
  let app: INestApplication;
  let database: PrismaClient;
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('rate_limit');
    app = context.app;
    database = context.database;
  }, 45_000);

  beforeEach(async () => {
    await context.resetLearners();
  });

  afterAll(async () => {
    await context?.close();
  });

  it('enforces limit and returns 429 with RATE_LIMIT_EXCEEDED, Retry-After and correlation ID', async () => {
    // Send 30 requests to exhaust login limit (limit: 30)
    for (let i = 0; i < 30; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `attempt-${i}@example.com`, password: 'any-password-value' });
      expect(res.status).toBe(401);
      expect(res.headers['ratelimit-limit']).toBe('30');
      expect(Number(res.headers['ratelimit-remaining'])).toBe(30 - (i + 1));
    }

    // 31st request must be rate limited with 429
    const blocked = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-correlation-id', 'test-blocked-corr-id')
      .send({ email: 'blocked@example.com', password: 'any-password-value' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      correlationId: 'test-blocked-corr-id',
      statusCode: 429,
    });
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(blocked.headers['x-correlation-id']).toBe('test-blocked-corr-id');
  });

  it('isolates rate limit scopes across different routes', async () => {
    // Exhaust login limit
    for (let i = 0; i < 30; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `attempt-${i}@example.com`, password: 'any-password-value' });
    }

    // Login is now blocked
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'blocked@example.com', password: 'any-password-value' });
    expect(loginRes.status).toBe(429);

    // Register route (different scope) is NOT blocked
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Unblocked Learner',
        email: 'unblocked@example.com',
        password: 'a-secure-local-password',
      });
    expect(registerRes.status).toBe(201);
  });

  it('stores hashed subjects in PostgreSQL without persisting raw IP addresses or credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'audit-privacy@example.com', password: 'any-password-value' });

    const buckets = await database.rateLimitBucket.findMany();
    expect(buckets.length).toBeGreaterThan(0);

    for (const bucket of buckets) {
      expect(bucket.subjectHash).toHaveLength(64); // SHA-256 hex string
      expect(bucket.subjectHash).not.toContain('127.0.0.1');
      expect(bucket.subjectHash).not.toContain('audit-privacy@example.com');
      expect(bucket.consumed).toBeGreaterThan(0);
    }
  });

  it('handles concurrent requests atomically without lost updates or race conditions', async () => {
    // Fire 10 concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: `concurrent-${i}@example.com`, password: 'any-password-value' }),
    );

    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.status).toBe(401);
    }

    const bucket = await database.rateLimitBucket.findFirstOrThrow({
      where: { scope: 'auth:login' },
    });
    expect(bucket.consumed).toBe(10);
  });
});
