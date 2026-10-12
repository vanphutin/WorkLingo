import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedPlacementCurriculum } from '../../src/curriculum/infrastructure/seed-placement.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import {
  createLearningSessionTestContext,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

const evaluatedSkills = {
  listening: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
  reading: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
  speaking: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
  writing: { evidenceCount: 1, score: 0.8, status: 'evaluated' },
} as const;

const explanation = {
  candidateDecisions: [{ eligible: true, levelCode: 'FOUNDATION_1', reason: 'All four skill minima are met.' }],
  policyVersion: 'workplace-placement-v1',
  reasons: ['Four evaluated skills support the safe Foundation starting point.'],
  skillResults: evaluatedSkills,
  summary: 'Foundation 1 is the current recommendation.',
} as const;

describe('placement status and confirmation', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('placement_confirm');
    await seedPlacementCurriculum(context.database, context.app.get(ObjectStorage));
  }, 45_000);
  beforeEach(async () => context.resetLearners());
  afterAll(async () => context?.close());

  async function createAttempt(email: string) {
    const registration = await registerPendingLearner(context.app, {
      displayName: 'Placement confirmation learner', email,
    });
    const response = await registration.agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(201);
    return { ...registration, attempt: response.body as { id: string; learningSessionId: string } };
  }

  async function markRecommended(attemptId: string) {
    const before = await context.database.placementAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    await context.database.learningSession.update({
      where: { id: before.learningSessionId }, data: { completedAt: new Date(), status: 'COMPLETED' },
    });
    await context.database.placementAttempt.update({
      where: { id: attemptId },
      data: {
        explanation: explanation as unknown as Prisma.InputJsonValue,
        recommendedLevelCode: 'FOUNDATION_1',
        skillResults: evaluatedSkills as unknown as Prisma.InputJsonValue,
        status: 'RECOMMENDED',
      },
    });
    return before;
  }

  it('exposes owner-scoped IN_PROGRESS, PROCESSING, ACTION_REQUIRED, and RECOMMENDED states', async () => {
    const owner = await createAttempt('placement-status-owner@example.test');
    const other = await createAttempt('placement-status-other@example.test');

    await other.agent.get(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}`).expect(404);
    await other.agent
      .post(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}/confirm`)
      .send({ clientConfirmationId: randomUUID() })
      .expect(404);
    const inProgress = await owner.agent
      .get(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}`).expect(200);
    expect(inProgress.body).toMatchObject({ nextAction: 'continue_assessment', status: 'IN_PROGRESS' });

    await context.database.learningSession.update({
      where: { id: owner.attempt.learningSessionId }, data: { completedAt: new Date(), status: 'COMPLETED' },
    });
    const processing = await owner.agent
      .get(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}`).expect(200);
    expect(processing.body).toMatchObject({ nextAction: 'wait_for_evaluation', status: 'PROCESSING' });
    expect(Object.values(processing.body.skillResults).every(
      (result) => (result as { score: number | null }).score === null,
    )).toBe(true);

    const speaking = await context.database.activity.findFirstOrThrow({
      where: { lessonVersionId: processing.body.lessonVersionId, activityType: 'speaking' },
    });
    const failedAttempt = await context.database.activityAttempt.create({
      data: {
        activityId: speaking.id,
        clientAttemptId: randomUUID(),
        evaluationStatus: 'EVALUATION_FAILED',
        learnerId: owner.user.id,
        rawResponse: { kind: 'recording' },
        sessionId: owner.attempt.learningSessionId,
      },
    });
    await context.database.job.create({
      data: {
        createdById: owner.user.id,
        errorCode: 'PROVIDER_TIMEOUT',
        idempotencyKey: `failed:${failedAttempt.id}`,
        payload: { attemptId: failedAttempt.id },
        resourceId: failedAttempt.id,
        resourceType: 'ActivityAttempt',
        retryable: true,
        status: 'FAILED',
        type: 'EVALUATE_ATTEMPT',
      },
    });
    const expiredRecordingAttempt = await context.database.activityAttempt.create({
      data: {
        activityId: speaking.id,
        clientAttemptId: randomUUID(),
        evaluationStatus: 'EVALUATION_FAILED',
        learnerId: owner.user.id,
        rawResponse: { kind: 'recording' },
        sessionId: owner.attempt.learningSessionId,
      },
    });
    await context.database.job.create({
      data: {
        createdById: owner.user.id,
        errorCode: 'RECORDING_EXPIRED',
        idempotencyKey: `expired:${expiredRecordingAttempt.id}`,
        payload: { attemptId: expiredRecordingAttempt.id },
        resourceId: expiredRecordingAttempt.id,
        resourceType: 'ActivityAttempt',
        retryable: true,
        status: 'FAILED',
        type: 'TRANSCRIBE_SPEECH',
      },
    });
    const supersededRetryAttempt = await context.database.activityAttempt.create({
      data: {
        activityId: speaking.id,
        clientAttemptId: randomUUID(),
        evaluationStatus: 'EVALUATION_FAILED',
        learnerId: owner.user.id,
        rawResponse: {},
        sessionId: owner.attempt.learningSessionId,
      },
    });
    await context.database.job.create({
      data: {
        createdById: owner.user.id,
        idempotencyKey: `old-retry:${supersededRetryAttempt.id}`,
        payload: { attemptId: supersededRetryAttempt.id },
        resourceId: supersededRetryAttempt.id,
        resourceType: 'ActivityAttempt',
        retryable: true,
        status: 'FAILED',
        type: 'EVALUATE_ATTEMPT',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    await context.database.job.create({
      data: {
        createdById: owner.user.id,
        errorCode: 'INVALID_PROVIDER_RESPONSE',
        idempotencyKey: `new-terminal:${supersededRetryAttempt.id}`,
        payload: { attemptId: supersededRetryAttempt.id },
        resourceId: supersededRetryAttempt.id,
        resourceType: 'ActivityAttempt',
        retryable: false,
        status: 'FAILED',
        type: 'EVALUATE_ATTEMPT',
        updatedAt: new Date('2026-01-01T00:01:00.000Z'),
      },
    });
    const action = await owner.agent
      .get(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}`).expect(200);
    expect(action.body).toMatchObject({ nextAction: 'retry_evaluation', status: 'ACTION_REQUIRED' });
    expect(action.body.retryableAttemptIds).toEqual([failedAttempt.id]);

    await context.database.activityAttempt.updateMany({
      where: {
        id: { in: [failedAttempt.id, expiredRecordingAttempt.id, supersededRetryAttempt.id] },
      },
      data: { evaluationStatus: 'EVALUATED', score: 0.8 },
    });
    const remainingActivities = await context.database.activity.findMany({
      where: { lessonVersionId: action.body.lessonVersionId, id: { not: speaking.id } },
    });
    for (const activity of remainingActivities) {
      await context.database.activityAttempt.create({
        data: {
          activityId: activity.id,
          clientAttemptId: randomUUID(),
          evaluationStatus: 'EVALUATED',
          learnerId: owner.user.id,
          rawResponse: {},
          score: 0.8,
          sessionId: owner.attempt.learningSessionId,
        },
      });
    }
    const recommended = await owner.agent
      .get(`/api/v1/me/onboarding/placement-attempts/${owner.attempt.id}`).expect(200);
    expect(recommended.body).toMatchObject({
      nextAction: 'review_recommendation',
      recommendedLevelCode: 'FOUNDATION_1',
      status: 'RECOMMENDED',
    });
  });

  it('confirms once, replays the same UUID, and preserves the recommendation snapshot', async () => {
    const learner = await createAttempt('placement-confirm-success@example.test');
    await markRecommended(learner.attempt.id);
    const before = await context.database.placementAttempt.findUniqueOrThrow({ where: { id: learner.attempt.id } });
    const input = { clientConfirmationId: randomUUID() };

    const first = await learner.agent
      .post(`/api/v1/me/onboarding/placement-attempts/${learner.attempt.id}/confirm`)
      .send(input).expect(200);
    const replay = await learner.agent
      .post(`/api/v1/me/onboarding/placement-attempts/${learner.attempt.id}/confirm`)
      .send(input).expect(200);

    expect(replay.body).toEqual(first.body);
    const programContext = await learner.agent.get('/api/v1/me/program-context').expect(200);
    expect(programContext.body).toMatchObject({
      activeProgram: { slug: 'intermediate' },
      enrollment: { revision: 1, currentLevel: { code: 'FOUNDATION_1' } },
    });
    expect(first.body).toMatchObject({
      currentLevelCode: 'FOUNDATION_1', nextAction: 'open_dashboard',
      onboardingMethod: 'PLACEMENT', onboardingStatus: 'COMPLETE',
    });
    const after = await context.database.placementAttempt.findUniqueOrThrow({ where: { id: learner.attempt.id } });
    expect(after).toMatchObject({
      explanation: before.explanation,
      lessonVersionId: before.lessonVersionId,
      policyVersion: before.policyVersion,
      skillResults: before.skillResults,
      status: 'CONFIRMED',
    });
    await expect(context.database.auditLog.count({
      where: { actorId: learner.user.id, action: 'onboarding.placement.confirmed' },
    })).resolves.toBe(1);
    await expect(context.database.mutationReceipt.count({
      where: { actorId: learner.user.id, operation: 'onboarding:placement-confirmation' },
    })).resolves.toBe(1);

    const conflict = await learner.agent
      .post(`/api/v1/me/onboarding/placement-attempts/${randomUUID()}/confirm`)
      .send(input).expect(409);
    expect(conflict.body).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', statusCode: 409 });
  });

  it('serializes concurrent confirmations so only one distinct UUID wins', async () => {
    const learner = await createAttempt('placement-confirm-concurrent@example.test');
    await markRecommended(learner.attempt.id);

    const [left, right] = await Promise.all([
      learner.agent.post(`/api/v1/me/onboarding/placement-attempts/${learner.attempt.id}/confirm`)
        .send({ clientConfirmationId: randomUUID() }),
      learner.agent.post(`/api/v1/me/onboarding/placement-attempts/${learner.attempt.id}/confirm`)
        .send({ clientConfirmationId: randomUUID() }),
    ]);

    expect([left.status, right.status].sort()).toEqual([200, 409]);
    await expect(context.database.auditLog.count({
      where: { actorId: learner.user.id, action: 'onboarding.placement.confirmed' },
    })).resolves.toBe(1);
  });

  it('keeps the recommendation immutable when learning curriculum is withdrawn', async () => {
    const learner = await createAttempt('placement-confirm-withdrawn@example.test');
    await markRecommended(learner.attempt.id);
    const before = await context.database.placementAttempt.findUniqueOrThrow({ where: { id: learner.attempt.id } });
    await context.database.mission.updateMany({
      where: { purpose: 'LEARNING' }, data: { status: 'ARCHIVED' },
    });

    try {
      const response = await learner.agent
        .post(`/api/v1/me/onboarding/placement-attempts/${learner.attempt.id}/confirm`)
        .send({ clientConfirmationId: randomUUID() }).expect(409);
      expect(response.body).toMatchObject({ code: 'LEVEL_NO_LONGER_AVAILABLE', statusCode: 409 });
      const after = await context.database.placementAttempt.findUniqueOrThrow({ where: { id: learner.attempt.id } });
      expect(after).toMatchObject({
        explanation: before.explanation,
        recommendedLevelCode: before.recommendedLevelCode,
        skillResults: before.skillResults,
        status: 'RECOMMENDED',
      });
    } finally {
      await context.database.mission.updateMany({
        where: { purpose: 'LEARNING' }, data: { status: 'PUBLISHED' },
      });
    }
  });
});
