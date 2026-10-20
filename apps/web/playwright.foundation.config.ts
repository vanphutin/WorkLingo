import { defineConfig } from '@playwright/test';

// No database setup, seed, real account, provider or production data is used by this suite.
export default defineConfig({
  testDir: './e2e',
  testMatch: /liquid-glass-foundation\.spec\.ts/u,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/browser-results',
  reporter: 'list',
  use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm exec next ${process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'start' : 'dev'} -H 127.0.0.1 -p 33300`,
    url: 'http://127.0.0.1:33300/login',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { WORKLINGO_API_URL: 'http://127.0.0.1:9' },
  },
});
