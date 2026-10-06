import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canonicalLessonSource } from '@worklingo/test-fixtures';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';

describe('Transactional publish, archive, and session version isolation', () => {
  const schemaName = `content_publish_test_${randomUUID().replaceAll('-', '')}`;
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
    const adminEmail = `admin_pub_${randomUUID()}@worklingo.test`;
    const adminPass = 'AdminPass123!';
    await seedContentAdmin(database, {
      email: adminEmail,
      password: adminPass,
      displayName: 'Content Admin Publish',
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPass })
      .expect(200);
    adminCookie = adminLogin.headers['set-cookie']![0] as string;

    // Register a learner user
    const learnerEmail = `learner_pub_${randomUUID()}@worklingo.test`;
    const learnerReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: learnerEmail,
        password: 'LearnerPass123!',
        displayName: 'Learner Publish',
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

  async function prepareValidatedDraftWithAudio(source: string) {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/admin/content-imports')
      .set('Cookie', adminCookie)
      .send({ rawSource: source })
      .expect(201);

    const importId = createRes.body.id;
    const rev = createRes.body.draftRevision;
    const hash = createRes.body.sourceHash;

    await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: rev })
      .expect(200);

    // Generate audio for complaint-call
    const genRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/generate-audio`)
      .set('Cookie', adminCookie)
      .send({
        audioScriptSlug: 'complaint-call',
        idempotencyKey: `gen-audio-${randomUUID()}`,
      })
      .expect(202);

    // Poll until audio is ready
    for (let i = 0; i < 20; i++) {
      const jobRes = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${genRes.body.jobId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      if (jobRes.body.status === 'COMPLETED') break;
      await new Promise((r) => setTimeout(r, 100));
    }

    return { importId, revision: rev, sourceHash: hash };
  }

  it('atomically publishes a validated lesson version with child records', async () => {
    const { importId, revision, sourceHash } =
      await prepareValidatedDraftWithAudio(canonicalLessonSource);

    const idempotencyKey = `pub-${randomUUID()}`;
    const pubRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/publish`)
      .set('Cookie', adminCookie)
      .send({
        expectedDraftRevision: revision,
        expectedSourceHash: sourceHash,
        idempotencyKey,
      })
      .expect(200);

    expect(pubRes.body).toMatchObject({
      importId,
      lessonId: expect.any(String),
      lessonVersionId: expect.any(String),
      version: 1,
      status: 'PUBLISHED',
      publishedAt: expect.any(String),
    });

    const lessonVersionId = pubRes.body.lessonVersionId;
    const lessonId = pubRes.body.lessonId;

    // Verify Lesson points to version 1
    const lesson = await database.lesson.findUniqueOrThrow({
      where: { id: lessonId },
    });
    expect(lesson.currentPublishedVersionId).toBe(lessonVersionId);

    // Verify ContentImport is marked PUBLISHED
    const imp = await database.contentImport.findUniqueOrThrow({
      where: { id: importId },
    });
    expect(imp.status).toBe('PUBLISHED');
    expect(imp.lessonVersionId).toBe(lessonVersionId);

    // Verify child records materialized
    const contentBlocks = await database.contentBlock.findMany({
      where: { lessonVersionId },
    });
    expect(contentBlocks.length).toBeGreaterThan(0);

    const activities = await database.activity.findMany({
      where: { lessonVersionId },
    });
    expect(activities.length).toBeGreaterThan(0);

    const audioArtifacts = await database.lessonVersionAudioArtifact.findMany({
      where: { lessonVersionId },
    });
    expect(audioArtifacts.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/content-imports/${importId}/source`)
      .set('Cookie', adminCookie)
      .send({ rawSource: canonicalLessonSource, expectedDraftRevision: revision })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${importId}/validate`)
      .set('Cookie', adminCookie)
      .send({ expectedDraftRevision: revision })
      .expect(409);
  });

  it('returns the same result for concurrent identical publish requests', async () => {
    const slug = `same-key-${randomUUID()}`;
    const source = canonicalLessonSource.replace('handling-customer-complaints', slug);
    const draft = await prepareValidatedDraftWithAudio(source);
    const idempotencyKey = `publish-same-${randomUUID()}`;
    const body = {
      expectedDraftRevision: draft.revision,
      expectedSourceHash: draft.sourceHash,
      idempotencyKey,
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/admin/content-imports/${draft.importId}/publish`)
        .set('Cookie', adminCookie)
        .send(body),
      request(app.getHttpServer())
        .post(`/api/v1/admin/content-imports/${draft.importId}/publish`)
        .set('Cookie', adminCookie)
        .send(body),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);
    expect(second.body).toEqual(first.body);
    await expect(
      database.lessonVersion.count({ where: { lessonId: first.body.lessonId } }),
    ).resolves.toBe(1);
    await expect(
      database.mutationReceipt.count({
        where: { operation: 'publish', idempotencyKey },
      }),
    ).resolves.toBe(1);
  });

  it('allows only one concurrent publish with different keys for the same draft', async () => {
    const slug = `different-keys-${randomUUID()}`;
    const source = canonicalLessonSource.replace('handling-customer-complaints', slug);
    const draft = await prepareValidatedDraftWithAudio(source);
    const createRequest = (idempotencyKey: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/admin/content-imports/${draft.importId}/publish`)
        .set('Cookie', adminCookie)
        .send({
          expectedDraftRevision: draft.revision,
          expectedSourceHash: draft.sourceHash,
          idempotencyKey,
        });

    const responses = await Promise.all([
      createRequest(`publish-a-${randomUUID()}`),
      createRequest(`publish-b-${randomUUID()}`),
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 409]);
    const success = responses.find((response) => response.status === 200)!;
    await expect(
      database.lessonVersion.count({ where: { lessonId: success.body.lessonId } }),
    ).resolves.toBe(1);
  });

  it('clears the current published pointer when the current lesson version is archived', async () => {
    const slug = `archive-current-${randomUUID()}`;
    const source = canonicalLessonSource.replace('handling-customer-complaints', slug);
    const draft = await prepareValidatedDraftWithAudio(source);
    const published = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${draft.importId}/publish`)
      .set('Cookie', adminCookie)
      .send({
        expectedDraftRevision: draft.revision,
        expectedSourceHash: draft.sourceHash,
        idempotencyKey: `archive-current-publish-${randomUUID()}`,
      })
      .expect(200);

    const archive = () => request(app.getHttpServer())
      .post(`/api/v1/admin/lesson-versions/${published.body.lessonVersionId}/archive`)
      .set('Cookie', adminCookie);
    const responses = await Promise.all([archive(), archive()]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses[0].body).toEqual(responses[1].body);

    await expect(
      database.lesson.findUniqueOrThrow({ where: { id: published.body.lessonId } }),
    ).resolves.toMatchObject({ currentPublishedVersionId: null });
    await expect(
      database.lessonVersion.findUniqueOrThrow({
        where: { id: published.body.lessonVersionId },
      }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' });
    await expect(database.auditLog.count({
      where: { resourceId: published.body.lessonVersionId, action: 'ARCHIVE_LESSON' },
    })).resolves.toBe(1);
  });

  it('publishes version 2 atomically archiving version 1 and preserving session isolation', async () => {
    // 1. Prepare and publish version 1
    const v1Source = canonicalLessonSource.replace(
      'slug: handling-customer-complaints',
      'slug: complaints-session-iso',
    );
    const v1 = await prepareValidatedDraftWithAudio(v1Source);
    const pub1 = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${v1.importId}/publish`)
      .set('Cookie', adminCookie)
      .send({
        expectedDraftRevision: v1.revision,
        expectedSourceHash: v1.sourceHash,
        idempotencyKey: `pub-v1-${randomUUID()}`,
      })
      .expect(200);

    const v1Id = pub1.body.lessonVersionId;
    const lessonId = pub1.body.lessonId;

    // Set up level, path, mission pointing to this lesson
    const path = await database.learningPath.create({
      data: { slug: `path-${randomUUID()}`, name: 'Test Path', status: 'PUBLISHED' },
    });
    const level = await database.level.create({
      data: {
        code: 'FOUNDATION_1',
        name: 'Foundation 1',
        cefrReference: 'A1',
        pathId: path.id,
        order: 0,
      },
    });
    const mission = await database.mission.create({
      data: {
        slug: `mission-${randomUUID()}`,
        title: 'Mission for Version Test',
        objective: 'Test version isolation',
        levelId: level.id,
        order: 0,
        status: 'PUBLISHED',
      },
    });
    await database.missionLesson.create({
      data: { missionId: mission.id, lessonId, order: 0 },
    });

    // 2. Learner creates session S1 before publish of version 2
    const clientSessionId1 = randomUUID();
    const session1Res = await request(app.getHttpServer())
      .post('/api/v1/learning-sessions')
      .set('Cookie', learnerCookie)
      .send({ clientSessionId: clientSessionId1, durationMinutes: 60 })
      .expect(201);

    expect(session1Res.body.lessonVersionId).toBe(v1Id);

    // 3. Prepare and publish version 2 for the same lesson
    const updatedSource = v1Source.replace(
      'title: Handling Customer Complaints',
      'title: Handling Customer Complaints V2',
    );
    const v2 = await prepareValidatedDraftWithAudio(updatedSource);
    const pub2 = await request(app.getHttpServer())
      .post(`/api/v1/admin/content-imports/${v2.importId}/publish`)
      .set('Cookie', adminCookie)
      .send({
        expectedDraftRevision: v2.revision,
        expectedSourceHash: v2.sourceHash,
        idempotencyKey: `pub-v2-${randomUUID()}`,
      })
      .expect(200);

    expect(pub2.body.version).toBe(2);
    const v2Id = pub2.body.lessonVersionId;

    // Version 1 is now ARCHIVED
    const v1Record = await database.lessonVersion.findUniqueOrThrow({
      where: { id: v1Id },
    });
    expect(v1Record.status).toBe('ARCHIVED');

    // Lesson points to version 2
    const updatedLesson = await database.lesson.findUniqueOrThrow({
      where: { id: lessonId },
    });
    expect(updatedLesson.currentPublishedVersionId).toBe(v2Id);

    // 4. Session S1 continues to read version 1 data without error!
    const s1ActivityId = session1Res.body.plan.blocks[0].activityIds[0];
    const s1ActivityRes = await request(app.getHttpServer())
      .get(
        `/api/v1/learning-sessions/${session1Res.body.id}/activities/${s1ActivityId}`,
      )
      .set('Cookie', learnerCookie)
      .expect(200);

    expect(s1ActivityRes.body.id).toBe(s1ActivityId);

    // 5. A new session S2 created after commit uses version 2!
    const clientSessionId2 = randomUUID();
    const session2Res = await request(app.getHttpServer())
      .post('/api/v1/learning-sessions')
      .set('Cookie', learnerCookie)
      .send({ clientSessionId: clientSessionId2, durationMinutes: 60 })
      .expect(201);

    expect(session2Res.body.lessonVersionId).toBe(v2Id);
  });
});
