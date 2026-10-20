import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { JOB_RUNNER_OPTIONS, JobHandlerRegistry, JobRunnerService } from '../../src/jobs/application/job-runner.service.js';
import { JobsService } from '../../src/jobs/application/jobs.service.js';
import { PlacementRecommendationService } from '../../src/onboarding/application/placement-recommendation.service.js';
import { seedPlacementCurriculum } from '../../src/curriculum/infrastructure/seed-placement.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { inspectJobClaim } from './job-claim-diagnostics.js';
import {
  createLearningSessionTestContext,
  registerLearner,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

const clearShadowingWav = (): Buffer => {
  const sampleRate = 16_000;
  const dataSize = sampleRate * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  buffer.write('worklingo-fixture:clear-shadowing', 44, 'utf8');
  return buffer;
};

describe('placement evidence isolation', () => {
  let context: LearningSessionTestContext;

  const runPlacementJob = async (expectedType: string) => {
    const pending = await context.database.job.findMany({ where: { status: 'PENDING' },
      select: { id: true, type: true, attemptCount: true, leaseOwner: true, availableAt: true } });
    expect(pending).toHaveLength(1);
    const job = pending[0]!;
    expect(job).toMatchObject({ type: expectedType, attemptCount: 0, leaseOwner: null });
    expect(context.app.get(JOB_RUNNER_OPTIONS).enabled).toBe(false);
    // This tests evidence isolation, not wall-clock polling. Job timestamps and
    // host Date need not share an instant; exercise the inclusive due boundary.
    await expect(context.app.get(JobRunnerService).runOnce(job.availableAt)).resolves.toBe(true);
    await expect(context.database.job.findUnique({ where: { id: job.id } })).resolves.toMatchObject({
      status: 'COMPLETED', attemptCount: 1, leaseOwner: null,
    });
  };

  beforeAll(async () => {
    context = await createLearningSessionTestContext('placement_isolation');
    await seedPlacementCurriculum(context.database, context.app.get(ObjectStorage));
  }, 45_000);
  beforeEach(async () => {
    vi.restoreAllMocks();
    await context.resetLearners();
    const diagnostics = process.env.WORKLINGO_PLACEMENT_DIAGNOSTICS;
    if (!['true', 'failure', 'boundary'].includes(diagnostics ?? '')) return;
    const jobs = context.app.get(JobsService);
    const claim = jobs.claimNext.bind(jobs);
    vi.spyOn(jobs, 'claimNext').mockImplementation(async (workerId, now, leaseMs) => {
      // Failure-only mode leaves the successful hot path free of diagnostic I/O.
      const enteredAt = new Date().toISOString();
      const enteredMono = process.hrtime.bigint();
      const earlyResult = diagnostics !== 'true' ? await claim(workerId, now, leaseMs) : null;
      const returnedAt = new Date().toISOString();
      const claimDurationNs = (process.hrtime.bigint() - enteredMono).toString();
      if (earlyResult && diagnostics === 'failure') return earlyResult;
      const snapshot = await inspectJobClaim(context.database, now);
      const result = diagnostics !== 'true' ? earlyResult : await claim(workerId, now, leaseMs);
      console.log(JSON.stringify({ event: 'placement-claim', hostNow: now.toISOString(),
        mode: diagnostics, enteredAt, returnedAt, claimDurationNs,
        observation: diagnostics === 'true' ? 'before-claim' : 'after-claim-not-atomic',
        workerId, backgroundWorker: process.env.JOB_WORKER_ENABLED, schema: context.schemaName,
        timeline: snapshot.jobs, locks: snapshot.locks, claimedId: result?.id ?? null,
        after: await context.database.job.findMany({ select: { id: true, status: true, attemptCount: true, leaseOwner: true } }),
      }));
      return result;
    });
  });
  afterAll(async () => context?.close());

  it('uses persisted database eligibility when the host instant is earlier than the job', async () => {
    const { user } = await registerPendingLearner(context.app, {
      displayName: 'Eligibility clock learner', email: 'eligibility-clock@example.test',
    });
    context.app.get(JobHandlerRegistry).register({ type: 'PLACEMENT_CLOCK_PROBE', handle: async () => ({ fixture: true }) });
    const reference = await context.app.get(JobsService).enqueue({
      createdById: user.id, idempotencyKey: randomUUID(), payload: {}, type: 'PLACEMENT_CLOCK_PROBE',
    });
    const job = await context.database.job.findUniqueOrThrow({ where: { id: reference.id } });
    // Reproduce the observed one-millisecond gap without changing database time,
    // production methods, retries or timers. Only Date is controlled in this scope.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(job.availableAt.getTime() - 1));
    try {
      await expect(context.app.get(JobRunnerService).runOnce()).resolves.toBe(false);
      await expect(context.database.jobAttempt.count()).resolves.toBe(0);
      await runPlacementJob('PLACEMENT_CLOCK_PROBE');
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(Array.from({ length: Math.min(100, Math.max(1, Number(process.env.WORKLINGO_PLACEMENT_REPEATS) || 1)) }, (_, index) => index))('completes and recommends from all four placement skills without learning side effects (run %i)', async () => {
    const { agent, user } = await registerPendingLearner(context.app, {
      displayName: 'Isolated placement learner', email: 'placement-isolation@example.test',
    });
    const placement = await agent.post('/api/v1/me/onboarding/placement-attempts')
      .send({ clientAttemptId: randomUUID() }).expect(201);
    const session = await agent.get(`/api/v1/learning-sessions/${placement.body.learningSessionId}`).expect(200);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);

    for (const activityId of session.body.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds)) {
      const activity = await context.database.activity.findUniqueOrThrow({ where: { id: activityId } });
      const payload = activity.payload as { questions?: Array<{ answerIndex: number }>; sampleAnswer?: string };
      if (activity.activityType === 'speaking') {
        await agent.post(`/api/v1/activities/${activity.id}/recordings`)
          .field('sessionId', session.body.id)
          .field('clientAttemptId', randomUUID())
          .field('consentAccepted', 'true')
          .field('consentPolicyVersion', 'recording-v1')
          .field('consentScope', 'teacher-ai')
          .attach('audio', clearShadowingWav(), { filename: 'voice.wav', contentType: 'audio/wav' })
          .expect(202);
        await runPlacementJob('TRANSCRIBE_SPEECH');
        await runPlacementJob('EVALUATE_ATTEMPT');
        continue;
      }
      const response = activity.activityType === 'reading' || activity.activityType === 'listening'
        ? { answerIndexes: payload.questions?.map((question) => question.answerIndex) }
        : { text: payload.sampleAnswer };
      await agent.post(`/api/v1/activities/${activity.id}/attempts`).send({
        clientAttemptId: randomUUID(), response, sessionId: session.body.id,
      }).expect(201);
      if (activity.activityType === 'writing') await runPlacementJob('EVALUATE_ATTEMPT');
    }

    const recommendation = await context.app.get(PlacementRecommendationService)
      .refresh(user.id, placement.body.id);
    expect(recommendation).toMatchObject({
      recommendedLevelCode: 'FOUNDATION_1', status: 'RECOMMENDED',
    });
    await expect(context.database.masteryEvent.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.masteryRecord.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.errorBankEntry.count({ where: { learnerId: user.id } })).resolves.toBe(0);
    await expect(context.database.checkpointAssessment.count({ where: { learnerId: user.id } })).resolves.toBe(0);

    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body).toMatchObject({
      activityAttempts: 0,
      completedActivities: 0,
      sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 },
    });
    const progression = await agent.get('/api/v1/me/progression').expect(409);
    expect(progression.body.code).toBe('ONBOARDING_REQUIRED');
    const mastery = await agent.get('/api/v1/me/mastery-map').expect(409);
    expect(mastery.body.code).toBe('ONBOARDING_REQUIRED');
  });

  it('preserves ordinary learning evidence and progress side effects', async () => {
    const agent = await registerLearner(context.app, {
      displayName: 'Learning evidence learner', email: 'learning-evidence@example.test',
    });
    const learner = await context.database.user.findUniqueOrThrow({
      where: { email: 'learning-evidence@example.test' },
    });
    const session = await agent.post('/api/v1/learning-sessions').send({
      clientSessionId: randomUUID(), durationMinutes: 45,
    }).expect(201);
    await agent.post(`/api/v1/learning-sessions/${session.body.id}/start`).expect(200);
    const readingId = session.body.plan.blocks[0].activityIds[0] as string;
    await agent.post(`/api/v1/activities/${readingId}/attempts`).send({
      clientAttemptId: randomUUID(), response: { answerIndexes: [2, 2, 2] }, sessionId: session.body.id,
    }).expect(201);

    expect(await context.database.masteryEvent.count({ where: { learnerId: learner.id } })).toBeGreaterThan(0);
    expect(await context.database.errorBankEntry.count({ where: { learnerId: learner.id } })).toBeGreaterThan(0);
    const progress = await agent.get('/api/v1/me/progress').expect(200);
    expect(progress.body.activityAttempts).toBeGreaterThan(0);
    expect(progress.body.sessions.inProgress).toBe(1);
  });
});
