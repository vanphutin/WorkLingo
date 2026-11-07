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
describe('immutable history survives audio retention and revocation on owned disposable PostgreSQL', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    learner: ReturnType<typeof request.agent>,
    outsider: ReturnType<typeof request.agent>;
  let providerCalls = 0;
  beforeAll(async () => {
    db = new PrismaService({ datasourceUrl: url });
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (b) => {
        raw += b;
      });
      req.on('end', () => {
        providerCalls++;
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
      else outsider = agent;
    }
  });
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
    server?.close();
  });
  it('keeps listening history and terminal/pending cancellation available after artifact revocation while refusing new evaluation', async () => {
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
    let activityId = '';
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
          : { text: 'Synthetic team response.' };
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
      if (activity.activityType === 'listening') {
        attemptId = attempt.id;
        activityId = id;
        break;
      }
    }
    const path = `/api/v1/attempts/${attemptId}/assessments`;
    const evaluated = (
      await learner
        .post(path)
        .send({ idempotencyKey: randomUUID() })
        .expect(202)
    ).body;
    const row = await db.evaluationRun.findUniqueOrThrow({
      where: { id: evaluated.id },
    });
    const pending = await db.evaluationRun.create({
      data: {
        attemptId,
        requestKey: randomUUID(),
        inputHash: row.inputHash,
        contextHash: row.contextHash,
        status: 'EVALUATING',
        audit: row.audit!,
        leaseUntil: new Date(Date.now() + 60000),
      },
    });
    const refs = await db.lessonVersionAudioArtifact.findMany({
      where: { lessonVersionId: session.lessonVersionId },
      include: { audioArtifact: true },
    });
    try {
      await db.audioArtifact.updateMany({
        where: { id: { in: refs.map((r) => r.audioArtifactId) } },
        data: { status: 'STALE' },
      });
      const history = await learner.get(path);
      expect(history.status, JSON.stringify(history.body)).toBe(200);
      expect(
        history.body.items.find((r: { id: string }) => r.id === evaluated.id),
      ).toEqual(evaluated);
      expect(
        (
          await learner
            .post(`/api/v1/assessments/${evaluated.id}/cancel`)
            .expect(200)
        ).body,
      ).toEqual(evaluated);
      const cancelled = (
        await learner
          .post(`/api/v1/assessments/${pending.id}/cancel`)
          .expect(200)
      ).body;
      expect(cancelled).toMatchObject({
        status: 'CANCELLED',
        contextHash: row.contextHash,
        inputHash: row.inputHash,
        totalScore: null,
      });
      const calls = providerCalls;
      await learner
        .post(path)
        .send({ idempotencyKey: randomUUID() })
        .expect(404);
      expect(providerCalls).toBe(calls);
      await outsider.get(path).expect(404);
      await outsider
        .post(`/api/v1/assessments/${evaluated.id}/cancel`)
        .expect(404);
      expect(activityId).not.toBe('');
    } finally {
      for (const ref of refs)
        await db.audioArtifact.update({
          where: { id: ref.audioArtifactId },
          data: { status: ref.audioArtifact.status },
        });
    }
  });
  it('keeps speaking history available after recording deletion but rejects new evaluation', async () => {
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
        storageKey: 'synthetic-retention/' + randomUUID(),
        mimeType: 'audio/wav',
        byteSize: 1,
        checksum: 'a'.repeat(64),
        consentPolicyVersion: 'recording-v1',
        consentScope: 'teacher-ai',
        consentAcceptedAt: new Date(),
        transcript: 'Hello team.',
        speechMetrics: {
          assessmentEvidence: { synthetic: true, verified: false },
        },
      },
    });
    const path = `/api/v1/attempts/${attemptId}/assessments`;
    const evaluated = (
      await learner
        .post(path)
        .send({ idempotencyKey: randomUUID() })
        .expect(202)
    ).body;
    expect(evaluated).toMatchObject({
      status: 'NOT_SCORABLE',
      totalScore: null,
    });
    await db.recording.update({
      where: { id: recording.id },
      data: { deletedAt: new Date(), deletionRequestedAt: new Date() },
    });
    expect((await learner.get(path).expect(200)).body.items).toEqual([
      evaluated,
    ]);
    expect(
      (
        await learner
          .post(`/api/v1/assessments/${evaluated.id}/cancel`)
          .expect(200)
      ).body,
    ).toEqual(evaluated);
    const calls = providerCalls;
    await learner.post(path).send({ idempotencyKey: randomUUID() }).expect(422);
    expect(providerCalls).toBe(calls);
  });
});
