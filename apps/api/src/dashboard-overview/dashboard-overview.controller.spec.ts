import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import { DashboardOverviewController } from './dashboard-overview.controller.js';
import { DashboardOverviewService } from './dashboard-overview.service.js';
let app: INestApplication; let role = 'LEARNER';
const get = vi.fn(async () => ({ programContext: null }));
beforeAll(async () => {
  const module = await Test.createTestingModule({ controllers: [DashboardOverviewController], providers: [{ provide: DashboardOverviewService, useValue: { get } }] }).compile();
  app = module.createNestApplication();
  app.use((req: { authUser: unknown }, _res: unknown, next: () => void) => { req.authUser = { id: 'learner-id', roles: [role] }; next(); });
  app.useGlobalGuards(new RolesGuard(new Reflector())); await app.init();
});
afterAll(async () => { await app?.close(); });
describe('Dashboard overview HTTP boundary', () => {
  it('uses authenticated identity and disables shared caching', async () => {
    role = 'LEARNER';
    const response = await request(app.getHttpServer()).get('/me/dashboard/overview?learnerId=someone-else').expect(200);
    expect(get).toHaveBeenCalledWith('learner-id'); expect(response.headers['cache-control']).toBe('private, no-store');
  });
  it('does not grant learner dashboard access to content administrators', async () => {
    role = 'CONTENT_ADMIN'; await request(app.getHttpServer()).get('/me/dashboard/overview').expect(403);
  });
});
