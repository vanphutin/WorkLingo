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

describe('Learner program context API', () => {
  const schema = `program_context_${randomUUID().replaceAll('-', '')}`;
  const baseUrl = process.env.TEST_DATABASE_URL ?? 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  let app: INestApplication;
  let database: PrismaClient;
  let cookies: string[];
  let levelId: string;
  const intermediate = '10000000-0000-4000-8000-000000000002';

  beforeAll(async () => {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schema);
    const cli = createRequire(path.resolve('package.json')).resolve('prisma/build/index.js');
    const migration = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
      encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() }, timeout: 45_000,
    });
    if (migration.status !== 0) throw new Error(migration.stderr || migration.stdout);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(new PrismaService({ datasourceUrl: url.toString() })).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    database = new PrismaClient({ datasourceUrl: url.toString() });
    const learningPath = await database.learningPath.create({ data: { slug: randomUUID(), name: 'Program context', status: 'PUBLISHED' } });
    const level = await database.level.create({ data: { pathId: learningPath.id, code: 'CONTEXT_LEVEL', name: 'Context level', cefrReference: 'B1', order: 0, status: 'PUBLISHED' } });
    levelId = level.id;
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      displayName: 'Program Learner', email: `${randomUUID()}@example.test`, password: 'Password123!',
    }).expect(201);
    cookies = response.headers['set-cookie'] as unknown as string[];
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await database?.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  });

  it('returns coherent null context for a pending authenticated learner', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me/program-context').set('Cookie', cookies).expect(200);
    expect(response.body).toEqual({ activeProgram: null, enrollment: null });
  });

  it('reads only the authenticated enrollment and not another learner or the legacy mirror', async () => {
    const learner = await completeLearner();
    const other = await completeLearner();
    const response = await get(learner.cookies).expect(200);
    expect(response.body).toMatchObject({
      activeProgram: { id: intermediate, slug: 'intermediate' },
      enrollment: { id: learner.enrollmentId, revision: 1, currentLevel: { id: levelId, code: 'CONTEXT_LEVEL' } },
    });
    expect((await get(other.cookies).expect(200)).body.enrollment.id).toBe(other.enrollmentId);
  });

  it('rejects an incomplete or cross-program enrollment without inventing defaults', async () => {
    const learner = await completeLearner();
    await database.learnerProgramEnrollment.update({ where: { id: learner.enrollmentId }, data: { currentLevelId: null } });
    expect((await get(learner.cookies).expect(409)).body.code).toBe('PROGRAM_CONTEXT_INVALID');
    await database.learnerProfile.update({ where: { userId: learner.id }, data: { activeProgramId: '10000000-0000-4000-8000-000000000004' } });
    expect((await get(learner.cookies).expect(409)).body.code).toBe('PROGRAM_CONTEXT_INVALID');
  });

  it('enforces authentication and learner roles', async () => {
    await get([]).expect(401);
    const learner = await completeLearner();
    await database.user.update({ where: { id: learner.id }, data: { role: 'CONTENT_ADMIN' } });
    await get(learner.cookies).expect(403);
  });

  it('requires onboarding and rejects untrusted activation fields', async () => {
    expect((await activate(cookies, 'intermediate', null).expect(409)).body.code).toBe('ONBOARDING_REQUIRED');
    const learner = await completeLearner();
    await request(app.getHttpServer()).put('/api/v1/me/program-context').set('Cookie', learner.cookies)
      .send({ programSlug: 'intermediate', expectedRevision: 1, learnerId: learner.id }).expect(400);
    await request(app.getHttpServer()).put('/api/v1/me/program-context').set('Cookie', learner.cookies)
      .send({ programSlug: 'intermediate' }).expect(400);
  });

  it('rechecks server availability even if an unfinished program has a released status', async () => {
    const learner = await completeLearner();
    const before = (await get(learner.cookies).expect(200)).body;
    for (const slug of ['ielts', 'toeic', 'beginner']) {
      await database.learningProgram.update({ where: { slug }, data: { availabilityStatus: 'AVAILABLE' } });
      expect((await activate(learner.cookies, slug, 1).expect(422)).body.code).toBe('PROGRAM_UNAVAILABLE');
    }
    expect((await activate(learner.cookies, 'unknown', 1).expect(404)).body.code).toBe('PROGRAM_NOT_FOUND');
    await database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'DISABLED' } });
    expect((await activate(learner.cookies, 'ielts', 1).expect(404)).body.code).toBe('PROGRAM_NOT_FOUND');
    expect((await get(learner.cookies).expect(200)).body).toEqual(before);
  });

  it('rejects stale revisions and keeps repeated concurrent activation of the active program a no-op', async () => {
    const learner = await completeLearner();
    expect((await activate(learner.cookies, 'intermediate', 2).expect(409)).body.code).toBe('PROGRAM_CONTEXT_STALE');
    const [first, second] = await Promise.all([
      activate(learner.cookies, 'intermediate', 1).expect(200), activate(learner.cookies, 'intermediate', 1).expect(200),
    ]);
    expect(first.body).toEqual(second.body);
    expect((await get(learner.cookies).expect(200)).body.enrollment).toMatchObject({ id: learner.enrollmentId, revision: 1 });
  });

  it('persists return to an existing Intermediate enrollment and audits only stable context identifiers', async () => {
    const learner = await completeLearner();
    const foreignId = '10000000-0000-4000-8000-000000000004';
    const learningPath = await database.learningPath.create({ data: { programId: foreignId, slug: randomUUID(), name: 'Foreign path' } });
    const level = await database.level.create({ data: { pathId: learningPath.id, code: randomUUID(), name: 'Foreign level', cefrReference: 'B1', order: 0 } });
    await database.learnerProgramEnrollment.create({ data: { learnerId: learner.id, programId: foreignId, currentLevelId: level.id, revision: 5 } });
    await database.learnerProfile.update({ where: { userId: learner.id }, data: { activeProgramId: foreignId } });
    const response = await activate(learner.cookies, 'intermediate', 5).expect(200);
    expect(response.body).toMatchObject({ activeProgram: { slug: 'intermediate' }, enrollment: { id: learner.enrollmentId, revision: 6 } });
    expect((await get(learner.cookies).expect(200)).body).toEqual(response.body);
    expect((await activate(learner.cookies, 'intermediate', 5).expect(409)).body.code).toBe('PROGRAM_CONTEXT_STALE');
    const audit = await database.auditLog.findFirstOrThrow({ where: { actorId: learner.id, action: 'program.context.activated' } });
    expect(audit.metadata).toEqual({ programId: intermediate, enrollmentId: learner.enrollmentId, revision: 6 });
  });

  function get(actorCookies: string[]) {
    return request(app.getHttpServer()).get('/api/v1/me/program-context').set('Cookie', actorCookies);
  }
  function activate(actorCookies: string[], programSlug: string, expectedRevision: number | null) {
    return request(app.getHttpServer()).put('/api/v1/me/program-context').set('Cookie', actorCookies).send({ programSlug, expectedRevision });
  }
  async function completeLearner() {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      displayName: 'Context Learner', email: `${randomUUID()}@example.test`, password: 'Password123!',
    }).expect(201);
    const id: string = response.body.id;
    await database.learnerProfile.update({ where: { userId: id }, data: {
      onboardingStatus: 'COMPLETE', currentLevelCode: 'WRONG_LEGACY_MIRROR', activeProgramId: intermediate,
    } });
    const enrollment = await database.learnerProgramEnrollment.create({ data: { learnerId: id, programId: intermediate, currentLevelId: levelId } });
    return { id, cookies: response.headers['set-cookie'] as unknown as string[], enrollmentId: enrollment.id };
  }
});
