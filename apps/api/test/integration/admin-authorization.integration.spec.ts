import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import {
  Controller,
  Get,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { Roles } from '../../src/auth/roles.decorator.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

@Controller('admin/test-protected')
class TestAdminController {
  @Get()
  @Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')
  testAdminRoute() {
    return { ok: true };
  }
}

describe('Admin authorization and local seed integration', () => {
  const schemaName = `admin_auth_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;

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
      controllers: [TestAdminController],
    })
      .overrideProvider(PrismaService)
      .useValue(new PrismaService({ datasourceUrl: url.toString() }))
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    database = new PrismaClient({ datasourceUrl: url.toString() });
  }, 50_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('seeds content admin idempotently', async () => {
    const adminUser1 = await seedContentAdmin(database, {
      email: 'admin@worklingo.test',
      password: 'StrongPassword123!',
      displayName: 'Test Admin',
    });
    expect(adminUser1.role).toBe('CONTENT_ADMIN');
    expect(adminUser1.email).toBe('admin@worklingo.test');

    // Run seed again to ensure idempotency
    const adminUser2 = await seedContentAdmin(database, {
      email: 'admin@worklingo.test',
      password: 'StrongPassword123!',
      displayName: 'Test Admin',
    });
    expect(adminUser2.id).toBe(adminUser1.id);
    expect(adminUser2.role).toBe('CONTENT_ADMIN');
  });

  it('rejects learner from admin route with 403 Forbidden', async () => {
    // Register normal learner
    const learnerEmail = `learner_${randomUUID()}@example.com`;
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: learnerEmail,
        password: 'Password123!',
        displayName: 'Learner User',
      });
    expect(regRes.status).toBe(201);
    expect(regRes.body.roles).toEqual(['LEARNER']);

    const cookieHeader = regRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();

    // Access protected admin route
    const adminRes = await request(app.getHttpServer())
      .get('/admin/test-protected')
      .set('Cookie', cookieHeader!);

    expect(adminRes.status).toBe(403);
  });

  it('allows content admin to access admin route with 200 OK', async () => {
    const adminEmail = `admin_${randomUUID()}@example.com`;
    const adminPass = 'AdminSecret123!';
    await seedContentAdmin(database, {
      email: adminEmail,
      password: adminPass,
      displayName: 'Admin User',
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: adminPass,
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.roles).toContain('CONTENT_ADMIN');

    const cookieHeader = loginRes.headers['set-cookie'];
    const adminRes = await request(app.getHttpServer())
      .get('/admin/test-protected')
      .set('Cookie', cookieHeader!);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toEqual({ ok: true });
  });

  it('rejects unauthenticated request to admin route with 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer()).get('/admin/test-protected');
    expect(res.status).toBe(401);
  });
});
