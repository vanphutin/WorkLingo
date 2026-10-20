import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig({
  ...foundation,
  testMatch: /liquid-glass-phase6-(cross|native|performance)\.spec\.ts/u,
  timeout: 120_000,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase6-browser-results',
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({
    name: browserName,
    testIgnore: browserName === 'chromium' ? undefined : /phase6-(native|performance)/u,
    use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit' },
  })),
  webServer: { ...foundation.webServer, command: 'pnpm exec next start -H 127.0.0.1 -p 33300', timeout: 120_000 },
});
