import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JobStatus, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Admin Operations HTTP Integration', () => {
  const schemaName = `admin_ops_api_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;

  let adminCookies: string[] = [];
  let learnerCookies: string[] = [];
  let adminUserId: string;
  let sampleJobId: string;

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

    // Seed admin
    const adminEmail = `opsadmin_${randomUUID()}@example.com`;
    const adminPass = 'AdminSecret123!';
    const adminUser = await seedContentAdmin(database, {
      displayName: 'Operations Lead',
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
        displayName: 'Learner Viewer',
        email: learnerEmail,
        password: 'Password123!',
      });
    learnerCookies = (learnerRes.headers['set-cookie'] ?? []) as string[];

    // Seed sample jobs
    const job1 = await database.job.create({
      data: {
        createdById: adminUserId,
        idempotencyKey: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
        leaseOwner: 'worker-primary-node',
        payload: {
          activityId: 'act-sample-1',
          audioScriptSlug: 'greeting-dialogue',
          contentImportId: 'import-uuid-1',
          rawSecretToken: 'tok_leaked_secret_val',
          userVoiceRecording: 'sensitive_binary_or_transcript',
        },
        resourceId: 'res-artifact-1',
        resourceType: 'AudioArtifact',
        status: JobStatus.RUNNING,
        type: 'AUDIO_GENERATION',
      },
    });
    sampleJobId = job1.id;

    await database.jobAttempt.create({
      data: {
        attemptNumber: 1,
        jobId: job1.id,
        outcome: 'RUNNING',
        providerModel: 'azure-neural-1',
        providerName: 'azure-speech',
        startedAt: new Date(),
      },
    });

    await database.job.create({
      data: {
        attemptCount: 3,
        completedAt: new Date(),
        createdById: adminUserId,
        errorCode: 'PROVIDER_TIMEOUT',
        errorSummary: 'Azure Speech request timed out after 30s',
        idempotencyKey: randomUUID(),
        maxAttempts: 3,
        payload: {
          activityId: 'act-sample-2',
          audioScriptSlug: 'farewell-dialogue',
        },
        retryable: false,
        status: JobStatus.FAILED,
        type: 'AUDIO_GENERATION',
      },
    });

    await database.job.create({
      data: {
        attemptCount: 1,
        completedAt: new Date(),
        createdById: adminUserId,
        idempotencyKey: randomUUID(),
        payload: {
          rubricId: 'rubric-v1',
          rubricVersion: '1.0.0',
        },
        status: JobStatus.COMPLETED,
        type: 'EVALUATE_ATTEMPT',
      },
    });
  }, 45_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await adminDb.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
    );
    await adminDb.$disconnect();
  });

  it('rejects unauthenticated and learner access with 401 and 403', async () => {
    // Unauthenticated
    await request(app.getHttpServer())
      .get('/api/v1/admin/operations/summary')
      .expect(401);

    // Learner forbidden
    await request(app.getHttpServer())
      .get('/api/v1/admin/operations/summary')
      .set('Cookie', learnerCookies)
      .expect(403);
  });

  it('exposes system operations summary, queue depth and worker status to admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/operations/summary')
      .set('Cookie', adminCookies)
      .expect(200);

    expect(res.body).toMatchObject({
      activeWorkers: 1,
      completedCount: 1,
      failedCount: 1,
      queueDepth: 1,
      runningCount: 1,
      workerConfig: {
        leaseMs: expect.any(Number),
        pollIntervalMs: expect.any(Number),
        workerEnabled: expect.any(Boolean),
      },
    });
    expect(res.body.jobTypeBreakdown.AUDIO_GENERATION).toMatchObject({
      failed: 1,
      running: 1,
      total: 2,
    });
    expect(res.body.jobTypeBreakdown.EVALUATE_ATTEMPT).toMatchObject({
      completed: 1,
      total: 1,
    });
  });

  it('lists jobs with filtering and pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/operations/jobs?page=1&pageSize=10&status=RUNNING')
      .set('Cookie', adminCookies)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: sampleJobId,
      leaseOwner: 'worker-primary-node',
      status: 'RUNNING',
      type: 'AUDIO_GENERATION',
    });
  });

  it('returns scrubbed job detail and attempt history without exposing secrets', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/operations/jobs/${sampleJobId}`)
      .set('Cookie', adminCookies)
      .expect(200);

    expect(res.body).toMatchObject({
      id: sampleJobId,
      status: 'RUNNING',
      type: 'AUDIO_GENERATION',
      payloadSummary: {
        activityId: 'act-sample-1',
        audioScriptSlug: 'greeting-dialogue',
        contentImportId: 'import-uuid-1',
      },
    });

    // Privacy verification: sensitive fields must NEVER be returned in payloadSummary
    expect(res.body.payloadSummary).not.toHaveProperty('rawSecretToken');
    expect(res.body.payloadSummary).not.toHaveProperty('userVoiceRecording');

    // Attempt history verification
    expect(res.body.attempts).toHaveLength(1);
    expect(res.body.attempts[0]).toMatchObject({
      attemptNumber: 1,
      outcome: 'RUNNING',
      providerModel: 'azure-neural-1',
      providerName: 'azure-speech',
    });
  });

  it('returns 404 for unknown job ID', async () => {
    const nonExistentId = randomUUID();
    await request(app.getHttpServer())
      .get(`/api/v1/admin/operations/jobs/${nonExistentId}`)
      .set('Cookie', adminCookies)
      .expect(404);
  });
});
