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
import { seedFoundationCurriculum } from '../../src/curriculum/infrastructure/seed-foundation.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Admin Curriculum Query HTTP Integration', () => {
  const schemaName = `admin_curriculum_q_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;

  let adminCookies: string[] = [];
  let learnerCookies: string[] = [];

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

    // Seed foundation curriculum
    await seedFoundationCurriculum(database);

    // Seed content admin
    const adminEmail = `admin_${randomUUID()}@example.com`;
    const adminPass = 'AdminSecret123!';
    await seedContentAdmin(database, {
      displayName: 'Content Admin',
      email: adminEmail,
      password: adminPass,
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPass });
    adminCookies = (adminLoginRes.headers['set-cookie'] ?? []) as string[];

    // Register normal learner
    const learnerEmail = `learner_${randomUUID()}@example.com`;
    const learnerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Learner One',
        email: learnerEmail,
        password: 'Password123!',
      });
    learnerCookies = (learnerRes.headers['set-cookie'] ?? []) as string[];
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('rejects learner from querying curriculum tree with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/curriculum')
      .set('Cookie', learnerCookies);

    expect(res.status).toBe(403);
  });

  it('allows content admin to query complete curriculum tree with playability', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/curriculum')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.paths).toBeDefined();
    expect(res.body.programs.map((program: { slug: string }) => program.slug)).toEqual([
      'beginner',
      'intermediate',
      'toeic',
      'ielts',
    ]);
    expect(Array.isArray(res.body.paths)).toBe(true);
    expect(res.body.paths.length).toBeGreaterThan(0);

    const foundationPath = res.body.paths.find((p: { slug: string }) => p.slug === 'english-for-work');
    expect(foundationPath).toBeDefined();
    expect(foundationPath.program).toMatchObject({
      id: '10000000-0000-4000-8000-000000000002',
      slug: 'intermediate',
    });
    expect(foundationPath.levels.length).toBeGreaterThan(0);

    const level = foundationPath.levels[0];
    expect(level.isPlayable).toBe(true);
    expect(level.missions.length).toBeGreaterThan(0);

    const mission = level.missions[0];
    expect(mission.isPlayable).toBe(true);
    expect(mission.lessons.length).toBeGreaterThan(0);
  });
});
