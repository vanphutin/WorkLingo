import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: /liquid-glass-shell-reflow\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase3-remediation/browser-results',
  webServer: {
    ...foundation.webServer,
    command: process.env.WORKLINGO_REFLOW_REF
      ? 'node e2e/fixtures/run-shell-reflow-snapshot.cjs'
      : `pnpm exec next ${process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'start' : 'dev --webpack'} -H 127.0.0.1 -p 33300`,
    timeout: 90_000,
  },
});
