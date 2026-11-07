import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { ASSESSMENT_OPTIONS } from '../../src/teacher-ai/application/assessment-history.service.js';
import { LanguageEvaluationPort } from '../../src/ai-gateway/domain/language-evaluation.port.js';
import { OpenAiLanguageEvaluationAdapter } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { r22OwnedDatabaseUrl as url } from './r22-owned-database.js';
describe('recording final persistence fencing on owned disposable PostgreSQL', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    learner: ReturnType<typeof request.agent>,
    _outsider: ReturnType<typeof request.agent>;
  let _providerCalls = 0;
  let pauseResponse: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    db = new PrismaService({ datasourceUrl: url });
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (b) => {
        raw += b;
      });
      req.on('end', async () => {
        _providerCalls++;
        if (pauseResponse) await pauseResponse();
        const body = JSON.parse(raw);
        const input = JSON.parse(body.input);
        const submission = input.submission as string;
        const verdict = {
          confidence: 'HIGH',
          summary: 'Synthetic local provider feedback.',
          corrections: [],
          evidence: [
            {
              id: 'submitted',
              source: 'submission',
              quote: submission.slice(0, 1000),
              start: 0,
              end: Math.min(submission.length, 1000),
              startMs: null,
              endMs: null,
            },
          ],
          criteria: input.rubric.criteria.map((c: { id: string }) => ({
            id: c.id,
            level: 3,
            status: 'SCORED',
            evidenceIds: ['submitted'],
            rationale:
              'Synthetic source-backed fixture; no real AI qualification.',
            feedback: 'The response demonstrates this criterion.',
          })),
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            status: 'completed',
            id: randomUUID(),
            model: 'r22-synthetic-http-model',
            usage: { input_tokens: 100, output_tokens: 50 },
            output: [
              {
                type: 'message',
                content: [
                  { type: 'output_text', text: JSON.stringify(verdict) },
                ],
              },
            ],
          }),
        );
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('LOCAL_PROVIDER_ADDRESS_REQUIRED');
    const { AppModule } = await import('../../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(ASSESSMENT_OPTIONS)
      .useValue({
        enabled: true,
        privacyVerified: true,
        synthetic: true,
        leaseMs: 10000,
      })
      .overrideProvider(LanguageEvaluationPort)
      .useValue(
        new OpenAiLanguageEvaluationAdapter({
          apiKey: 'local-fixture-only',
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          model: 'fixture-requested',
          timeoutMs: 3000,
        }),
      )
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const { seedLearningPrograms } = await import(
      '../../src/learning-programs/infrastructure/seed-learning-programs.js'
    );
    const { seedFoundationCurriculum } = await import(
      '../../src/curriculum/infrastructure/seed-foundation.js'
    );
    await seedLearningPrograms(db);
    await seedFoundationCurriculum(db, app.get(ObjectStorage));
    for (const index of [0, 1]) {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/api/v1/auth/register')
        .send({
          email: `r22-${randomUUID()}@example.test`,
          displayName: 'R22 synthetic learner',
          password: 'r22-synthetic-password-long',
        })
        .expect(201);
      const state = (await agent.get('/api/v1/me/onboarding').expect(200)).body;
      const level = state.eligibleLevels.find(
        (l: { available: boolean }) => l.available,
      );
      expect(level).toBeDefined();
      await agent
        .post('/api/v1/me/onboarding/self-placement')
        .send({
          clientConfirmationId: randomUUID(),
          selectedLevelCode: level.code,
        })
        .expect(200);
      if (index === 0) learner = agent;
      else _outsider = agent;
    }
  });
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
    server?.close();
  });
  async function fixture() {
    const session = (
      await learner
        .post('/api/v1/learning-sessions')
        .send({ clientSessionId: randomUUID(), durationMinutes: 60 })
        .expect(201)
    ).body;
    await learner
      .post(`/api/v1/learning-sessions/${session.id}/start`)
      .expect(200);
    const version = await db.lessonVersion.findUniqueOrThrow({
      where: { id: session.lessonVersionId },
    });
    const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    let attemptId = '';
    for (const id of session.plan.blocks.flatMap(
      (b: { activityIds: string[] }) => b.activityIds,
    )) {
      const activity = snapshot.activities.find((a) => a.id === id)!;
      const response =
        activity.activityType === 'reading' ||
        activity.activityType === 'listening'
          ? {
              answerIndexes: activity.payload.questions.map(
                (q) => q.answerIndex,
              ),
            }
          : { text: 'Hello team.' };
      const attempt = (
        await learner
          .post(`/api/v1/activities/${id}/attempts`)
          .send({
            sessionId: session.id,
            clientAttemptId: randomUUID(),
            response,
          })
          .expect(201)
      ).body;
      if (activity.activityType === 'speaking') {
        attemptId = attempt.id;
        break;
      }
    }
    const attempt = await db.activityAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    const recording = await db.recording.create({
      data: {
        learnerId: attempt.learnerId,
        sessionId: session.id,
        activityId: attempt.activityId,
        attemptId,
        storageKey: 'synthetic-race/' + randomUUID(),
        mimeType: 'audio/wav',
        byteSize: 1,
        checksum: 'a'.repeat(64),
        consentPolicyVersion: 'recording-v1',
        consentScope: 'teacher-ai',
        consentAcceptedAt: new Date(),
        retentionUntil: new Date(Date.now() + 60000),
        transcript: 'Hello team.',
        speechMetrics: {
          assessmentEvidence: { synthetic: true, verified: false },
        },
      },
    });
    return { attemptId, recording };
  }
  it('rejects recording retention expiry that occurs while provider evaluation is in flight', async () => {
    const { attemptId, recording } = await fixture();
    let resume!: () => void;
    let arrived!: () => void;
    const seen = new Promise<void>((r) => (arrived = r));
    const barrier = new Promise<void>((r) => (resume = r));
    pauseResponse = async () => {
      arrived();
      await barrier;
    };
    const pending = learner
      .post(`/api/v1/attempts/${attemptId}/assessments`)
      .send({ idempotencyKey: randomUUID() })
      .then((r) => r);
    await seen;
    await db.recording.update({
      where: { id: recording.id },
      data: { retentionUntil: new Date('2000-01-01') },
    });
    pauseResponse = undefined;
    resume();
    const response = await pending;
    expect(response.status, JSON.stringify(response.body)).toBe(202);
    expect(response.body.status).toBe('FAILED');
    expect(response.body.totalScore).toBeNull();
    expect(
      (
        await db.evaluationRun.findUniqueOrThrow({
          where: { id: response.body.id },
        })
      ).status,
    ).toBe('FAILED');
  });
  it('serializes final persistence behind an already-started deletion transaction', async () => {
    const { attemptId, recording } = await fixture();
    let resumeProvider!: () => void;
    let arrived!: () => void;
    const seen = new Promise<void>((r) => (arrived = r));
    const providerBarrier = new Promise<void>((r) => (resumeProvider = r));
    pauseResponse = async () => {
      arrived();
      await providerBarrier;
    };
    let evaluationSettled = false;
    const pending = learner
      .post(`/api/v1/attempts/${attemptId}/assessments`)
      .send({ idempotencyKey: randomUUID() })
      .then((r) => {
        evaluationSettled = true;
        return r;
      });
    await seen;
    let deletionLocked!: () => void;
    let commitDeletion!: () => void;
    const locked = new Promise<void>((r) => (deletionLocked = r));
    const release = new Promise<void>((r) => (commitDeletion = r));
    const deleting = db.$transaction(
      async (tx) => {
        await tx.recording.update({
          where: { id: recording.id },
          data: { deletionRequestedAt: new Date(), deletedAt: new Date() },
        });
        deletionLocked();
        await release;
      },
      { timeout: 10000 },
    );
    await locked;
    pauseResponse = undefined;
    resumeProvider();
    // MVCC permits an unlocked preliminary read to see the old row. A correct final
    // transaction waits on the recording lock instead of committing a terminal evaluation.
    let waitsForLock = false;
    const deadline = Date.now() + 3000;
    while (!evaluationSettled && Date.now() < deadline) {
      const rows = await db.$queryRaw<
        Array<{ waiting: boolean }>
      >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Recording%') AS waiting`;
      if (rows[0]?.waiting) {
        waitsForLock = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    commitDeletion();
    await deleting;
    const response = await pending;
    expect(waitsForLock).toBe(true);
    expect(response.status).toBe(202);
    expect(response.body.status).toBe('FAILED');
    expect(response.body.totalScore).toBeNull();
  });
});
