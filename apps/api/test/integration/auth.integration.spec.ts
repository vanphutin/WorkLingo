import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('authentication', () => {
  let app: INestApplication | undefined;
  let database: PrismaClient;
  let dataDirectory: string;

  beforeAll(async () => {
    dataDirectory = await mkdtemp(path.join(tmpdir(), 'worklingo-auth-'));
    process.env.DATABASE_URL =
      'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
    process.env.SESSION_SECRET =
      'auth-test-secret-with-at-least-32-characters';
    process.env.WORKLINGO_DATA_DIR = dataDirectory;

    const [{ AppModule }, { PrismaService }] = await Promise.all([
      import('../../src/app.module.js'),
      import('../../src/common/database/prisma.service.js'),
    ]);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    database = app.get(PrismaService);
  });

  beforeEach(async () => {
    await database
      .$executeRawUnsafe(
        'TRUNCATE TABLE "UserSession", "LearnerProfile", "User" CASCADE',
      )
      .catch(() => undefined);
  });

  afterAll(async () => {
    await app?.close();
    await rm(dataDirectory, { force: true, recursive: true });
  });

  it('registers a learner with a normalized email and session cookie', async () => {
    if (!app) throw new Error('Test application was not initialized');

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'An Nguyen',
        email: '  AN@example.com ',
        password: 'a-secure-local-password',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      displayName: 'An Nguyen',
      email: 'an@example.com',
      roles: ['LEARNER'],
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.headers['set-cookie']?.[0]).toMatch(
      /^worklingo_session=.*HttpOnly.*SameSite=Lax/iu,
    );
  });

  it('rejects duplicate normalized emails without creating a second user', async () => {
    if (!app) throw new Error('Test application was not initialized');

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      displayName: 'First Learner',
      email: 'learner@example.com',
      password: 'a-secure-local-password',
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'Second Learner',
        email: 'LEARNER@example.com',
        password: 'another-secure-password',
      })
      .expect(409);

    await expect(database.user.count()).resolves.toBe(1);
  });

  it('rejects a password shorter than twelve characters', async () => {
    if (!app) throw new Error('Test application was not initialized');

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        displayName: 'An Nguyen',
        email: 'an@example.com',
        password: 'too-short',
      })
      .expect(400);
  });

  it('returns the same public error for unknown email and wrong password', async () => {
    if (!app) throw new Error('Test application was not initialized');

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      displayName: 'An Nguyen',
      email: 'an@example.com',
      password: 'a-secure-local-password',
    });

    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'unknown@example.com', password: 'wrong-password-value' })
      .expect(401);
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'an@example.com', password: 'wrong-password-value' })
      .expect(401);

    expect(unknown.body).toEqual(wrongPassword.body);
    expect(unknown.body.message).toBe('Invalid email or password');
  });

  it('invalidates the session on logout', async () => {
    if (!app) throw new Error('Test application was not initialized');

    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/register').send({
      displayName: 'An Nguyen',
      email: 'an@example.com',
      password: 'a-secure-local-password',
    });

    await agent.get('/api/v1/me').expect(200);
    await agent.post('/api/v1/auth/logout').expect(204);
    await agent.get('/api/v1/me').expect(401);
  });
});
