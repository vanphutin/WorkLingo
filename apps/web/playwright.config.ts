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
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
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
      name: 'admin-desktop',
      testMatch: /admin-content-authoring\.spec\.ts/u,
      dependencies: ['foundation-desktop', 'foundation-mobile'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin-mobile',
      testMatch: /admin-content-authoring\.spec\.ts/u,
      dependencies: ['admin-desktop'],
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @worklingo/api exec tsx src/main.ts',
      cwd: '../..',
      env: {
        API_PORT: '4000',
        DATABASE_URL: databaseUrl.toString(),
        SESSION_SECRET:
          process.env.SESSION_SECRET ?? 'worklingo-playwright-local-secret-change-me',
        WORKLINGO_DATA_DIR: dataDirectory,
      },
      url: 'http://127.0.0.1:4000/api/v1/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm exec next dev -H 127.0.0.1 -p 3000',
      env: { WORKLINGO_API_URL: 'http://127.0.0.1:4000' },
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
