import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentAuthoringErrorCode } from '@worklingo/contracts';
import { canonicalLessonSource } from '@worklingo/test-fixtures';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Content audio generation lifecycle and authorized streaming', () => {
  const schemaName = `content_audio_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;

  let adminCookie: string;
  let learnerCookie: string;

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
    const adminEmail = `admin_audio_${randomUUID()}@worklingo.test`;
    const adminPass = 'AdminPass123!';
    await seedContentAdmin(database, {
      email: adminEmail,
      password: adminPass,
      displayName: 'Content Admin Audio',
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPass })
      .expect(200);
    adminCookie = adminLogin.headers['set-cookie']![0] as string;

    // Register a learner user
    const learnerEmail = `learner_audio_${randomUUID()}@worklingo.test`;
    const learnerReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: learnerEmail,
        password: 'LearnerPass123!',
        displayName: 'Learner Audio',
      })
      .expect(201);
    learnerCookie = learnerReg.headers['set-cookie']![0] as string;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('runs complete lifecycle: 202 generate-audio -> poll job -> list audio -> stream content', async () => {
    // 1. Create a draft with canonical source (has audio script 'complaint-call')
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: canonicalLessonSource })
      .expect(201);

    const importId = createRes.body.id;

    // 2. Validate draft
    await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: 1 })
      .expect(200);

    // 3. Initiate fake audio generation -> returns 202 Accepted
    const idempotencyKey = `gen-${randomUUID()}`;
    const genRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/generate-audio`)
      .set('Cookie', adminCookie)
      .send({
        audioScriptSlug: 'complaint-call',
        idempotencyKey,
      })
      .expect(202);

    expect(genRes.body).toMatchObject({
      jobId: expect.any(String),
      status: expect.stringMatching(/PENDING|RUNNING|COMPLETED/),
    });

    const jobId = genRes.body.jobId;

    // 4. Poll job status via GET /jobs/:id
    let jobCompleted = false;
    for (let i = 0; i < 20; i++) {
      const jobRes = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      if (jobRes.body.status === 'COMPLETED') {
        jobCompleted = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(jobCompleted).toBe(true);

    await request(app.getHttpServer())
      .get(`/api/v1/jobs/${jobId}`)
      .set('Cookie', learnerCookie)
      .expect(403);
    await request(app.getHttpServer()).get(`/api/v1/jobs/${jobId}`).expect(401);

    // 5. Query audio artifacts via GET /admin/content-imports/:id/audio
    const audioRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/content-imports/${importId}/audio`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(Array.isArray(audioRes.body)).toBe(true);
    expect(audioRes.body.length).toBeGreaterThan(0);

    const artifact = audioRes.body.find(
      (a: { audioScriptSlug: string }) => a.audioScriptSlug === 'complaint-call',
    );
    expect(artifact).toBeDefined();
    expect(artifact.status).toBe('READY');
    expect(artifact.mimeType).toBe('audio/wav');
    expect(artifact.byteSize).toBeGreaterThan(44);
    expect(artifact.storageKey).toMatch(/^generated-audio\//);
    expect(artifact.simulationLabel).toBe(
      'Simulation audio — not a release voice',
    );

    // 6. Authorized audio playback stream via GET /admin/audio-artifacts/:id/content
    const streamRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/audio-artifacts/${artifact.id}/content`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(streamRes.headers['content-type']).toContain('audio/wav');
    expect(streamRes.body).toBeInstanceOf(Buffer);
    expect(streamRes.body.subarray(0, 4).toString('ascii')).toBe('RIFF');

    // 7. Security: learner is forbidden from streaming admin audio
    await request(app.getHttpServer())
      .get(`/api/v1/admin/audio-artifacts/${artifact.id}/content`)
      .set('Cookie', learnerCookie)
      .expect(403);

    // 8. Security: unauthenticated request is rejected with 401
    await request(app.getHttpServer())
      .get(`/api/v1/admin/audio-artifacts/${artifact.id}/content`)
      .expect(401);
  });

  it('replays idempotent requests and rejects changed requests under same key', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: canonicalLessonSource })
      .expect(201);

    const importId = createRes.body.id;
    const idempotencyKey = `idemp-test-${randomUUID()}`;

    // First request
    const firstRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/generate-audio`)
      .set('Cookie', adminCookie)
      .send({
        audioScriptSlug: 'complaint-call',
        idempotencyKey,
      })
      .expect(202);

    // Replay with identical payload -> returns cached 202 with same jobId
    const replayRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/generate-audio`)
      .set('Cookie', adminCookie)
      .send({
        audioScriptSlug: 'complaint-call',
        idempotencyKey,
      })
      .expect(202);

    expect(replayRes.body.jobId).toBe(firstRes.body.jobId);

    // Request with same key but different payload -> 409 IDEMPOTENCY_KEY_REUSED
    const conflictRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/generate-audio`)
      .set('Cookie', adminCookie)
      .send({
        audioScriptSlug: 'other-audio-script',
        idempotencyKey,
      })
      .expect(409);

    expect(conflictRes.body).toMatchObject({
      code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
      statusCode: 409,
    });
  });
});
