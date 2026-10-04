import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @worklingo/api exec tsx src/main.ts',
      cwd: '../..',
      env: {
        API_PORT: process.env.API_PORT ?? '4000',
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo',
        SESSION_SECRET:
          process.env.SESSION_SECRET ?? 'worklingo-playwright-local-secret-change-me',
        WORKLINGO_DATA_DIR: process.env.WORKLINGO_DATA_DIR ?? './data',
      },
      url: 'http://127.0.0.1:4000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm exec next dev -H 127.0.0.1 -p 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
