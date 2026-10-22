import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /topic-approval-feedback\.spec\.ts/u,
  workers: 1, retries: 0, timeout: 45000, reporter: 'list',
  outputDir: '../../.superpowers/topic-approval/browser-results',
  use: { baseURL: 'http://127.0.0.1:33340', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm exec next start -H 127.0.0.1 -p 33340', url: 'http://127.0.0.1:33340/login', reuseExistingServer: false,
    env: { WORKLINGO_E2E_MODE: 'true', WORKLINGO_API_URL: 'http://127.0.0.1:9' } },
});
