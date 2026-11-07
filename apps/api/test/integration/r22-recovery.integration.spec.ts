import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
describe('R22 recovery, cancellation and authorization on owned disposable PostgreSQL', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    learner: ReturnType<typeof request.agent>,
    outsider: ReturnType<typeof request.agent>;
  let providerCalls = 0;
  let pauseResponse: ((input: { role: string }) => Promise<void>) | undefined;
  beforeAll(async () => {
    db = new PrismaService({ datasourceUrl: url });
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (b) => {
        raw += b;
      });
      req.on('end', async () => {
        providerCalls++;
        const body = JSON.parse(raw);
        const input = JSON.parse(body.input);
        if (pauseResponse) await pauseResponse(input);
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
        leaseMs: 60000,
      })
      .overrideProvider(LanguageEvaluationPort)
      .useValue(
        new OpenAiLanguageEvaluationAdapter({
          apiKey: 'local-fixture-only',
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          model: 'fixture-requested',
          timeoutMs: 20000,
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
  async function writingFixture() {
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
          : { text: 'Hello team. I will complete the report today.' };
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
      if (activity.activityType === 'writing') return { attemptId: attempt.id };
    }
    throw new Error('WRITING_FIXTURE_REQUIRED');
  }
  function barrier() {
    let arrive!: () => void;
    let resume!: () => void;
    const seen = new Promise<void>((r) => (arrive = r));
    const wait = new Promise<void>((r) => (resume = r));
    let first = true;
    pauseResponse = async () => {
      if (first) {
        first = false;
        arrive();
        await wait;
      }
    };
    return { seen, resume };
  }
  it('takes over an expired generation and prevents the stale in-flight worker from overwriting its recovered result', async () => {
    const { attemptId } = await writingFixture();
    const key = randomUUID();
    const gate = barrier();
    const path = `/api/v1/attempts/${attemptId}/assessments`;
    const original = learner
      .post(path)
      .send({ idempotencyKey: key })
      .then((r) => r);
    await gate.seen;
    const admitted = await db.evaluationRun.findUniqueOrThrow({
      where: { attemptId_requestKey: { attemptId, requestKey: key } },
    });
    await db.evaluationRun.update({
      where: { id: admitted.id },
      data: { leaseUntil: new Date('2000-01-01') },
    });
    const recovered = (
      await learner.post(path).send({ idempotencyKey: key }).expect(202)
    ).body;
    expect(recovered.status).toBe('SCORED');
    const row = await db.evaluationRun.findUniqueOrThrow({
      where: { id: admitted.id },
    });
    expect(row.generation).toBe(admitted.generation + 1);
    pauseResponse = undefined;
    gate.resume();
    const late = await original;
    expect(late.status).toBe(202);
    expect(late.body).toEqual(recovered);
    expect(
      await db.evaluationRun.findUniqueOrThrow({ where: { id: admitted.id } }),
    ).toEqual(row);
  });
  it('cancels a provider-blocked run and fences its eventual response from terminal history', async () => {
    const { attemptId } = await writingFixture();
    const key = randomUUID();
    const gate = barrier();
    const pending = learner
      .post(`/api/v1/attempts/${attemptId}/assessments`)
      .send({ idempotencyKey: key })
      .then((r) => r);
    await gate.seen;
    const admitted = await db.evaluationRun.findUniqueOrThrow({
      where: { attemptId_requestKey: { attemptId, requestKey: key } },
    });
    await outsider
      .post(`/api/v1/assessments/${admitted.id}/cancel`)
      .expect(404);
    const cancelled = (
      await learner
        .post(`/api/v1/assessments/${admitted.id}/cancel`)
        .expect(200)
    ).body;
    expect(cancelled).toMatchObject({ status: 'CANCELLED', totalScore: null });
    const row = await db.evaluationRun.findUniqueOrThrow({
      where: { id: admitted.id },
    });
    expect(row.generation).toBe(admitted.generation + 1);
    pauseResponse = undefined;
    gate.resume();
    const late = await pending;
    expect(late.body).toEqual(cancelled);
    expect(
      await db.evaluationRun.findUniqueOrThrow({ where: { id: row.id } }),
    ).toEqual(row);
  });
  it('keeps the recovered controller cancellable after the stale worker finishes', async () => {
    const { attemptId } = await writingFixture();
    const key = randomUUID();
    let arrivedA!: () => void,
      arrivedB!: () => void,
      releaseA!: () => void,
      releaseB!: () => void;
    const seenA = new Promise<void>((r) => (arrivedA = r)),
      seenB = new Promise<void>((r) => (arrivedB = r)),
      waitA = new Promise<void>((r) => (releaseA = r)),
      waitB = new Promise<void>((r) => (releaseB = r));
    let primaries = 0;
    const adapter = app.get(LanguageEvaluationPort);
    const port = {
      assess: async (
        input: Parameters<NonNullable<LanguageEvaluationPort['assess']>>[0],
        signal?: AbortSignal,
      ) => {
        if (input.role === 'primary') {
          primaries++;
          if (primaries === 1) {
            arrivedA();
            await waitA;
          } else if (primaries === 2) {
            arrivedB();
            await waitB;
          }
        }
        return adapter.assess!(input, signal);
      },
    } as LanguageEvaluationPort;
    const service = new AssessmentHistoryService(db, port, {
      enabled: true,
      privacyVerified: true,
      synthetic: true,
      leaseMs: 60000,
    });
    const attempt = await db.activityAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    const stale = service.requestAssessment(attempt.learnerId, attemptId, key);
    await seenA;
    const row = await db.evaluationRun.findUniqueOrThrow({
      where: { attemptId_requestKey: { attemptId, requestKey: key } },
    });
    await db.evaluationRun.update({
      where: { id: row.id },
      data: { leaseUntil: new Date('2000-01-01') },
    });
    const recovered = service.requestAssessment(
      attempt.learnerId,
      attemptId,
      key,
    );
    await seenB;
    releaseA();
    await stale;
    const beforeCancel = await db.evaluationRun.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(beforeCancel.status, JSON.stringify(beforeCancel.audit)).toBe(
      'EVALUATING',
    );
    expect((await service.cancel(attempt.learnerId, row.id)).status).toBe(
      'CANCELLED',
    );
    const callsBeforeRelease = providerCalls;
    releaseB();
    const final = await recovered;
    expect(final.status).toBe('CANCELLED');
    expect(providerCalls).toBe(callsBeforeRelease);
  });
  it('rejects same key with changed persisted submission or pinned admission identity without another provider request', async () => {
    const { attemptId } = await writingFixture();
    const key = randomUUID();
    const path = `/api/v1/attempts/${attemptId}/assessments`;
    await learner.post(path).send({ idempotencyKey: key }).expect(202);
    const original = await db.activityAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    const calls = providerCalls;
    await db.activityAttempt.update({
      where: { id: attemptId },
      data: { rawResponse: { text: 'Changed synthetic submission.' } },
    });
    try {
      const rejected = await learner.post(path).send({ idempotencyKey: key });
      expect(rejected.status, JSON.stringify(rejected.body)).toBe(409);
      expect(providerCalls).toBe(calls);
    } finally {
      await db.activityAttempt.update({
        where: { id: attemptId },
        data: { rawResponse: original.rawResponse! },
      });
    }
    const row = await db.evaluationRun.findFirstOrThrow({
      where: { attemptId },
    });
    const pinnedKey = randomUUID();
    await db.evaluationRun.create({
      data: {
        attemptId,
        requestKey: pinnedKey,
        inputHash: row.inputHash,
        contextHash: 'b'.repeat(64),
        status: 'EVALUATING',
        leaseUntil: new Date('2000-01-01'),
      },
    });
    await learner.post(path).send({ idempotencyKey: pinnedKey }).expect(409);
    expect(providerCalls).toBe(calls);
  });
  it('enforces real learner versus CONTENT_ADMIN history and linked reevaluation authorization', async () => {
    const { attemptId } = await writingFixture();
    const evaluated = (
      await learner
        .post(`/api/v1/attempts/${attemptId}/assessments`)
        .send({ idempotencyKey: randomUUID() })
        .expect(202)
    ).body;
    const historyPath = `/api/v1/admin/assessments?attemptId=${attemptId}`;
    const evaluatePath = `/api/v1/admin/attempts/${attemptId}/assessments`;
    await outsider.get(historyPath).expect(403);
    await outsider
      .post(evaluatePath)
      .send({ idempotencyKey: randomUUID() })
      .expect(403);
    await outsider.get('/api/v1/admin/assessment-providers').expect(403);
    const admin = request.agent(app.getHttpServer());
    const email = `r22-admin-${randomUUID()}@example.test`;
    await admin
      .post('/api/v1/auth/register')
      .send({
        email,
        displayName: 'Synthetic content admin',
        password: 'r22-synthetic-password-long',
      })
      .expect(201);
    await db.user.update({ where: { email }, data: { role: 'CONTENT_ADMIN' } });
    const observedCalls = providerCalls;
    const operations = (
      await admin.get('/api/v1/admin/assessment-providers').expect(200)
    ).body;
    expect(operations.capabilities).not.toBeNull();
    expect(operations.health).not.toBeNull();
    expect(providerCalls).toBe(observedCalls);
    const history = (await admin.get(historyPath).expect(200)).body;
    expect(history.items[0].id).toBe(evaluated.id);
    expect(history.audit[0]).toHaveProperty('audit.privateContext');
    const next = (
      await admin
        .post(evaluatePath)
        .send({
          idempotencyKey: randomUUID(),
          previousEvaluationId: evaluated.id,
        })
        .expect(202)
    ).body;
    expect(next.previousEvaluationId).toBe(evaluated.id);
    expect(await db.evaluationRun.count({ where: { attemptId } })).toBe(2);
  });
  it('applies, rolls back empty DDL and reapplies the migration only in a fresh owned schema', async () => {
    const schema = 'r22_migration_' + randomUUID().replaceAll('-', '');
    const migration = readFileSync(
      resolve(
        'prisma/migrations/20261107000100_versioned_assessment_history/migration.sql',
      ),
      'utf8',
    );
    const functionStart = migration.indexOf('CREATE FUNCTION');
    const functionEnd = migration.indexOf('END $$;') + 'END $$;'.length;
    const statements = [
      ...migration
        .slice(0, functionStart)
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      migration.slice(functionStart, functionEnd),
      migration.slice(functionEnd).trim(),
    ];
    const publicCount = await db.evaluationRun.count();
    await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
        await tx.$executeRawUnsafe(
          `SET LOCAL search_path TO "${schema}", public`,
        );
        await tx.$executeRawUnsafe(
          'CREATE TABLE "ActivityAttempt" ("id" UUID PRIMARY KEY)',
        );
        const apply = async () => {
          for (const statement of statements)
            await tx.$executeRawUnsafe(statement);
        };
        await apply();
        const first = await tx.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*) AS count FROM "EvaluationRun"`;
        expect(Number(first[0]!.count)).toBe(0);
        // Rollback is deliberately limited to this newly created, empty table; never
        // attempts to delete or rewrite terminal history in public or another schema.
        await tx.$executeRawUnsafe('DROP TABLE "EvaluationRun"');
        await tx.$executeRawUnsafe(
          'DROP FUNCTION protect_terminal_evaluation_run()',
        );
        const absent = await tx.$queryRaw<
          Array<{ table_name: string | null }>
        >`SELECT to_regclass(${schema + '."EvaluationRun"'})::text AS table_name`;
        expect(absent[0]!.table_name).toBeNull();
        await apply();
        const triggers = await tx.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT COUNT(*) AS count FROM pg_trigger t JOIN pg_class c ON t.tgrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname=${schema} AND c.relname='EvaluationRun' AND t.tgname='EvaluationRun_immutable'`;
        expect(Number(triggers[0]!.count)).toBe(1);
      },
      { timeout: 20000 },
    );
    expect(await db.evaluationRun.count()).toBe(publicCount);
  });
});
