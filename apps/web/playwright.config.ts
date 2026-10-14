import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const workspaceEnv = path.resolve(__dirname, '../../.env');
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);

const schemaName = process.env.WORKLINGO_E2E_SCHEMA ??
  `worklingo_e2e_${randomUUID().replaceAll('-', '')}`;
const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ??
  'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';
const databaseUrl = new URL(baseDatabaseUrl);
databaseUrl.searchParams.set('schema', schemaName);
const dataDirectory = path.join(tmpdir(), schemaName);
const apiPort = process.env.WORKLINGO_E2E_API_PORT ?? '34100';
const webPort = process.env.WORKLINGO_E2E_WEB_PORT ?? '33100';
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

process.env.WORKLINGO_E2E_SCHEMA = schemaName;
process.env.WORKLINGO_E2E_BASE_DATABASE_URL = baseDatabaseUrl;
process.env.WORKLINGO_E2E_DATABASE_URL = databaseUrl.toString();
process.env.WORKLINGO_E2E_DATA_DIR = dataDirectory;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: webBaseUrl,
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'onboarding-desktop',
      testMatch: /onboarding-placement\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'onboarding-mobile',
      testMatch: /onboarding-placement\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'audio-desktop',
      testMatch: /audio-settings\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'audio-mobile',
      testMatch: /audio-settings\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'adaptive-desktop',
      testMatch: /adaptive-learning\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'adaptive-mobile',
      testMatch: /adaptive-learning\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'foundation-desktop',
      testMatch: /foundation-session\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'foundation-mobile',
      testMatch: /foundation-session\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'teacher-ai-desktop',
      testMatch: /teacher-ai-learning\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'teacher-ai-mobile',
      testMatch: /teacher-ai-learning\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'engagement-desktop',
      testMatch: /engagement-progress\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'engagement-mobile',
      testMatch: /engagement-progress\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'programs-desktop',
      testMatch: /program-catalog\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'programs-mobile',
      testMatch: /program-catalog\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'curriculum-foundation-desktop',
      testMatch: /curriculum-foundation\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'curriculum-foundation-mobile',
      testMatch: /curriculum-foundation\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ielts-orientation-desktop',
      testMatch: /ielts-orientation\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ielts-orientation-mobile',
      testMatch: /ielts-orientation\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ielts-bridge-desktop',
      testMatch: /ielts-bridge\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ielts-bridge-mobile',
      testMatch: /ielts-bridge\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ielts-integrated-desktop',
      testMatch: /ielts-integrated-practice\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ielts-integrated-mobile',
      testMatch: /ielts-integrated-practice\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ielts-band-curriculum-desktop',
      testMatch: /ielts-band-curriculum\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ielts-band-curriculum-mobile',
      testMatch: /ielts-band-curriculum\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ielts-full-mock-desktop',
      testMatch: /ielts-full-mock\.spec\.ts/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ielts-full-mock-mobile',
      testMatch: /ielts-full-mock\.spec\.ts/u,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'admin-desktop',
      testMatch: /admin-(?:content-authoring|curriculum-audit|observability)\.spec\.ts/u,
      dependencies: ['foundation-desktop', 'foundation-mobile', 'teacher-ai-mobile', 'engagement-mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-mobile',
      testMatch: /admin-(?:content-authoring|curriculum-audit|observability)\.spec\.ts/u,
      dependencies: ['admin-desktop'],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'qualification-desktop',
      testMatch: /(?:accessibility|performance|pilot-journey)\.qualification\.spec\.ts/u,
      dependencies: ['admin-mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'qualification-mobile',
      testMatch: /accessibility\.qualification\.spec\.ts/u,
      dependencies: ['qualification-desktop'],
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @worklingo/api exec prisma migrate deploy && pnpm --filter @worklingo/api exec prisma db seed && pnpm --filter @worklingo/api exec tsx src/main.ts',
      cwd: '../..',
      env: {
        API_PORT: apiPort,
        DATABASE_URL: databaseUrl.toString(),
        JOB_WORKER_ENABLED: 'true',
        JOB_WORKER_POLL_INTERVAL_MS: '500',
        MICROSOFT_SPEECH_KEY: '',
        MICROSOFT_SPEECH_REGION: '',
        NODE_ENV: 'test',
        OPENAI_API_KEY: '',
        OPENAI_BASE_URL: '',
        OPENAI_MODEL: '',
        SESSION_SECRET:
          process.env.SESSION_SECRET ?? 'worklingo-playwright-local-secret-change-me',
        WORKLINGO_DATA_DIR: dataDirectory,
        WORKLINGO_E2E_MODE: 'true',
        WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'fake',
        WORKLINGO_STT_PROVIDER: 'fake',
        WORKLINGO_TEST_FAKE_EVALUATION_FAILURES: '3',
        WORKLINGO_TTS_PROVIDER: 'fake-tts',
      },
      url: `${apiBaseUrl}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `pnpm exec next dev -H 127.0.0.1 -p ${webPort}`,
      env: { WORKLINGO_API_URL: apiBaseUrl },
      url: webBaseUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
