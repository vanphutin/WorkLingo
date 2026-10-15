import path from 'node:path';

import { z } from 'zod';

export interface AppConfig {
  readonly ai: {
    readonly routing: {
      readonly enabled: boolean;
      readonly defaultProvider: 'discovery' | 'openai';
      readonly fallbackEnabled: boolean;
      readonly maxOutputTokens: number;
      readonly discovery: { readonly apiKey?: string; readonly baseUrl: string; readonly model: string };
      readonly openai: { readonly apiKey?: string; readonly baseUrl?: string; readonly model?: string };
    };
    readonly draftRetentionDays: number;
    readonly fakeEvaluationRateLimitFailures: number;
    readonly languageEvaluation:
      | { readonly provider: 'fake' }
      | {
          readonly apiKey: string;
          readonly baseUrl: string;
          readonly model: string;
          readonly provider: 'openai-compatible' | 'discovery';
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
    readonly textToSpeech: {
      readonly defaultProviderId: 'azure-speech' | 'fake-tts';
      readonly azure: {
        readonly key?: string;
        readonly region?: string;
        readonly voice: string;
      };
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
  readonly rateLimit: {
    readonly hashKey: string;
    readonly trustProxyHops: number;
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
  AI_ROUTING_ENABLED: z.enum(['true', 'false']).default('true'),
  AI_DEFAULT_PROVIDER: z.enum(['discovery', 'openai']).optional(),
  AI_FALLBACK_ENABLED: z.enum(['true', 'false']).default('true'),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(4096).default(2048),
  DISCOVERY_API_KEY: optionalNonBlankString,
  DISCOVERY_BASE_URL: z.preprocess(blankAsUndefined, z.url().default('https://discovery-api.intern-ai.org.cn/v1')),
  DISCOVERY_MODEL: z.preprocess(blankAsUndefined, z.string().min(1).default('qwen3.8-27b')),
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
  RATE_LIMIT_HASH_KEY: optionalNonBlankString,
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
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  WEB_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  WORKLINGO_ADMIN_EMAIL: z.string().email().optional(),
  WORKLINGO_ADMIN_PASSWORD: z.string().min(8).optional(),
  WORKLINGO_DATA_DIR: z.string().min(1),
  WORKLINGO_E2E_MODE: z.enum(['true', 'false']).default('false'),
  WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: z.enum(['fake', 'openai-compatible', 'discovery']).default('fake'),
  WORKLINGO_STT_PROVIDER: z.enum(['fake', 'microsoft']).default('fake'),
  WORKLINGO_TTS_PROVIDER: z
    .enum(['fake', 'fake-tts', 'microsoft', 'azure-speech'])
    .default('fake'),
  WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: z.coerce.number().int().min(0).max(5).default(0),
  WRITING_DRAFT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
}).superRefine((environment, context) => {
  if (environment.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'discovery' && !environment.DISCOVERY_API_KEY) {
    context.addIssue({ code: 'custom', path: ['DISCOVERY_API_KEY'], message: 'is required for Discovery evaluation' });
  }
  const openaiFields = [environment.OPENAI_API_KEY, environment.OPENAI_BASE_URL, environment.OPENAI_MODEL];
  if (openaiFields.some(Boolean) && !openaiFields.every(Boolean)) {
    context.addIssue({ code: 'custom', path: ['OPENAI_API_KEY'], message: 'OpenAI credentials, base URL and model must be configured together' });
  }
  if (environment.NODE_ENV === 'production') {
    if (!environment.RATE_LIMIT_HASH_KEY || environment.RATE_LIMIT_HASH_KEY.length < 16) {
      context.addIssue({
        code: 'custom',
        message: 'is required in production and must be at least 16 characters',
        path: ['RATE_LIMIT_HASH_KEY'],
      });
    }
  }
  if (environment.WORKLINGO_STT_PROVIDER === 'microsoft' ||
      environment.WORKLINGO_TTS_PROVIDER === 'microsoft' ||
      environment.WORKLINGO_TTS_PROVIDER === 'azure-speech') {
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
  const azureCredentials = result.data.MICROSOFT_SPEECH_KEY &&
    result.data.MICROSOFT_SPEECH_REGION
    ? {
        key: result.data.MICROSOFT_SPEECH_KEY,
        region: result.data.MICROSOFT_SPEECH_REGION,
      }
    : {};
  const textToSpeech = {
    azure: {
      ...azureCredentials,
      voice: result.data.MICROSOFT_SPEECH_VOICE,
    },
    defaultProviderId:
      result.data.WORKLINGO_TTS_PROVIDER === 'microsoft' ||
      result.data.WORKLINGO_TTS_PROVIDER === 'azure-speech'
        ? 'azure-speech' as const
        : 'fake-tts' as const,
  };
  const languageEvaluation = result.data.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'openai-compatible'
    ? {
        apiKey: result.data.OPENAI_API_KEY as string,
        baseUrl: result.data.OPENAI_BASE_URL as string,
        model: result.data.OPENAI_MODEL as string,
        provider: 'openai-compatible' as const,
      }
    : result.data.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'discovery'
      ? { apiKey: result.data.DISCOVERY_API_KEY as string, baseUrl: result.data.DISCOVERY_BASE_URL, model: result.data.DISCOVERY_MODEL, provider: 'discovery' as const }
      : { provider: 'fake' as const };

  // Speaking may transcribe once, then try each evaluation provider once.
  // Leave time to persist the result before another worker can reclaim the job.
  const evaluationLeaseMs = languageEvaluation.provider === 'fake' && speechToText.provider === 'fake'
    ? 0
    : result.data.PROVIDER_TIMEOUT_MS * 3 + 10_000;

  return {
    adminEmail: result.data.WORKLINGO_ADMIN_EMAIL,
    adminPassword: result.data.WORKLINGO_ADMIN_PASSWORD,
    ai: {
      routing: {
        enabled: result.data.AI_ROUTING_ENABLED === 'true',
        defaultProvider: result.data.AI_DEFAULT_PROVIDER ?? (result.data.WORKLINGO_LANGUAGE_EVALUATION_PROVIDER === 'openai-compatible' ? 'openai' : 'discovery'),
        fallbackEnabled: result.data.AI_FALLBACK_ENABLED === 'true',
        maxOutputTokens: result.data.AI_MAX_OUTPUT_TOKENS,
        discovery: {
          ...(result.data.DISCOVERY_API_KEY ? { apiKey: result.data.DISCOVERY_API_KEY } : {}),
          baseUrl: result.data.DISCOVERY_BASE_URL,
          model: result.data.DISCOVERY_MODEL,
        },
        openai: {
          ...(result.data.OPENAI_API_KEY ? { apiKey: result.data.OPENAI_API_KEY } : {}),
          ...(result.data.OPENAI_BASE_URL ? { baseUrl: result.data.OPENAI_BASE_URL } : {}),
          ...(result.data.OPENAI_MODEL ? { model: result.data.OPENAI_MODEL } : {}),
        },
      },
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
      leaseMs: Math.max(result.data.JOB_WORKER_LEASE_MS, evaluationLeaseMs),
      pollIntervalMs: result.data.JOB_WORKER_POLL_INTERVAL_MS,
      workerEnabled: result.data.JOB_WORKER_ENABLED === 'true',
    },
    rateLimit: {
      hashKey:
        result.data.RATE_LIMIT_HASH_KEY ??
        'local-development-rate-limit-hash-key',
      trustProxyHops: result.data.TRUST_PROXY_HOPS,
    },
    sessionSecret: result.data.SESSION_SECRET,
    webPort: result.data.WEB_PORT,
  };
}
