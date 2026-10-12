import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { PilotMetricsService } from '../../src/analytics/application/pilot-metrics.service.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('privacy-safe pilot analytics HTTP integration', () => {
  const schemaName = `pilot_analytics_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL
    ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDatabase = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;
  let adminCookies: string[];
  let learnerCookies: string[];

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: url.toString() },
      timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new PrismaService({ datasourceUrl: url.toString() }))
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }));
    await app.init();
    database = new PrismaClient({ datasourceUrl: url.toString() });

    const adminEmail = `analytics-admin-${randomUUID()}@example.com`;
    const adminPassword = 'AdminSecret123!';
    await seedContentAdmin(database, {
      displayName: 'Analytics Admin',
      email: adminEmail,
      password: adminPassword,
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    adminCookies = (login.headers['set-cookie'] ?? []) as string[];

    const learner = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Analytics Learner',
        email: `analytics-learner-${randomUUID()}@example.com`,
        password: 'Password123!',
      });
    learnerCookies = (learner.headers['set-cookie'] ?? []) as string[];

    const metrics = app.get(PilotMetricsService);
    const input = {
      dimensions: { durationBucket: '60' as const, outcome: 'completed' as const },
      eventType: 'LEARNING_SESSION_COMPLETED' as const,
      occurredAt: new Date('2026-10-12T09:00:00.000Z'),
      sourceKey: 'session:integration-analytics:completed',
    };
    await metrics.record(input);
    await metrics.record(input);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDatabase.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await adminDatabase.$disconnect();
  });

  it('enforces Admin authorization before returning aggregate data', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/pilot?from=2026-10-01&to=2026-10-31')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/pilot?from=2026-10-01&to=2026-10-31')
      .set('Cookie', learnerCookies)
      .expect(403);
  });

  it('returns idempotent aggregate counts and no learner identity or raw content', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/pilot?from=2026-10-01&to=2026-10-31')
      .set('Cookie', adminCookies)
      .expect(200);

    expect(response.body.metrics).toContainEqual({
      count: 1,
      dateKey: '2026-10-12',
      dimensions: { durationBucket: '60', outcome: 'completed' },
      eventType: 'LEARNING_SESSION_COMPLETED',
    });
    expect(response.body.definitions.length).toBeGreaterThan(0);
    expect(response.body.retention).toHaveProperty('week1');
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('transcript');
  });

  it('rejects reversed and unbounded date ranges', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/pilot?from=2026-10-31&to=2026-10-01')
      .set('Cookie', adminCookies)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/pilot?from=2025-01-01&to=2026-10-01')
      .set('Cookie', adminCookies)
      .expect(400);
  });
});
