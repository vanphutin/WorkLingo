import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Admin Audit Events HTTP Integration', () => {
  const schemaName = `admin_audit_api_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;

  let adminCookies: string[] = [];
  let learnerCookies: string[] = [];
  let adminUserId: string;

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve(
      'prisma/build/index.js',
    );
    const migration = spawnSync(
      process.execPath,
      [cli, 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: 'utf8',
        timeout: 45_000,
      },
    );
    if (migration.status !== 0) {
      throw new Error(migration.stderr || migration.stdout);
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new PrismaService({ datasourceUrl: url.toString() }))
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    database = new PrismaClient({ datasourceUrl: url.toString() });

    // Seed content admin
    const adminEmail = `admin_${randomUUID()}@example.com`;
    const adminPass = 'AdminSecret123!';
    const adminUser = await seedContentAdmin(database, {
      displayName: 'Super Auditor',
      email: adminEmail,
      password: adminPass,
    });
    adminUserId = adminUser.id;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPass });
    adminCookies = (adminLoginRes.headers['set-cookie'] ?? []) as string[];

    // Register learner
    const learnerEmail = `learner_${randomUUID()}@example.com`;
    const learnerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Learner Two',
        email: learnerEmail,
        password: 'Password123!',
      });
    learnerCookies = (learnerRes.headers['set-cookie'] ?? []) as string[];

    // Create several audit logs
    for (let i = 1; i <= 5; i++) {
      await database.auditLog.create({
        data: {
          action: i % 2 === 0 ? 'UPDATE_LEVEL' : 'CREATE_PATH',
          actorId: adminUserId,
          metadata: { note: `Test audit ${i}` },
          newState: { step: i },
          resourceId: `res-${i}`,
          resourceType: i % 2 === 0 ? 'Level' : 'LearningPath',
        },
      });
    }
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('rejects learner from querying audit events with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-events')
      .set('Cookie', learnerCookies);

    expect(res.status).toBe(403);
  });

  it('allows content admin to query audit events with cursor pagination and filters', async () => {
    // 1. First page limit 2
    const page1Res = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-events?limit=2')
      .set('Cookie', adminCookies);

    expect(page1Res.status).toBe(200);
    expect(page1Res.body.items).toHaveLength(2);
    expect(page1Res.body.nextCursor).toBeDefined();
    expect(page1Res.body.items[0].actorDisplayName).toBe('Super Auditor');
    // Ensure email is NEVER exposed
    expect(page1Res.body.items[0].email).toBeUndefined();

    // 2. Second page using cursor
    const cursor = page1Res.body.nextCursor;
    const page2Res = await request(app.getHttpServer())
      .get(`/api/v1/admin/audit-events?limit=2&cursor=${encodeURIComponent(cursor)}`)
      .set('Cookie', adminCookies);

    expect(page2Res.status).toBe(200);
    expect(page2Res.body.items).toHaveLength(2);
    // Disjoint items
    expect(page2Res.body.items[0].id).not.toBe(page1Res.body.items[0].id);

    // 3. Filter by action
    const filterRes = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-events?action=UPDATE_LEVEL')
      .set('Cookie', adminCookies);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.items.length).toBeGreaterThan(0);
    for (const item of filterRes.body.items) {
      expect(item.action).toBe('UPDATE_LEVEL');
    }
  });
});
