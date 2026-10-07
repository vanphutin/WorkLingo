import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createLearningSessionTestContext, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('authentication', () => {
  let app: INestApplication | undefined;
  let database: PrismaClient;
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('auth');
    app = context.app;
    database = context.database;
  }, 45_000);

  beforeEach(async () => {
    await context.resetLearners();
  });

  afterAll(async () => {
    await context?.close();
  });

  it('uses a migrated isolated schema rather than the local learner database', async () => {
    const rows = await database.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
    expect(rows[0]?.schema).toBe(context.schemaName);
    expect(context.schemaName).toMatch(/^auth_[0-9a-f]{32}$/u);
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
    await expect(database.learnerProfile.findUnique({ where: { userId: response.body.id } }))
      .resolves.toMatchObject({ currentLevelCode: 'FOUNDATION_1' });
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
