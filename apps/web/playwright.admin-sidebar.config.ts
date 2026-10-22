import { defineConfig } from '@playwright/test';

// Real production Next UI; explicit API fixtures, no database or account writes.
export default defineConfig({
  testDir: './e2e', testMatch: /admin-sidebar-ia\.spec\.ts/u,
  workers: 1, retries: 0, timeout: 180_000, reporter: 'list',
  outputDir: '../../.superpowers/sidebar-ia/browser-results',
  use: { baseURL: 'http://127.0.0.1:33300', browserName: 'chromium', viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm exec next start -H 127.0.0.1 -p 33300', url: 'http://127.0.0.1:33300/login',
    reuseExistingServer: false, timeout: 90_000, env: { WORKLINGO_API_URL: 'http://127.0.0.1:9' },
  },
});
