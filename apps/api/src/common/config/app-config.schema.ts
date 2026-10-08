import path from 'node:path';

import { z } from 'zod';

export interface AppConfig {
  readonly ai: {
    readonly draftRetentionDays: number;
    readonly fakeEvaluationRateLimitFailures: number;
    readonly languageEvaluation:
      | { readonly provider: 'fake' }
      | {
          readonly apiKey: string;
          readonly baseUrl: string;
          readonly model: string;
          readonly provider: 'openai-compatible';
        };
    readonly maxAttempts: number;
    readonly providerTimeoutMs: number;
    readonly recordingMaxBytes: number;
    readonly recordingMaxDurationSeconds: number;
    readonly recordingRetentionDays: number;
    readonly speechToText:
      | { readonly locale: string; readonly provider: 'fake' }
      | {
          readonly key: string;
          readonly locale: string;
          readonly provider: 'microsoft';
          readonly region: string;
        };
    readonly textToSpeech:
      | { readonly provider: 'fake'; readonly voice: string }
      | {
          readonly key: string;
          readonly provider: 'microsoft';
          readonly region: string;
          readonly voice: string;
        };
  };
  readonly adminEmail?: string | undefined;
  readonly adminPassword?: string | undefined;
  readonly apiPort: number;
  readonly dataDir: string;
  readonly databaseUrl: string;
  readonly jobs: {
    readonly leaseMs: number;
    readonly pollIntervalMs: number;
    readonly workerEnabled: boolean;
  };
  readonly sessionSecret: string;
  readonly webPort: number;
}

const blankAsUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? undefined : value;
const optionalNonBlankString = z.preprocess(
  blankAsUndefined,
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(blankAsUndefined, z.url().optional());

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().min(1),
  JOB_WORKER_ENABLED: z.enum(['true', 'false']).default('false'),
  JOB_WORKER_LEASE_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
  JOB_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
  MICROSOFT_SPEECH_KEY: optionalNonBlankString,
  MICROSOFT_SPEECH_LANGUAGE: z.string().min(2).default('en-US'),
  MICROSOFT_SPEECH_REGION: optionalNonBlankString,
  MICROSOFT_SPEECH_VOICE: z.string().min(1).default('en-US-JennyNeural'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: optionalNonBlankString,
  OPENAI_BASE_URL: optionalUrl,
  OPENAI_MODEL: optionalNonBlankString,
  PROVIDER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  RECORDING_MAX_BYTES: z.coerce.number().int().min(1_024).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  RECORDING_MAX_DURATION_SECONDS: z.coerce.number().int().min(1).max(600).default(120),
  RECORDING_RETENTION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  SESSION_SECRET: z
    .string()
    .min(32)
    .refine(
      (value) => value !== 'replace-with-a-local-development-secret',
      'must not use the documented placeholder',
    ),
  WEB_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  WORKLINGO_ADMIN_EMAIL: z.string().email().optional(),
  WORKLINGO_ADMIN_PASSWORD: z.string().min(8).optional(),
  WORKLINGO_DATA_DIR: z.string().min(1),
  WORKLINGO_E2E_MODE: z.enum(['true', 'false']).default('false'),
  WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: z.enum(['fake', 'openai-compatible']).default('fake'),
  WORKLINGO_STT_PROVIDER: z.enum(['fake', 'microsoft']).default('fake'),
  WORKLINGO_TTS_PROVIDER: z.enum(['fake', 'microsoft']).default('fake'),
  WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: z.coerce.number().int().min(0).max(5).default(0),
  WRITING_DRAFT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
}).superRefine((environment, context) => {
  if (environment.WORKLINGO_STT_PROVIDER === 'microsoft' ||
      environment.WORKLINGO_TTS_PROVIDER === 'microsoft') {
    if (!environment.MICROSOFT_SPEECH_KEY) {
      context.addIssue({ code: 'custom', path: ['MICROSOFT_SPEECH_KEY'], message: 'is required for Microsoft Speech' });
    }
    if (!environment.MICROSOFT_SPEECH_REGION) {
      context.addIssue({ code: 'custom', path: ['MICROSOFT_SPEECH_REGION'], message: 'is required for Microsoft Speech' });
    }
  }
  if (environment.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'openai-compatible') {
    for (const field of ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL'] as const) {
      if (!environment[field]) {
        context.addIssue({ code: 'custom', path: [field], message: 'is required for OpenAI-compatible evaluation' });
      }
    }
  }
  if (environment.WORKLINGO_TEST_FAKE_EVALUATION_FAILURES > 0 &&
      (environment.NODE_ENV !== 'test' ||
       environment.WORKLINGO_E2E_MODE !== 'true' ||
       environment.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER !== 'fake')) {
    context.addIssue({
      code: 'custom',
      path: ['WORKLINGO_TEST_FAKE_EVALUATION_FAILURES'],
      message: 'is allowed only with fake evaluation in an explicit test E2E process',
    });
  }
});

