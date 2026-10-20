import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';
export default defineConfig({ ...foundation, testMatch: /liquid-glass-phase6-error\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase6-error-results',
  webServer: { ...foundation.webServer, command: 'node e2e/fixtures/run-phase6-error-snapshot.cjs', url: 'http://127.0.0.1:33301/login', timeout: 180_000 },
});
