import { defineConfig, devices } from '@playwright/test';

// The owned runner supplies actual Nest/PostgreSQL and Next on explicit loopback ports.
// No import of the default config, .env, global setup or shared database fallback.
export default defineConfig({
  testDir: './e2e', testMatch: 'r2-full-learning-program-platform.spec.ts',
  fullyParallel: false, workers: 1, retries: 0, timeout: 120_000,
  outputDir: 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/browser-results',
  reporter: 'list',
  expect: { timeout: 30_000 },
  use: {
    ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:33543',
    trace: 'on',
    storageState: { cookies: [{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }], origins: [] },
  },
});
