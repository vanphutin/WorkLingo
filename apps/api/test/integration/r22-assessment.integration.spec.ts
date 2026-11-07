import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import {
  ASSESSMENT_OPTIONS,
  AssessmentHistoryService,
} from '../../src/teacher-ai/application/assessment-history.service.js';
import { LanguageEvaluationPort } from '../../src/ai-gateway/domain/language-evaluation.port.js';
import { OpenAiLanguageEvaluationAdapter } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { r22OwnedDatabaseUrl as url } from './r22-owned-database.js';
describe('four-skill actual application assessment on owned disposable PostgreSQL', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    learner: ReturnType<typeof request.agent>,
    outsider: ReturnType<typeof request.agent>;
  let providerCalls = 0;
  let disagree = false;
  const attemptIds: string[] = [];
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
            level: disagree && input.role === 'verifier' ? 1 : 3,
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
  it('persists versioned results for each real submitted skill, idempotency and linked re-evaluation without mutating attempts', async () => {
    const session = (
      await learner
        .post('/api/v1/learning-sessions')
        .send({ clientSessionId: randomUUID(), durationMinutes: 60 })
        .expect(201)
    ).body;
    await learner
      .post(`/api/v1/learning-sessions/${session.id}/start`)
      .expect(200);
    const stored = await db.lessonVersion.findUniqueOrThrow({
      where: { id: session.lessonVersionId },
    });
    const snapshot = lessonSnapshotSchema.parse(stored.parsedContent);
    const seen = new Set<string>();
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
          : { text: 'Hello. My name is Lucy. I work with my team.' };
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
      if (seen.has(activity.activityType)) continue;
      seen.add(activity.activityType);
      attemptIds.push(attempt.id);
      const before = await db.activityAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      const key = randomUUID();
      const requestPath = `/api/v1/attempts/${attempt.id}/assessments`;
      await outsider.get(requestPath).expect(404);
      await outsider
        .post(requestPath)
        .send({ idempotencyKey: randomUUID() })
        .expect(404);
      const evaluatedResponse = await learner
        .post(requestPath)
        .send({ idempotencyKey: key });
      expect(
        evaluatedResponse.status,
        `${activity.activityType}:${JSON.stringify(evaluatedResponse.body)}`,
      ).toBe(202);
      const evaluated = evaluatedResponse.body;
      expect(evaluated).toMatchObject({
        schemaVersion: 'assessment/1',
        submissionId: attempt.id,
        lessonVersionId: stored.id,
        skill: activity.activityType,
      });
      expect(evaluated.status).toBe(
        activity.activityType === 'speaking' ? 'NOT_SCORABLE' : 'SCORED',
      );
      expect(evaluated.totalScore).toBe(
        activity.activityType === 'speaking' ? null : 100,
      );
      const calls = providerCalls;
      const replay = (
        await learner
          .post(requestPath)
          .send({ idempotencyKey: key })
          .expect(202)
      ).body;
      expect(replay).toEqual(evaluated);
      expect(providerCalls).toBe(calls);
      const next = (
        await learner
          .post(requestPath)
          .send({
            idempotencyKey: randomUUID(),
            previousEvaluationId: evaluated.id,
          })
          .expect(202)
      ).body;
      expect(next.previousEvaluationId).toBe(evaluated.id);
      const history = (await learner.get(requestPath).expect(200)).body;
      expect(history.items).toHaveLength(2);
      expect(JSON.stringify(history)).not.toContain('privateContext');
      await expect(
        db.evaluationRun.update({
          where: { id: evaluated.id },
          data: { status: 'FAILED' },
        }),
      ).rejects.toThrow('TERMINAL_EVALUATION_RUN_IMMUTABLE');
      expect(
        await db.activityAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        }),
      ).toEqual(before);
    }
    expect([...seen].sort()).toEqual([
      'listening',
      'reading',
      'speaking',
      'writing',
    ]);
    expect(providerCalls).toBeGreaterThanOrEqual(8);
    expect(
      await db.evaluationRun.count({
        where: { attemptId: { in: attemptIds } },
      }),
    ).toBe(8);
  });
  it('serializes concurrent same-key requests into one run and ignores cancellation of terminal history', async () => {
    const attempt = await db.activityAttempt.findUniqueOrThrow({
      where: { id: attemptIds[0]! },
    });
    const service = app.get(AssessmentHistoryService);
    const key = randomUUID();
    const results = await Promise.all([
      service.requestAssessment(attempt.learnerId, attempt.id, key),
      service.requestAssessment(attempt.learnerId, attempt.id, key),
    ]);
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(
      await db.evaluationRun.count({
        where: { attemptId: attempt.id, requestKey: key },
      }),
    ).toBe(1);
    const final = await service.cancel(attempt.learnerId, results[0]!.id);
    expect(final.status).toBe('SCORED');
  });
  it('calls the adjudicator independently on disagreement before assigning a semantic total', async () => {
    const attempt = await db.activityAttempt.findFirstOrThrow({
      where: { id: { in: attemptIds }, activity: { activityType: 'writing' } },
    });
    disagree = true;
    try {
      const result = await app
        .get(AssessmentHistoryService)
        .requestAssessment(attempt.learnerId, attempt.id, randomUUID());
      expect(result.status).toBe('SCORED');
      expect(result.providers.map((p) => p.role)).toEqual([
        'primary',
        'verifier',
        'adjudicator',
        'feedback',
      ]);
    } finally {
      disagree = false;
    }
  });
});
