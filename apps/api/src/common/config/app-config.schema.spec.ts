import path from 'node:path';

import {
  evaluationDtoSchema,
  recordingSubmissionResultSchema,
  writingDraftSchema,
} from '@worklingo/contracts';
import { describe, expect, it } from 'vitest';

import { parseAppConfig } from './app-config.schema';

const validEnvironment = {
  API_PORT: '4000',
  DATABASE_URL: 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo',
  SESSION_SECRET: 'a-local-secret-with-at-least-32-characters',
  WEB_PORT: '3000',
  WORKLINGO_DATA_DIR: './data',
} satisfies NodeJS.ProcessEnv;

describe('parseAppConfig', () => {
  it.each(['DATABASE_URL', 'SESSION_SECRET', 'WORKLINGO_DATA_DIR'] as const)(
    'rejects a missing %s',
    (key) => {
      const environment = { ...validEnvironment };
      delete environment[key];

      expect(() => parseAppConfig(environment)).toThrow(key);
    },
  );

  it('normalizes ports and the data directory', () => {
    const config = parseAppConfig(validEnvironment);

    expect(config.apiPort).toBe(4000);
    expect(config.webPort).toBe(3000);
    expect(path.isAbsolute(config.dataDir)).toBe(true);
    expect(config.dataDir).toBe(path.resolve('./data'));
  });

  it('rejects the documented placeholder session secret', () => {
    expect(() =>
      parseAppConfig({
        ...validEnvironment,
        SESSION_SECRET: 'replace-with-a-local-development-secret',
      }),
    ).toThrow('SESSION_SECRET');
  });

  it('uses bounded local fake-provider defaults without credentials', () => {
    const config = parseAppConfig(validEnvironment);

    expect(config.ai).toEqual({
      draftRetentionDays: 30,
      fakeEvaluationRateLimitFailures: 0,
      languageEvaluation: { provider: 'fake' },
      maxAttempts: 3,
      providerTimeoutMs: 30_000,
      recordingMaxBytes: 10 * 1024 * 1024,
      recordingMaxDurationSeconds: 120,
      recordingRetentionDays: 7,
      speechToText: { locale: 'en-US', provider: 'fake' },
      textToSpeech: { provider: 'fake', voice: 'en-US-JennyNeural' },
    });
    expect(config.jobs).toEqual({
      leaseMs: 30_000,
      pollIntervalMs: 1_000,
      workerEnabled: false,
    });
  });

  it('treats blank optional provider values from .env.example as unconfigured', () => {
    const config = parseAppConfig({
      ...validEnvironment,
      MICROSOFT_SPEECH_KEY: '',
      MICROSOFT_SPEECH_REGION: '',
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: '',
      OPENAI_MODEL: '',
    });

    expect(config.ai.speechToText.provider).toBe('fake');
    expect(config.ai.languageEvaluation.provider).toBe('fake');
    expect(config.ai.textToSpeech.provider).toBe('fake');
  });

  it('permits deterministic fake failures only in explicit E2E mode', () => {
    expect(() => parseAppConfig({
      ...validEnvironment,
      WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: '3',
    })).toThrow('WORKLINGO_TEST_FAKE_EVALUATION_FAILURES');

    expect(parseAppConfig({
      ...validEnvironment,
      NODE_ENV: 'test',
      WORKLINGO_E2E_MODE: 'true',
      WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: '3',
    }).ai.fakeEvaluationRateLimitFailures).toBe(3);

    expect(() => parseAppConfig({
      ...validEnvironment,
      NODE_ENV: 'production',
      WORKLINGO_E2E_MODE: 'true',
      WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: '3',
    })).toThrow('WORKLINGO_TEST_FAKE_EVALUATION_FAILURES');
  });

  it.each([
    ['WORKLINGO_STT_PROVIDER', 'microsoft', 'MICROSOFT_SPEECH_KEY'],
    ['WORKLINGO_TTS_PROVIDER', 'microsoft', 'MICROSOFT_SPEECH_KEY'],
    ['WORKLINGO_LANGUAGE_EVALUATION_PROVIDER', 'openai-compatible', 'OPENAI_API_KEY'],
  ] as const)('requires credentials when %s selects %s', (key, value, missingField) => {
    expect(() => parseAppConfig({ ...validEnvironment, [key]: value })).toThrow(missingField);
  });

  it('accepts independently configured Microsoft Speech and OpenAI-compatible providers', () => {
    const config = parseAppConfig({
      ...validEnvironment,
      MICROSOFT_SPEECH_KEY: 'test-only-microsoft-key',
      MICROSOFT_SPEECH_REGION: 'southeastasia',
      OPENAI_API_KEY: 'test-only-openai-key',
      OPENAI_BASE_URL: 'https://api.example.test/v1',
      OPENAI_MODEL: 'evaluation-model',
      WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'openai-compatible',
      WORKLINGO_STT_PROVIDER: 'microsoft',
      WORKLINGO_TTS_PROVIDER: 'microsoft',
    });

    expect(config.ai.speechToText).toMatchObject({
      provider: 'microsoft',
      region: 'southeastasia',
    });
    expect(config.ai.languageEvaluation).toMatchObject({
      baseUrl: 'https://api.example.test/v1',
      model: 'evaluation-model',
      provider: 'openai-compatible',
    });
    expect(config.ai.textToSpeech).toMatchObject({ provider: 'microsoft' });
  });

  it.each([
    ['PROVIDER_TIMEOUT_MS', '999'],
    ['PROVIDER_MAX_ATTEMPTS', '6'],
    ['RECORDING_RETENTION_DAYS', '0'],
    ['WRITING_DRAFT_RETENTION_DAYS', '366'],
    ['RECORDING_MAX_BYTES', '1023'],
    ['RECORDING_MAX_DURATION_SECONDS', '601'],
    ['JOB_WORKER_POLL_INTERVAL_MS', '99'],
    ['JOB_WORKER_LEASE_MS', '4999'],
  ] as const)('rejects unsafe %s=%s', (key, value) => {
    expect(() => parseAppConfig({ ...validEnvironment, [key]: value })).toThrow(key);
  });

  it('never includes supplied provider secrets in configuration errors', () => {
    const secret = 'do-not-leak-this-provider-secret';

    expect(() =>
      parseAppConfig({
        ...validEnvironment,
        MICROSOFT_SPEECH_KEY: secret,
        WORKLINGO_STT_PROVIDER: 'microsoft',
      }),
    ).toThrowError(expect.not.stringContaining(secret));
  });
});

