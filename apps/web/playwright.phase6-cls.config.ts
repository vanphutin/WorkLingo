import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';
const baseline = process.env.WORKLINGO_PHASE6_BASELINE === 'true';
export default defineConfig({ ...foundation,
  testMatch: /liquid-glass-phase6-cls\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase6-cls-results',
  webServer: { ...foundation.webServer,
    command: baseline ? 'node e2e/fixtures/run-phase6-baseline.cjs' : 'pnpm exec next start -H 127.0.0.1 -p 33302',
    url: 'http://127.0.0.1:33302/login', timeout: 180_000,
  },
});