export function parseAppConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid application configuration: ${details}`);
  }

  const speechToText = result.data.WORKLINGO_STT_PROVIDER === 'microsoft'
    ? {
        key: result.data.MICROSOFT_SPEECH_KEY as string,
        locale: result.data.MICROSOFT_SPEECH_LANGUAGE,
        provider: 'microsoft' as const,
        region: result.data.MICROSOFT_SPEECH_REGION as string,
      }
    : { locale: result.data.MICROSOFT_SPEECH_LANGUAGE, provider: 'fake' as const };
  const textToSpeech = result.data.WORKLINGO_TTS_PROVIDER === 'microsoft'
    ? {
        key: result.data.MICROSOFT_SPEECH_KEY as string,
        provider: 'microsoft' as const,
        region: result.data.MICROSOFT_SPEECH_REGION as string,
        voice: result.data.MICROSOFT_SPEECH_VOICE,
      }
    : { provider: 'fake' as const, voice: result.data.MICROSOFT_SPEECH_VOICE };
  const languageEvaluation = result.data.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'openai-compatible'
    ? {
        apiKey: result.data.OPENAI_API_KEY as string,
        baseUrl: result.data.OPENAI_BASE_URL as string,
        model: result.data.OPENAI_MODEL as string,
        provider: 'openai-compatible' as const,
      }
    : { provider: 'fake' as const };

  return {
    adminEmail: result.data.WORKLINGO_ADMIN_EMAIL,
    adminPassword: result.data.WORKLINGO_ADMIN_PASSWORD,
    ai: {
      draftRetentionDays: result.data.WRITING_DRAFT_RETENTION_DAYS,
      fakeEvaluationRateLimitFailures: result.data.WORKLINGO_TEST_FAKE_EVALUATION_FAILURES,
      languageEvaluation,
      maxAttempts: result.data.PROVIDER_MAX_ATTEMPTS,
      providerTimeoutMs: result.data.PROVIDER_TIMEOUT_MS,
      recordingMaxBytes: result.data.RECORDING_MAX_BYTES,
      recordingMaxDurationSeconds: result.data.RECORDING_MAX_DURATION_SECONDS,
      recordingRetentionDays: result.data.RECORDING_RETENTION_DAYS,
      speechToText,
      textToSpeech,
    },
    apiPort: result.data.API_PORT,
    dataDir: path.resolve(result.data.WORKLINGO_DATA_DIR),
    databaseUrl: result.data.DATABASE_URL,
    jobs: {
      leaseMs: result.data.JOB_WORKER_LEASE_MS,
      pollIntervalMs: result.data.JOB_WORKER_POLL_INTERVAL_MS,
      workerEnabled: result.data.JOB_WORKER_ENABLED === 'true',
    },
    sessionSecret: result.data.SESSION_SECRET,
    webPort: result.data.WEB_PORT,
  };
}
