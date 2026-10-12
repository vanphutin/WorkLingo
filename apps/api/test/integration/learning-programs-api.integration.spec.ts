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

describe('Learning programs learner API integration', () => {
  const schemaName = `learning_programs_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;
  let learnerCookies: string[] = [];
  let adminCookies: string[] = [];

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schemaName);
    const cli = createRequire(path.resolve('package.json')).resolve(
      'prisma/build/index.js',
    );
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: url.toString() },
      timeout: 45_000,
    });
    if (migration.status !== 0) {
      throw new Error(migration.stderr || migration.stdout);
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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

    const learner = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Program Learner',
        email: `learner_${randomUUID()}@example.com`,
        password: 'Password123!',
      });
    expect(learner.status).toBe(201);
    learnerCookies = (learner.headers['set-cookie'] ?? []) as string[];

    const adminEmail = `admin_${randomUUID()}@example.com`;
    const adminPassword = 'AdminSecret123!';
    await seedContentAdmin(database, {
      displayName: 'Content Admin',
      email: adminEmail,
      password: adminPassword,
    });
    const admin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    expect(admin.status).toBe(200);
    adminCookies = (admin.headers['set-cookie'] ?? []) as string[];
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('returns the closed, ordered catalog to a learner', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/learning-programs')
      .set('Cookie', learnerCookies);

    expect(response.status).toBe(200);
    expect(response.body.programs.map((program: { slug: string }) => program.slug)).toEqual([
      'beginner',
      'intermediate',
      'toeic',
      'ielts',
    ]);
    expect(response.body.programs[1]).toMatchObject({
      destination: '/dashboard',
      isSelectable: true,
      publishedLevelCount: 0,
      publishedPathCount: 0,
      slug: 'intermediate',
    });
    expect(response.body.programs[3]).toMatchObject({
      destination: null,
      isSelectable: false,
      slug: 'ielts',
    });
  });

  it('rejects an anonymous request', async () => {
    await request(app.getHttpServer()).get('/api/v1/learning-programs').expect(401);
  });

  it('rejects a content admin from the learner catalog', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/learning-programs')
      .set('Cookie', adminCookies)
      .expect(403);
  });
});