describe('Teacher AI shared contracts', () => {
  it('accepts a bounded evaluated result and rejects excessive feedback', () => {
    const valid = {
      attemptId: '4b04b337-7101-4f71-9960-886d74632a5f',
      completedAt: '2026-10-07T12:00:00.000Z',
      feedback: {
        correctedExample: 'Hello, I am Lan from the support team.',
        improvements: ['Use the target greeting.'],
        strengths: ['Clear workplace introduction.'],
        summary: 'Bạn đã hoàn thành đúng mục tiêu giới thiệu.',
      },
      recording: null,
      retryable: false,
      score: 0.82,
      scores: {
        clarity: 0.8,
        meaningAndLogic: 0.8,
        pronunciationOrFluency: null,
        targetLanguage: 0.9,
        taskCompletion: 0.8,
      },
      status: 'evaluated',
      transcript: null,
    };

    expect(evaluationDtoSchema.parse(valid)).toEqual(valid);
    expect(
      evaluationDtoSchema.safeParse({
        ...valid,
        feedback: { ...valid.feedback, improvements: ['one', 'two', 'three', 'four'] },
      }).success,
    ).toBe(false);
  });

  it('validates recording submission and revisioned writing draft identifiers', () => {
    expect(
      recordingSubmissionResultSchema.parse({
        attemptId: '4b04b337-7101-4f71-9960-886d74632a5f',
        jobId: '7393762a-2431-48da-a53d-20e20a820a6f',
        recordingId: '438557ae-6c94-40dc-9003-7740d5c63922',
        status: 'processing',
      }).status,
    ).toBe('processing');

    expect(
      writingDraftSchema.parse({
        activityId: '438557ae-6c94-40dc-9003-7740d5c63922',
        revision: 2,
        sessionId: '7393762a-2431-48da-a53d-20e20a820a6f',
        text: 'Please send the report by Friday.',
        updatedAt: '2026-10-07T12:00:00.000Z',
      }).revision,
    ).toBe(2);
  });
});
