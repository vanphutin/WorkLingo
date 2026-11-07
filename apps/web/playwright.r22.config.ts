import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence =
  process.env.WL_R22_BROWSER_EVIDENCE_DIR ??
  'C:/Users/ASUS/AppData/Local/Temp/worklingo-r22-20261107/browser';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'r22-assessment.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 240000,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(evidence, 'results.json') }],
  ],
  outputDir: path.join(evidence, 'artifacts'),
  use: {
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
    baseURL: 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
    storageState: {
      cookies: [
        {
          name: 'worklingo_locale',
          value: 'en',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  },
  projects: [
    { name: 'r22-desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'r22-mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'r22-tablet', use: { viewport: { width: 768, height: 1024 } } },
  ],
});
