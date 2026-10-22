import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', testMatch: /admin-experience-v2\.spec\.ts/u,
  workers: 1, retries: 0, timeout: 240_000, reporter: 'list',
  outputDir: '../../.superpowers/admin-experience-v2/browser-results',
  use: { baseURL: 'http://127.0.0.1:33320', browserName: 'chromium', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm exec next start -H 127.0.0.1 -p 33320', url: 'http://127.0.0.1:33320/login',
    reuseExistingServer: false, timeout: 90_000, env: { WORKLINGO_API_URL: 'http://127.0.0.1:9' },
  },
});
