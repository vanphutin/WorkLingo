import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';

const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
export default defineConfig({
  ...foundation,
  testMatch: /liquid-glass-phase4.*\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase4-browser-results',
  webServer: {
    ...foundation.webServer,
    command: baseline ? 'node e2e/fixtures/run-phase4-snapshot.cjs' : `pnpm exec next ${process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'start' : 'dev'} -H 127.0.0.1 -p 33300`,
    url: 'http://127.0.0.1:33300/login', reuseExistingServer: false, timeout: 120_000,
    env: { WORKLINGO_API_URL: 'http://127.0.0.1:9' },
  },
});
