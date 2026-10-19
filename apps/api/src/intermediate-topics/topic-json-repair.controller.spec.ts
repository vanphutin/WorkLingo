import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import { IntermediateTopicReviewController } from './intermediate-topics.controller.js';
import { TopicReviewService } from './topic-review.service.js';
import { TopicJsonRepairService } from './topic-json-repair.service.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureContentSourceBodyParser } from '../common/http/content-source-body-parser.js';
let app: INestApplication;
let roles = ['CONTENT_ADMIN'];
const repair = vi.fn(async () => ({ source: '{}', explanation: 'Fixture', provider: 'fixture', model: 'fixture' }));
beforeAll(async () => {
  const module = await Test.createTestingModule({ controllers: [IntermediateTopicReviewController], providers: [
    { provide: TopicReviewService, useValue: {} }, { provide: TopicJsonRepairService, useValue: { repair } },
  ] }).compile();
  app = module.createNestApplication<NestExpressApplication>();
  configureContentSourceBodyParser(app as NestExpressApplication);
  app.use((req: { authUser: unknown }, _res: unknown, next: () => void) => { req.authUser = { id: 'admin-id', roles }; next(); });
  app.useGlobalGuards(new RolesGuard(new Reflector()));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
});
beforeEach(() => { roles = ['CONTENT_ADMIN']; repair.mockClear(); });
afterAll(async () => { await app?.close(); });
describe('JSON repair HTTP boundary', () => {
  it('accepts administrator requests without invoking approval or persistence', async () => {
    await request(app.getHttpServer()).post('/admin/intermediate-topics/repair-json').send({ source: '{broken}' }).expect(200);
    expect(repair).toHaveBeenCalledExactlyOnceWith('{broken}', 'admin-id');
  });
  it('rejects learner access before contacting the provider', async () => {
    roles = ['LEARNER'];
    await request(app.getHttpServer()).post('/admin/intermediate-topics/repair-json').send({ source: '{broken}' }).expect(403);
    expect(repair).not.toHaveBeenCalled();
  });
  it.each([{ source: 4 }, { source: '{}' , approvedById: 'injected' }, { source: 'x'.repeat(200_001) }])('rejects invalid input', async body => {
    await request(app.getHttpServer()).post('/admin/intermediate-topics/repair-json').send(body).expect(400);
    expect(repair).not.toHaveBeenCalled();
  });
});
