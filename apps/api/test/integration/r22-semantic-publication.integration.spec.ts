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
import { canonicalLessonSource } from '@worklingo/test-fixtures';
import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import { AudioGenerationHandler } from '../../src/content-authoring/application/audio-generation.handler.js';
import type { ClaimedJob } from '../../src/jobs/domain/job-handler.port.js';
import { SessionCreationService } from '../../src/learning-sessions/application/session-creation.service.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { r22OwnedDatabaseUrl as url } from './r22-owned-database.js';
describe('four-skill actual application assessment on owned disposable PostgreSQL', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    _learner: ReturnType<typeof request.agent>,
    _outsider: ReturnType<typeof request.agent>;
  let providerCalls = 0;
  const disagree = false;
  beforeAll(async () => {
    db = new PrismaService({ datasourceUrl: url });
    server = createServer((req, res) => {
      let raw = '';
      req.on('data', (b) => {
        raw += b;
      });
      req.on('end', () => {
        const body = JSON.parse(raw);
        if (typeof body.input !== 'string' || body.input.startsWith('<')) {
          res.statusCode = 400;
          res.end('{}');
          return;
        }
        providerCalls++;
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
      if (index === 0) _learner = agent;
      else _outsider = agent;
    }
  });
  afterAll(async () => {
    await app?.close();
    server?.close();
  });
  it('publishes authored semantic formats and assesses actual submitted answers with private source context', async () => {
    const email = `r22-publisher-${randomUUID()}@example.test`,
      password = 'SyntheticAdminPass123!';
    await seedContentAdmin(db, {
      email,
      password,
      displayName: 'Synthetic publisher',
    });
    const admin = request.agent(app.getHttpServer());
    await admin
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    let source = canonicalLessonSource.replace(
      'slug: handling-customer-complaints',
      `slug: r22-semantic-${randomUUID()}`,
    );
    for (const [slug, type, reference, skill] of [
      [
        'reading-comprehension',
        'open_ended',
        'content_refs: complaint-email',
        'reading',
      ],
      [
        'listening-comprehension',
        'short_answer',
        'audio_ref: complaint-call\ncontent_refs: complaint-email',
        'listening',
      ],
    ]) {
      source = source.replace(
        new RegExp(`\\[ACTIVITY ${slug}\\][\\s\\S]*?\\[/ACTIVITY\\]`, 'u'),
        `[ACTIVITY ${slug}]\nlearning_block: ${skill === 'reading' ? 'read_decode' : 'listen_reason'}\nactivity_type: ${skill}\nresponse_type: ${type}\nskills: ${skill}\n${reference}\nlanguage_block_refs: apologize\nsemantic_criteria: Explain the complaint using the source, allowing accurate paraphrases.\nQUESTION: Explain the complaint.\nEXPLANATION: Use the complaint source.\nEVIDENCE: complaint-email:4\n[/ACTIVITY]`,
      );
    }
    const draft = (
      await admin
        .post('/api/v1/admin/content-imports')
        .send({ rawSource: source })
        .expect(201)
    ).body;
    const validated = await admin
      .post(`/api/v1/admin/content-imports/${draft.id}/validate`)
      .send({ expectedDraftRevision: draft.draftRevision });
    expect(validated.status, JSON.stringify(validated.body)).toBe(200);
    await admin
      .post(`/api/v1/admin/content-imports/${draft.id}/generate-audio`)
      .send({
        audioScriptSlug: 'complaint-call',
        providerId: 'fake-tts',
        idempotencyKey: randomUUID(),
      })
      .expect(202);
    const job = await db.job.findFirstOrThrow({
      where: { contentImportId: draft.id, type: 'GENERATE_AUDIO' },
      orderBy: { createdAt: 'desc' },
    });
    await app.get(AudioGenerationHandler).handle(job as unknown as ClaimedJob);
    const artifact = await db.audioArtifact.findFirst({
      where: { contentImportId: draft.id, status: 'READY' },
    });
    expect(artifact).not.toBeNull();
    const published = await admin
      .post(`/api/v1/admin/content-imports/${draft.id}/publish`)
      .send({
        expectedDraftRevision: draft.draftRevision,
        expectedSourceHash: draft.sourceHash,
        idempotencyKey: randomUUID(),
        selectedAudioArtifacts: { 'complaint-call': artifact!.id },
      });
    expect(published.status, JSON.stringify(published.body)).toBe(200);
    const version = await db.lessonVersion.findUniqueOrThrow({
        where: { id: published.body.lessonVersionId },
      }),
      snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    for (const activity of snapshot.activities.filter((a) =>
      a.slug.endsWith('comprehension'),
    )) {
      expect(
        'questions' in activity.payload && activity.payload.questions[0],
      ).toMatchObject({
        responseType:
          activity.activityType === 'reading' ? 'open_ended' : 'short_answer',
        semanticCriteria: expect.any(String),
      });
    }
    const level = await db.level.findFirstOrThrow();
    const mission = await db.mission.create({
      data: {
        slug: `r22-semantic-${randomUUID()}`,
        levelId: level.id,
        title: 'Synthetic semantic publication',
        objective: 'Synthetic publication boundary',
        order: 100000 + Math.floor(Math.random() * 1000000000),
        purpose: 'LEARNING',
        status: 'PUBLISHED',
        lessons: { create: { lessonId: version.lessonId, order: 0 } },
      },
    });
    const user = await db.user.findFirstOrThrow({
      where: { email: { startsWith: 'r22-' }, role: 'LEARNER' },
      orderBy: { createdAt: 'desc' },
    });
    // Session creation uses the real application service, explicitly targeting the new synthetic publication.
    const session = await db.$transaction((tx) =>
      app
        .get(SessionCreationService)
        .create(tx, {
          learnerId: user.id,
          clientSessionId: randomUUID(),
          durationMinutes: 60,
          reviewItems: [],
          mission: {
            id: mission.id,
            slug: mission.slug,
            title: mission.title,
            objective: mission.objective,
            levelCode: level.code,
            purpose: 'learning',
            lessonVersion: {
              ...snapshot,
              id: version.id,
              version: version.version,
            },
          },
        }),
    );
    // Authenticate the same user via a fresh dedicated learner to avoid relying on seeded identities.
    const owned = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const actor = request.agent(app.getHttpServer());
    await actor
      .post('/api/v1/auth/login')
      .send({ email: owned.email, password: 'r22-synthetic-password-long' })
      .expect(200);
    await actor
      .post(`/api/v1/learning-sessions/${session.id}/start`)
      .expect(200);
    const before = providerCalls;
    let semanticCount = 0;
    for (const id of session.plan.blocks.flatMap((b) => b.activityIds)) {
      const activity = snapshot.activities.find((a) => a.id === id)!;
      const projected = await actor
        .get(`/api/v1/learning-sessions/${session.id}/activities/${id}`)
        .expect(200);
      for (const key of [
        'semanticCriteria',
        'acceptedAnswers',
        'answerIndex',
        'audioText',
      ])
        expect(JSON.stringify(projected.body)).not.toContain(`"${key}"`);
      const semantic =
        activity.activityType === 'reading' ||
        activity.activityType === 'listening';
      const response = semantic
        ? {
            answerIndexes: [-1],
            answers: [
              'The customer reports a problem and requests help resolving the complaint.',
            ],
          }
        : { text: 'We apologize for the delay and will resolve the issue.' };
      const attempt = (
        await actor
          .post(`/api/v1/activities/${id}/attempts`)
          .send({
            sessionId: session.id,
            clientAttemptId: randomUUID(),
            response,
          })
          .expect(201)
      ).body;
      if (semantic) {
        semanticCount++;
        expect(attempt).toMatchObject({
          score: null,
          evaluationStatus: 'submitted',
        });
        const evaluated = await actor
          .post(`/api/v1/attempts/${attempt.id}/assessments`)
          .send({ idempotencyKey: randomUUID() });
        expect(evaluated.status, JSON.stringify(evaluated.body)).toBe(202);
        expect(evaluated.body).toMatchObject({
          status: 'SCORED',
          lessonVersionId: version.id,
          skill: activity.activityType,
        });
        expect(
          evaluated.body.providers.map((p: { role: string }) => p.role),
        ).toEqual(['primary', 'verifier', 'feedback']);
      }
      if (semanticCount === 2) break;
    }
    expect(semanticCount).toBe(2);
    expect(providerCalls - before).toBe(6);
  });
});
