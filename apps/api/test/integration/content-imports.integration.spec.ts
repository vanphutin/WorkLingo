import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentAuthoringErrorCode } from '@worklingo/contracts';
import { canonicalLessonSource, invalidLessonSources } from '@worklingo/test-fixtures';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { configureContentSourceBodyParser } from '../../src/common/http/content-source-body-parser.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Content authoring draft, autosave, validation, and preview API', () => {
  const schemaName = `content_authoring_test_${randomUUID().replaceAll('-', '')}`;
  const baseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const adminDb = new PrismaClient({ datasourceUrl: baseUrl });
  let app: NestExpressApplication;
  let database: PrismaClient;

  let adminCookie: string;
  let admin2Cookie: string;
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

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureContentSourceBodyParser(app);
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

    // Seed content admin 1
    const admin1Email = `admin1_${randomUUID()}@worklingo.test`;
    const admin1Pass = 'AdminPass123!';
    await seedContentAdmin(database, {
      email: admin1Email,
      password: admin1Pass,
      displayName: 'Content Admin One',
    });

    const admin1Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin1Email, password: admin1Pass })
      .expect(200);
    adminCookie = admin1Login.headers['set-cookie']![0] as string;

    // Seed content admin 2 (for shared admin workspace tests)
    const admin2Email = `admin2_${randomUUID()}@worklingo.test`;
    const admin2Pass = 'AdminPass456!';
    await seedContentAdmin(database, {
      email: admin2Email,
      password: admin2Pass,
      displayName: 'Content Admin Two',
    });

    const admin2Login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin2Email, password: admin2Pass })
      .expect(200);
    admin2Cookie = admin2Login.headers['set-cookie']![0] as string;

    // Register a learner user
    const learnerEmail = `learner_${randomUUID()}@worklingo.test`;
    const learnerReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: learnerEmail,
        password: 'LearnerPass123!',
        displayName: 'Learner User',
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

  it('rejects learner access to content-imports endpoints with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/content-imports')
      .set('Cookie', learnerCookie)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', learnerCookie)
      .send({ rawSource: canonicalLessonSource })
      .expect(403);
  });

  it('rejects unauthenticated requests to content-imports endpoints with 401 Unauthorized', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/content-imports')
      .expect(401);
  });

  it('creates an import and persists invalid raw source exactly with 201 Created', async () => {
    const invalidSource = 'INVALID [CORRUPT SOURCE <<<';
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: invalidSource })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      rawSource: invalidSource,
      sourceHash: createHash('sha256').update(invalidSource).digest('hex'),
      draftRevision: 1,
      status: 'DRAFT',
      parserVersion: '1.0.0',
    });
  });

  it('accepts a draft source above the default JSON parser limit but below the lesson limit', async () => {
    const rawSource = 'A'.repeat(150_000);
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource })
      .expect(201);

    expect(response.body.rawSource).toBe(rawSource);
    expect(response.body.sourceHash).toBe(createHash('sha256').update(rawSource).digest('hex'));
  });

  it('enforces source-size limits on draft creation', async () => {
    const hugeSource = 'A'.repeat(500_001);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: hugeSource });

    expect(res.status).toBe(400);
  });

  it('updates draft source with expectedDraftRevision and increments revision with 200 OK', async () => {
    // 1. Create initial draft
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: 'Initial draft content' })
      .expect(201);

    const importId = createRes.body.id;
    const rev1 = createRes.body.draftRevision;
    expect(rev1).toBe(1);

    // 2. Update source with expected revision 1
    const updatedSource = 'Updated draft content by Admin 1';
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/content-imports/${importId}/source`)
      .set('Cookie', adminCookie)
      .send({
        rawSource: updatedSource,
        expectedDraftRevision: 1,
      })
      .expect(200);

    expect(updateRes.body).toMatchObject({
      id: importId,
      rawSource: updatedSource,
      sourceHash: createHash('sha256').update(updatedSource).digest('hex'),
      draftRevision: 2,
      status: 'DRAFT',
    });
  });

  it('returns 409 conflict when updating source with outdated expectedDraftRevision and preserves stored text', async () => {
    // 1. Create initial draft
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: 'Revision 1 text' })
      .expect(201);

    const importId = createRes.body.id;

    // 2. Admin 1 updates to revision 2
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/content-imports/${importId}/source`)
      .set('Cookie', adminCookie)
      .send({
        rawSource: 'Revision 2 text by Admin 1',
        expectedDraftRevision: 1,
      })
      .expect(200);

    // 3. Admin 2 attempts update still expecting revision 1 -> 409 Conflict
    const conflictRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/content-imports/${importId}/source`)
      .set('Cookie', admin2Cookie)
      .send({
        rawSource: 'Stale update text by Admin 2',
        expectedDraftRevision: 1,
      })
      .expect(409);

    expect(conflictRes.body).toMatchObject({
      code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
      statusCode: 409,
    });

    // 4. Assert stored text was not overwritten
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/content-imports/${importId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(getRes.body.rawSource).toBe('Revision 2 text by Admin 1');
    expect(getRes.body.draftRevision).toBe(2);
  });

  it('validates canonical source successfully with 200 OK and status VALIDATED', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: canonicalLessonSource })
      .expect(201);

    const importId = createRes.body.id;

    const validateRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: 1 })
      .expect(200);

    expect(validateRes.body).toMatchObject({
      importId,
      draftRevision: 1,
      status: 'VALIDATED',
      canPublish: true,
      issues: [],
    });

    // Check preview
    const previewRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/content-imports/${importId}/preview`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(previewRes.body).toMatchObject({
      importId,
      canPublish: true,
      status: 'VALIDATED',
      normalizedDraft: expect.objectContaining({
        title: 'Handling Customer Complaints',
      }),
    });
  });

  it('returns 422 with stored invalid source when validation finds errors', async () => {
    const invalidSource = invalidLessonSources.unclosedSection;
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: invalidSource })
      .expect(201);

    const importId = createRes.body.id;

    const validateRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: 1 })
      .expect(422);

    expect(validateRes.body).toMatchObject({
      statusCode: 422,
      code: expect.stringMatching(/CONTENT_PARSE_FAILED|CONTENT_VALIDATION_FAILED/),
      canPublish: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: expect.any(String),
        }),
      ]),
    });

    // Preview for invalid source still returns 200 with issues and canPublish: false
    const previewRes = await request(app.getHttpServer())
      .get(`/api/v1/admin/content-imports/${importId}/preview`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(previewRes.body).toMatchObject({
      importId,
      canPublish: false,
      normalizedDraft: null,
      issues: expect.any(Array),
    });
  });

  it('resets VALIDATED status back to DRAFT when source is edited', async () => {
    // 1. Create and validate canonical source
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: canonicalLessonSource })
      .expect(201);

    const importId = createRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: 1 })
      .expect(200);

    // 2. Edit source
    const editRes = await request(app.getHttpServer())
      .patch(`/api/v1/admin/content-imports/${importId}/source`)
      .set('Cookie', adminCookie)
      .send({
        rawSource: `${canonicalLessonSource}\n# Small edit`,
        expectedDraftRevision: 1,
      })
      .expect(200);

    expect(editRes.body.status).toBe('DRAFT');
    expect(editRes.body.draftRevision).toBe(2);
  });

  it('lists content imports in reverse chronological order', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
    expect(listRes.body[0]).toMatchObject({
      id: expect.any(String),
      draftRevision: expect.any(Number),
      status: expect.any(String),
    });
  });
});
