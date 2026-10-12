import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createLearningSessionTestContext,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('learner onboarding and self-placement HTTP API', () => {
  let app: INestApplication;
  let context: LearningSessionTestContext;
  let database: PrismaClient;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('onboarding_self');
    app = context.app;
    database = context.database;
  }, 45_000);

  beforeEach(async () => {
    await context.resetLearners();
  });

  afterAll(async () => {
    await context?.close();
  });

  async function register(email: string) {
    const agent = request.agent(app.getHttpServer());
    const response = await agent.post('/api/v1/auth/register').send({
      displayName: 'Onboarding learner',
      email,
      password: 'a-secure-local-password',
    }).expect(201);
    return { agent, user: response.body as { id: string } };
  }

  it('returns server-owned pending state and explainable eligible levels', async () => {
    const { agent } = await register('pending@example.com');

    const response = await agent.get('/api/v1/me/onboarding').expect(200);

    expect(response.body).toMatchObject({
      activePlacementAttempt: null,
      currentLevelCode: null,
      eligibleLevels: [{
        available: true,
        cefrReference: 'Pre-A1',
        code: 'FOUNDATION_1',
        name: 'Foundation 1',
        reason: 'A published 60-minute four-skill learning mission is available.',
      }],
      nextAction: 'choose_method',
      onboardingMethod: null,
      onboardingStatus: 'PENDING',
    });
  });

  it('confirms a playable self-selected level and replays the same UUID exactly once', async () => {
    const { agent, user } = await register('confirm@example.com');
    const input = {
      clientConfirmationId: randomUUID(),
      selectedLevelCode: 'FOUNDATION_1',
    };

    const first = await agent.post('/api/v1/me/onboarding/self-placement').send(input).expect(200);
    const replay = await agent.post('/api/v1/me/onboarding/self-placement').send(input).expect(200);

    expect(replay.body).toEqual(first.body);
    const programContext = await agent.get('/api/v1/me/program-context').expect(200);
    expect(programContext.body).toMatchObject({
      activeProgram: { slug: 'intermediate' },
      enrollment: { revision: 1, currentLevel: { code: 'FOUNDATION_1' } },
    });
    expect(first.body).toMatchObject({
      currentLevelCode: 'FOUNDATION_1',
      nextAction: 'open_dashboard',
      onboardingMethod: 'SELF_SELECTED',
      onboardingStatus: 'COMPLETE',
    });
    await expect(database.learnerProfile.findUniqueOrThrow({ where: { userId: user.id } }))
      .resolves.toMatchObject({
        currentLevelCode: 'FOUNDATION_1',
        onboardingMethod: 'SELF_SELECTED',
        onboardingStatus: 'COMPLETE',
      });
    await expect(database.mutationReceipt.count({
      where: { actorId: user.id, operation: 'onboarding:self-placement' },
    })).resolves.toBe(1);
    await expect(database.auditLog.count({
      where: { actorId: user.id, action: 'onboarding.self_placement.confirmed' },
    })).resolves.toBe(1);
  });

  it('rejects reuse of a confirmation UUID for a different target', async () => {
    const { agent } = await register('conflict@example.com');
    const clientConfirmationId = randomUUID();
    await agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId,
      selectedLevelCode: 'FOUNDATION_1',
    }).expect(200);

    const conflict = await agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId,
      selectedLevelCode: 'OTHER_LEVEL',
    }).expect(409);

    expect(conflict.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
  });

  it('rejects a published level that cannot form a canonical learning session', async () => {
    const path = await database.learningPath.findFirstOrThrow({ where: { status: 'PUBLISHED' } });
    await database.level.create({
      data: {
        cefrReference: 'A1',
        code: 'UNPLAYABLE_TEST',
        name: 'Unplayable test level',
        order: 99,
        pathId: path.id,
      },
    });
    const { agent } = await register('unplayable@example.com');

    const state = await agent.get('/api/v1/me/onboarding').expect(200);
    expect(state.body.eligibleLevels).toEqual(expect.arrayContaining([
      expect.objectContaining({
        available: false,
        code: 'UNPLAYABLE_TEST',
        reason: 'No published learning mission is available.',
      }),
    ]));
    const response = await agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId: randomUUID(),
      selectedLevelCode: 'UNPLAYABLE_TEST',
    }).expect(422);
    expect(response.body).toMatchObject({ code: 'LEVEL_NOT_PLAYABLE', statusCode: 422 });
  });

  it('keeps learner state owner-scoped and rejects an administrator', async () => {
    const first = await register('owner@example.com');
    const second = await register('other@example.com');
    await first.agent.post('/api/v1/me/onboarding/self-placement').send({
      clientConfirmationId: randomUUID(),
      selectedLevelCode: 'FOUNDATION_1',
    }).expect(200);

    await expect(second.agent.get('/api/v1/me/onboarding').expect(200))
      .resolves.toHaveProperty('body.onboardingStatus', 'PENDING');

    await database.user.update({ where: { id: second.user.id }, data: { role: 'CONTENT_ADMIN' } });
    const me = await second.agent.get('/api/v1/me').expect(200);
    expect(me.body.onboardingStatus).toBeNull();
    await second.agent.get('/api/v1/me/onboarding').expect(403);
  });

  it('serializes different concurrent confirmations so only one can complete onboarding', async () => {
    const { agent, user } = await register('concurrent@example.com');
    const [left, right] = await Promise.all([
      agent.post('/api/v1/me/onboarding/self-placement').send({
        clientConfirmationId: randomUUID(),
        selectedLevelCode: 'FOUNDATION_1',
      }),
      agent.post('/api/v1/me/onboarding/self-placement').send({
        clientConfirmationId: randomUUID(),
        selectedLevelCode: 'FOUNDATION_1',
      }),
    ]);

    expect([left.status, right.status].sort()).toEqual([200, 409]);
    const conflict = left.status === 409 ? left : right;
    expect(conflict.body).toMatchObject({
      code: 'ONBOARDING_ALREADY_COMPLETE',
      statusCode: 409,
    });
    await expect(database.auditLog.count({
      where: { actorId: user.id, action: 'onboarding.self_placement.confirmed' },
    })).resolves.toBe(1);
  });
});
