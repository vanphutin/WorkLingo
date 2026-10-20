import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../src/common/database/prisma.service.js';
import { ieltsBetaFixture } from '../../src/learning-programs/application/__fixtures__/ielts-beta.js';
import { LearningProgramsService } from '../../src/learning-programs/application/learning-programs.service.js';
import { ProgramContextService } from '../../src/learning-programs/application/program-context.service.js';
import { LearningProgramsController } from '../../src/learning-programs/learning-programs.controller.js';
import { ProgramContextController } from '../../src/learning-programs/program-context.controller.js';

// Real HTTP/controller/services/validation with an in-memory database boundary.
// No AppModule bootstrap, seed, migration, live publication or learner DB mutation.
describe('IELTS Beta catalog and context integration', () => {
  let app: INestApplication;
  let context: ProgramContextService;
  let fixture: ReturnType<typeof ieltsBetaFixture>;
  let state: ReturnType<typeof learnerState>;

  beforeEach(async () => {
    fixture = ieltsBetaFixture();
    state = learnerState();
    const tx = {
      ...fixture.database,
      $queryRaw: vi.fn(async () => []),
      learnerProfile: {
        findUnique: vi.fn(async () => state.profile),
        update: vi.fn(async ({ data }) => Object.assign(state.profile, data)),
      },
      learnerProgramEnrollment: {
        findUnique: vi.fn(async () => state.enrollment),
        update: vi.fn(async ({ data }) => Object.assign(state.enrollment, data)),
      },
      auditLog: { create: vi.fn(async (input) => { state.audits.push(input); return input; }) },
      learningProgram: {
        ...fixture.database.learningProgram,
        findUnique: vi.fn(async ({ where }) => where.slug === 'ielts' ? fixture.program : state.profile.activeProgram),
      },
    };
    const module = await Test.createTestingModule({
      controllers: [LearningProgramsController, ProgramContextController],
      providers: [LearningProgramsService, ProgramContextService, { provide: PrismaService, useValue: {
        ...tx, $transaction: async (callback: (database: typeof tx) => unknown) => callback(tx),
      } }],
    }).compile();
    context = module.get(ProgramContextService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use((req: { authUser?: { id: string } }, _res: unknown, next: () => void) => {
      req.authUser = { id: state.profile.userId };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => { await app?.close(); });

  it('opens the complete Beta catalog at /ielts while HTTP and direct activation preserve Intermediate evidence', async () => {
    const before = structuredClone(state);
    const contextBefore = (await request(app.getHttpServer()).get('/api/v1/me/program-context').expect(200)).body;
    const catalog = await request(app.getHttpServer()).get('/api/v1/learning-programs').expect(200);
    expect(catalog.body.programs[0]).toMatchObject({
      slug: 'ielts', availabilityStatus: 'BETA', destination: '/ielts', isSelectable: true,
      publishedLevelCount: 0, publishedPathCount: 0,
    });
    expect(Object.keys(catalog.body.programs[0])).toHaveLength(11);
    const rejection = await request(app.getHttpServer()).put('/api/v1/me/program-context')
      .send({ programSlug: 'ielts', expectedRevision: state.enrollment.revision }).expect(422);
    expect(rejection.body.code).toBe('PROGRAM_UNAVAILABLE');
    await expect(context.activate(state.profile.userId, { programSlug: 'ielts', expectedRevision: 7 }))
      .rejects.toMatchObject({ response: { code: 'PROGRAM_UNAVAILABLE' } });
    expect((await request(app.getHttpServer()).get('/api/v1/me/program-context').expect(200)).body).toEqual(contextBefore);
    expect(state).toEqual(before);
  });

  it('relocks navigation after real-audio readiness changes and still rejects direct activation', async () => {
    fixture.audio[0]!.adapterName = 'fake-tts';
    const before = structuredClone(state);
    const catalog = await request(app.getHttpServer()).get('/api/v1/learning-programs').expect(200);
    expect(catalog.body.programs[0]).toMatchObject({ destination: null, isSelectable: false });
    await request(app.getHttpServer()).put('/api/v1/me/program-context')
      .send({ programSlug: 'ielts', expectedRevision: 7 }).expect(422);
    expect(state).toEqual(before);
  });

  it('keeps Intermediate activation revision checks and no-op behavior', async () => {
    const before = structuredClone(state);
    const stale = await request(app.getHttpServer()).put('/api/v1/me/program-context')
      .send({ programSlug: 'intermediate', expectedRevision: 6 }).expect(409);
    expect(stale.body.code).toBe('PROGRAM_CONTEXT_STALE');
    await request(app.getHttpServer()).put('/api/v1/me/program-context')
      .send({ programSlug: 'intermediate', expectedRevision: 7 }).expect(200);
    expect(state).toEqual(before);
  });
});

function learnerState() {
  const activeProgram = { id: randomUUID(), slug: 'intermediate', name: 'Intermediate', availabilityStatus: 'AVAILABLE' };
  return {
    profile: { userId: randomUUID(), onboardingStatus: 'COMPLETE', activeProgramId: activeProgram.id, activeProgram },
    enrollment: { id: randomUUID(), revision: 7, currentLevel: {
      id: randomUUID(), code: 'FOUNDATION_3', name: 'Foundation 3', path: { programId: activeProgram.id },
    } },
    evidence: { checkpoint: { status: 'passed', canAdvance: true }, foundation: { completed: true },
      orientation: { revision: 3 }, productiveSkillReviews: ['TEACHER_REVIEWED'] },
    audits: [] as unknown[],
  };
}
