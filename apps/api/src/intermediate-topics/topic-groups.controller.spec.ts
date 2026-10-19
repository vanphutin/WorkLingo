import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import { TopicGroupsController } from './topic-groups.controller.js';
import { TopicGroupsService } from './topic-groups.service.js';

let app: INestApplication;
let roles = ['CONTENT_ADMIN'];
const catalog = { groups: [], lessons: [] };
const id = randomUUID(), root = '/admin/intermediate-topic-groups';
const group = { id, name: 'Work', description: '', revision: 1, lessonCount: 0 };
const service = { catalog: vi.fn(async () => catalog), create: vi.fn(async () => group), update: vi.fn(async () => ({ ...group, revision: 2 })), remove: vi.fn(async () => catalog), assign: vi.fn(async () => catalog) };
beforeAll(async () => {
  const module = await Test.createTestingModule({ controllers: [TopicGroupsController], providers: [{ provide: TopicGroupsService, useValue: service }] }).compile();
  app = module.createNestApplication();
  app.use((req: { authUser: unknown }, _res: unknown, next: () => void) => { req.authUser = { id: randomUUID(), roles }; next(); });
  app.useGlobalGuards(new RolesGuard(new Reflector()));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
});
beforeEach(() => { roles = ['CONTENT_ADMIN']; vi.clearAllMocks(); });
afterAll(async () => { await app?.close(); });

describe('Topic group HTTP boundary', () => {
  it.each(['CONTENT_ADMIN', 'SYSTEM_ADMIN'])('allows %s to use the exact catalog and mutation routes', async role => {
    roles = [role];
    expect((await request(app.getHttpServer()).get(root).expect(200)).body).toEqual(catalog);
    expect((await request(app.getHttpServer()).post(root).send({ name: 'Work', description: '' }).expect(201)).body).toEqual(group);
    expect((await request(app.getHttpServer()).patch(`${root}/${id}`).send({ name: 'Work', description: '', expectedRevision: 1 }).expect(200)).body).toEqual({ ...group, revision: 2 });
    await request(app.getHttpServer()).delete(`${root}/${id}`).send({ expectedRevision: 1 }).expect(200);
    expect((await request(app.getHttpServer()).put(`${root}/lessons/${id}`).send({ groupId: null, expectedRevision: 0 }).expect(200)).body).toEqual(catalog);
    expect(service.assign).toHaveBeenCalledWith(id, { groupId: null, expectedRevision: 0 });
  });
  it.each(['LEARNER', 'SUPPORT'])('blocks %s on every route', async role => {
    roles = [role];
    await request(app.getHttpServer()).get(root).expect(403);
    await request(app.getHttpServer()).post(root).send({ name: 'Work', description: '' }).expect(403);
    await request(app.getHttpServer()).patch(`${root}/${id}`).send({ name: 'Work', description: '', expectedRevision: 1 }).expect(403);
    await request(app.getHttpServer()).delete(`${root}/${id}`).send({ expectedRevision: 1 }).expect(403);
    await request(app.getHttpServer()).put(`${root}/lessons/${id}`).send({ groupId: null, expectedRevision: 0 }).expect(403);
    expect(Object.values(service).every(fn => fn.mock.calls.length === 0)).toBe(true);
  });
  it.each([
    { groupId: 'bad', expectedRevision: 0 }, { groupId: null, expectedRevision: -1 }, { groupId: null, expectedRevision: '0' },
    { expectedRevision: 0 }, { groupId: null, expectedRevision: 0, draftRevision: 2 },
  ])('rejects invalid assignment body before persistence: %j', async body => {
    await request(app.getHttpServer()).put(`${root}/lessons/${id}`).send(body).expect(400);
    expect(service.assign).not.toHaveBeenCalled();
  });
  it('rejects unknown fields, missing revisions, bad path IDs and blank or oversized metadata', async () => {
    for (const body of [{ name: ' ', description: '' }, { name: 'Work', description: '', approved: true }, { name: 'x'.repeat(121), description: '' }, { name: 'Work', description: 'x'.repeat(2001) }]) {
      await request(app.getHttpServer()).post(root).send(body).expect(400);
    }
    await request(app.getHttpServer()).patch(`${root}/${id}`).send({ name: 'Work', description: '' }).expect(400);
    await request(app.getHttpServer()).delete(`${root}/${id}`).send({ expectedRevision: 0 }).expect(400);
    await request(app.getHttpServer()).delete(`${root}/${id}`).send({ expectedRevision: 1, force: true }).expect(400);
    await request(app.getHttpServer()).delete(`${root}/bad`).send({ expectedRevision: 1 }).expect(400);
    expect(service.create).not.toHaveBeenCalled(); expect(service.remove).not.toHaveBeenCalled();
  });
});
