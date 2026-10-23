import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import { RATE_LIMIT_METADATA_KEY } from '../common/rate-limit/rate-limit.decorator.js';
import { TopicGenerationController } from './topic-generation.controller.js';
import { TopicGenerationService } from './topic-generation.service.js';
let app: INestApplication;
let roles = ['CONTENT_ADMIN'];
const generate = vi.fn(async () => ({ provider: 'openai', model: 'fixture', topic: { title: 'Draft' } }));
const input = { topicGroupId: '00000000-0000-4000-8000-000000000001', durationMinutes: 90, provider: 'openai', level: 'B1', difficulty: 'medium' };
beforeAll(async () => {
  const module = await Test.createTestingModule({ controllers: [TopicGenerationController], providers: [{ provide: TopicGenerationService, useValue: { generate } }] }).compile();
  app = module.createNestApplication();
  app.use((req: { authUser: unknown }, _res: unknown, next: () => void) => { req.authUser = { id: 'admin', roles }; next(); });
  app.useGlobalGuards(new RolesGuard(new Reflector()));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
});
afterAll(() => app.close());
beforeEach(() => { roles = ['CONTENT_ADMIN']; vi.clearAllMocks(); });
describe('Generation boundary', () => {
  it('returns an editable candidate to content administrators', async () => {
    const response = await request(app.getHttpServer()).post('/admin/intermediate-topics/generate').send(input);
    expect(response.status).toBe(200);
    expect(response.body.topic.title).toBe('Draft');
    expect(generate).toHaveBeenCalledWith(input);
  });
  it('blocks learners before generation', async () => {
    roles = ['LEARNER'];
    expect((await request(app.getHttpServer()).post('/admin/intermediate-topics/generate').send(input)).status).toBe(403);
    expect(generate).not.toHaveBeenCalled();
  });
  it.each([{ durationMinutes: 75 }, { topicGroupId: 'text' }, { provider: 'automatic' }, { approve: true }, { level: 'C1' }, { difficulty: 'expert' }])('rejects unsupported generation inputs %j', async patch => {
    expect((await request(app.getHttpServer()).post('/admin/intermediate-topics/generate').send({ ...input, ...patch })).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it('uses a one-minute limit window rather than locking out an administrator for hours', () => {
    expect(Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, TopicGenerationController.prototype.generate)).toMatchObject({ limit: 3, windowSeconds: 60 });
  });
});
