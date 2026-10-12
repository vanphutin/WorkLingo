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
import { INTERMEDIATE_PROGRAM_ID } from '../../src/learning-programs/domain/program-catalog.js';

describe('Admin Curriculum Commands HTTP Integration', () => {
  const schemaName = `admin_curriculum_${randomUUID().replaceAll('-', '')}`;
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

    // Seed content admin & login
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
    expect(adminLoginRes.status).toBe(200);
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
    expect(learnerRes.status).toBe(201);
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

  it('rejects learner from curriculum mutations with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', learnerCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'Learner Path',
        slug: 'learner-path',
      });

    expect(res.status).toBe(403);
  });

  it('allows content admin to create a learning path, level, and mission', async () => {
    // 1. Create Path
    const pathKey = randomUUID();
    const createPathRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: pathKey,
        name: 'IELTS Preparation',
        slug: 'ielts-preparation',
      });

    expect(createPathRes.status).toBe(201);
    expect(createPathRes.body.slug).toBe('ielts-preparation');
    expect(createPathRes.body.revision).toBe(1);
    expect(createPathRes.body.status).toBe('DRAFT');
    expect(createPathRes.body.program).toMatchObject({
      id: INTERMEDIATE_PROGRAM_ID,
      slug: 'intermediate',
    });
    const pathId = createPathRes.body.id;

    // 2. Create Level
    const levelKey = randomUUID();
    const createLevelRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/levels')
      .set('Cookie', adminCookies)
      .send({
        cefrReference: 'B2',
        code: 'IELTS_FOUNDATION',
        idempotencyKey: levelKey,
        name: 'IELTS Band 5.5-6.5',
        pathId,
      });

    expect(createLevelRes.status).toBe(201);
    expect(createLevelRes.body.code).toBe('IELTS_FOUNDATION');
    expect(createLevelRes.body.revision).toBe(1);
    expect(createLevelRes.body.status).toBe('DRAFT');
    const levelId = createLevelRes.body.id;

    // 3. Create Mission
    const missionKey = randomUUID();
    const createMissionRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/missions')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: missionKey,
        levelId,
        objective: 'Master academic greetings and introductions',
        purpose: 'LEARNING',
        slug: 'academic-introductions',
        title: 'Academic Introductions',
      });

    expect(createMissionRes.status).toBe(201);
    expect(createMissionRes.body.slug).toBe('academic-introductions');
    expect(createMissionRes.body.revision).toBe(1);
    expect(createMissionRes.body.status).toBe('DRAFT');

    // 4. Verify exactly 3 audit records were created
    const auditCount = await database.auditLog.count({
      where: {
        action: { in: ['CREATE_PATH', 'CREATE_LEVEL', 'CREATE_MISSION'] },
      },
    });
    expect(auditCount).toBe(3);
  });

  it('handles idempotent replay and conflicts correctly', async () => {
    const idempotencyKey = randomUUID();
    const payload = {
      idempotencyKey,
      name: 'Path for Idempotency',
      slug: 'path-for-idempotency',
    };

    // First request
    const firstRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send(payload);
    expect(firstRes.status).toBe(201);

    // Replay with exact same payload -> returns 201 with identical body
    const replayRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({ ...payload, programId: INTERMEDIATE_PROGRAM_ID });
    expect(replayRes.status).toBe(201);
    expect(replayRes.body).toEqual(firstRes.body);

    // Replay with modified payload -> returns 409 IDEMPOTENCY_CONFLICT
    const conflictRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        ...payload,
        name: 'Different Name Reused Key',
      });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('supports explicit program assignment and rejects missing or disabled programs', async () => {
    const ielts = await database.learningProgram.findUniqueOrThrow({
      where: { slug: 'ielts' },
    });
    const explicit = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'IELTS Program Path',
        programId: ielts.id,
        slug: 'ielts-program-path',
      });
    expect(explicit.status).toBe(201);
    expect(explicit.body.program).toMatchObject({ id: ielts.id, slug: 'ielts' });

    const missing = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'Missing Program Path',
        programId: randomUUID(),
        slug: 'missing-program-path',
      });
    expect(missing.status).toBe(422);
    expect(missing.body.code).toBe('INVALID_CURRICULUM_RELATIONSHIP');

    const toeic = await database.learningProgram.update({
      data: { availabilityStatus: 'DISABLED' },
      where: { slug: 'toeic' },
    });
    const disabled = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'Disabled Program Path',
        programId: toeic.id,
        slug: 'disabled-program-path',
      });
    expect(disabled.status).toBe(422);
    expect(disabled.body.code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
  });

  it('rejects stale expectedRevision with 409 CURRICULUM_REVISION_CONFLICT', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'Revision Test Path',
        slug: 'revision-test-path',
      });
    expect(createRes.status).toBe(201);
    const pathId = createRes.body.id;

    // First update: revision 1 -> 2
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/curriculum/paths/${pathId}`)
      .set('Cookie', adminCookies)
      .send({
        expectedRevision: 1,
        idempotencyKey: randomUUID(),
        name: 'Updated Revision Path',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.revision).toBe(2);

    // Stale update: expectedRevision 1 (but current is now 2!)
    const staleRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/curriculum/paths/${pathId}`)
      .set('Cookie', adminCookies)
      .send({
        expectedRevision: 1,
        idempotencyKey: randomUUID(),
        name: 'Stale Update Attempt',
      });
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.code).toBe('CURRICULUM_REVISION_CONFLICT');
  });

  it('blocks path archive when published levels exist', async () => {
    // Create path & level, publish level
    const pathRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/paths')
      .set('Cookie', adminCookies)
      .send({
        idempotencyKey: randomUUID(),
        name: 'Archive Blocked Path',
        slug: 'archive-blocked-path',
      });
    const pathId = pathRes.body.id;

    const levelRes = await request(app.getHttpServer())
      .post('/api/v1/admin/curriculum/levels')
      .set('Cookie', adminCookies)
      .send({
        cefrReference: 'A1',
        code: 'BLOCKED_LEVEL',
        idempotencyKey: randomUUID(),
        name: 'Blocked Level',
        pathId,
      });
    const levelId = levelRes.body.id;

    // Publish level
    const pubLevelRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/curriculum/levels/${levelId}/publish`)
      .set('Cookie', adminCookies)
      .send({
        expectedRevision: 1,
        idempotencyKey: randomUUID(),
      });
    expect(pubLevelRes.status).toBe(200);

    // Try archiving path
    const archiveRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/curriculum/paths/${pathId}/archive`)
      .set('Cookie', adminCookies)
      .send({
        expectedRevision: 1,
        idempotencyKey: randomUUID(),
      });

    expect(archiveRes.status).toBe(409);
    expect(archiveRes.body.code).toBe('CURRICULUM_ARCHIVE_BLOCKED');
    expect(archiveRes.body.blockers).toContain('HAS_PUBLISHED_LEVELS');
  });
});
