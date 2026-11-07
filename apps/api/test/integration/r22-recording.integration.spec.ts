import { createHash, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { ObjectStorage } from '../../src/storage/domain/object-storage.port.js';
import { SpeechToTextPort } from '../../src/ai-gateway/domain/speech-to-text.port.js';
import { LanguageEvaluationPort } from '../../src/ai-gateway/domain/language-evaluation.port.js';
import { MicrosoftSpeechAdapter } from '../../src/ai-gateway/infrastructure/microsoft-speech.adapter.js';
import { OpenAiLanguageEvaluationAdapter } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import { ASSESSMENT_OPTIONS } from '../../src/teacher-ai/application/assessment-history.service.js';
import { TranscribeSpeechHandler } from '../../src/teacher-ai/application/transcribe-speech.handler.js';
import { lessonSnapshotSchema } from '../../src/curriculum/domain/curriculum.types.js';

import { r22OwnedDatabaseUrl as url } from './r22-owned-database.js';
function syntheticWav() {
  const bytes = Buffer.alloc(32044);
  bytes.write('RIFF');
  bytes.writeUInt32LE(32036, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(32000, 40);
  for (let i = 0; i < 16000; i++)
    bytes.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), 44 + i * 2);
  return bytes;
}

describe('R22 real retained recording API with synthetic local HTTP providers', () => {
  let app: INestApplication,
    db: PrismaService,
    server: Server,
    owner: ReturnType<typeof request.agent>,
    outsider: ReturnType<typeof request.agent>;
  let capturedSpeech: Buffer | undefined;
  let speechCalls = 0;
  let assessmentCalls = 0;
  const bytes = syntheticWav();
  const checksum = createHash('sha256').update(bytes).digest('hex');
  beforeAll(async () => {
    db = new PrismaService({ datasourceUrl: url });
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (b) => chunks.push(b));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url?.startsWith('/speech')) {
          speechCalls++;
          capturedSpeech = Buffer.concat(chunks);
          const header = JSON.parse(
            Buffer.from(
              String(req.headers['pronunciation-assessment']),
              'base64',
            ).toString(),
          );
          if (header.Granularity !== 'Phoneme')
            throw new Error('REAL_MICROSOFT_SERIALIZER_EXPECTED');
          res.end(
            JSON.stringify({
              RecognitionStatus: 'Success',
              DisplayText: 'Hello team.',
              NBest: [
                {
                  Confidence: 0.9,
                  PronunciationAssessment: {
                    AccuracyScore: 90,
                    FluencyScore: 80,
                  },
                  Words: [
                    {
                      Word: 'Hello',
                      Offset: 0,
                      Duration: 2000000,
                      PronunciationAssessment: { AccuracyScore: 90 },
                      Phonemes: [
                        {
                          Phoneme: 'h',
                          Offset: 0,
                          Duration: 400000,
                          PronunciationAssessment: { AccuracyScore: 85 },
                        },
                      ],
                      Syllables: [
                        {
                          Syllable: 'hel',
                          Offset: 0,
                          Duration: 1000000,
                          PronunciationAssessment: { AccuracyScore: 90 },
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          );
          return;
        }
        assessmentCalls++;
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const input = JSON.parse(body.input);
        const submission = String(input.submission);
        const verdict = {
          confidence: 'HIGH',
          summary: 'Synthetic fixture only.',
          corrections: [],
          evidence: [
            {
              id: 'submission',
              source: 'submission',
              quote: submission,
              start: 0,
              end: submission.length,
              startMs: null,
              endMs: null,
            },
          ],
          criteria: input.rubric.criteria.map((criterion: { id: string }) => ({
            id: criterion.id,
            level: 3,
            status: 'SCORED',
            evidenceIds: ['submission'],
            rationale:
              'Synthetic local fixture; not learner or AI qualification.',
            feedback: 'Synthetic feedback.',
          })),
        };
        res.end(
          JSON.stringify({
            status: 'completed',
            id: randomUUID(),
            model: 'synthetic-local-recording-model',
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
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('LOCAL_FIXTURE_REQUIRED');
    const microsoft = new MicrosoftSpeechAdapter({
      endpoint: `http://127.0.0.1:${address.port}/speech`,
      key: 'synthetic-only',
      region: 'local',
      timeoutMs: 3000,
    });
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
      .overrideProvider(SpeechToTextPort)
      .useValue({
        transcribe: async (
          input: Parameters<SpeechToTextPort['transcribe']>[0],
        ) => {
          const result = await microsoft.transcribe(input);
          return {
            ...result,
            provider: {
              ...result.provider,
              name: 'fake-microsoft-http-fixture',
            },
          };
        },
      })
      .overrideProvider(LanguageEvaluationPort)
      .useValue(
        new OpenAiLanguageEvaluationAdapter({
          apiKey: 'synthetic-only',
          baseUrl: `http://127.0.0.1:${address.port}/v1`,
          model: 'synthetic-requested',
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
          email: `r22-record-${randomUUID()}@example.test`,
          displayName: 'Synthetic recording learner',
          password: 'synthetic-recording-password-long',
        })
        .expect(201);
      const state = (await agent.get('/api/v1/me/onboarding').expect(200)).body;
      const level = state.eligibleLevels.find(
        (l: { available: boolean }) => l.available,
      );
      await agent
        .post('/api/v1/me/onboarding/self-placement')
        .send({
          clientConfirmationId: randomUUID(),
          selectedLevelCode: level.code,
        })
        .expect(200);
      if (index === 0) owner = agent;
      else outsider = agent;
    }
  });
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
    if (server)
      await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  it('uploads real multipart PCM, persists serialized speech evidence, streams only owner audio and keeps missing acoustic judgments unscored', async () => {
    const session = (
      await owner
        .post('/api/v1/learning-sessions')
        .send({ clientSessionId: randomUUID(), durationMinutes: 60 })
        .expect(201)
    ).body;
    await owner
      .post(`/api/v1/learning-sessions/${session.id}/start`)
      .expect(200);
    const version = await db.lessonVersion.findUniqueOrThrow({
      where: { id: session.lessonVersionId },
    });
    const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
    let speakingId = '';
    for (const id of session.plan.blocks.flatMap(
      (b: { activityIds: string[] }) => b.activityIds,
    )) {
      const activity = snapshot.activities.find((a) => a.id === id)!;
      if (activity.activityType === 'speaking') {
        speakingId = id;
        break;
      }
      const response =
        activity.activityType === 'reading' ||
        activity.activityType === 'listening'
          ? {
              answerIndexes: activity.payload.questions.map(
                (q) => q.answerIndex,
              ),
            }
          : { text: 'Synthetic team response.' };
      await owner
        .post(`/api/v1/activities/${id}/attempts`)
        .send({
          sessionId: session.id,
          clientAttemptId: randomUUID(),
          response,
        })
        .expect(201);
    }
    expect(speakingId).not.toBe('');
    const upload = await owner
      .post(`/api/v1/activities/${speakingId}/recordings`)
      .field('sessionId', session.id)
      .field('clientAttemptId', randomUUID())
      .field('consentAccepted', 'true')
      .field('consentPolicyVersion', 'recording-v1')
      .field('consentScope', 'teacher-ai')
      .attach('audio', bytes, {
        filename: 'synthetic-tone.wav',
        contentType: 'audio/wav',
      });
    expect(upload.status, JSON.stringify(upload.body)).toBe(202);
    const { recordingId, attemptId, jobId } = upload.body;
    const audioPath = `/api/v1/recordings/${recordingId}/audio`;
    await outsider.get(audioPath).expect(404);
    const full = await owner.get(audioPath).expect(200);
    expect(full.headers['cache-control']).toBe('private, no-store');
    expect(full.headers['content-length']).toBe(String(bytes.length));
    await db.recording.update({
      where: { id: recordingId },
      data: { checksum: 'a'.repeat(64) },
    });
    await owner.get(audioPath).expect(404);
    await db.recording.update({
      where: { id: recordingId },
      data: { checksum },
    });
    const partial = await owner
      .get(audioPath)
      .set('Range', 'bytes=0-3')
      .expect(206);
    expect(partial.headers['content-range']).toBe(`bytes 0-3/${bytes.length}`);
    const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
    expect(job).toMatchObject({
      type: 'TRANSCRIBE_SPEECH',
      resourceId: attemptId,
      status: 'PENDING',
    });
    const untranscribed = (
      await owner
        .post(`/api/v1/attempts/${attemptId}/assessments`)
        .send({ idempotencyKey: randomUUID() })
        .expect(202)
    ).body;
    expect(untranscribed.status).toBe('NOT_SCORABLE');
    expect(untranscribed.totalScore).toBeNull();
    expect(
      untranscribed.criteria.every(
        (c: { status: string }) => c.status !== 'SCORED',
      ),
    ).toBe(true);
    expect(untranscribed.providers).toEqual([]);
    expect(assessmentCalls).toBe(0);
    expect(JSON.stringify(untranscribed.evidence)).not.toContain('mimeType');
    await app
      .get(TranscribeSpeechHandler)
      .handle({
        id: job.id,
        type: job.type,
        payload: job.payload as Record<string, unknown>,
        attemptNumber: 1,
        maxAttempts: 3,
      });
    expect(speechCalls).toBe(1);
    expect(capturedSpeech).toEqual(bytes);
    const recording = await db.recording.findUniqueOrThrow({
      where: { id: recordingId },
    });
    expect(recording).toMatchObject({
      checksum,
      durationSeconds: 1,
      transcript: 'Hello team.',
    });
    expect(recording.speechMetrics).toMatchObject({
      accuracy: 0.9,
      fluency: 0.8,
      assessmentEvidence: {
        audioChecksum: checksum,
        durationMs: 1000,
        synthetic: true,
        verified: false,
        dimensions: ['pronunciation', 'fluency'],
        unassessedDimensions: expect.arrayContaining(['intelligibility']),
        words: [
          {
            word: 'Hello',
            phonemes: [
              { phoneme: 'h', offsetMs: 0, durationMs: 40, accuracy: 0.85 },
            ],
          },
        ],
      },
    });
    expect(
      await db.job.count({
        where: { resourceId: attemptId, type: 'EVALUATE_ATTEMPT' },
      }),
    ).toBe(1);
    const assessed = await owner
      .post(`/api/v1/attempts/${attemptId}/assessments`)
      .send({ idempotencyKey: randomUUID() });
    expect(assessed.status, JSON.stringify(assessed.body)).toBe(202);
    expect(assessed.body).toMatchObject({
      skill: 'speaking',
      status: 'NOT_SCORABLE',
      totalScore: null,
    });
    expect(
      assessed.body.criteria.find(
        (criterion: { id: string }) => criterion.id === 'intelligibility',
      ),
    ).toMatchObject({ status: 'NOT_SCORED', rawScore: null });
    expect(assessmentCalls).toBeGreaterThan(0);
    expect(
      assessed.body.providers.every((p: { synthetic: boolean }) => p.synthetic),
    ).toBe(true);
    await outsider.delete(`/api/v1/recordings/${recordingId}`).expect(404);
    await owner.delete(`/api/v1/recordings/${recordingId}`).expect(204);
    await owner.get(audioPath).expect(404);
    const deleted = await db.recording.findUniqueOrThrow({
      where: { id: recordingId },
    });
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.deletionRequestedAt).not.toBeNull();
  });
});
