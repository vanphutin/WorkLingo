import { defineConfig } from '@playwright/test';
import legacy from './playwright.config';
import v3 from './playwright.ielts-v3.config';

// Preserve existing isolated API/setup/teardown and journeys; qualify optimized web.
const existing = process.env.WORKLINGO_INTEGRATION_IELTS_V3 === 'true' ? v3 : legacy;
const servers = Array.isArray(existing.webServer) ? existing.webServer : [];
export default defineConfig({
  ...existing,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase6-live-results',
  webServer: servers.map((server, index) => index === 1 ? {
    ...server,
    command: `pnpm exec next start -H 127.0.0.1 -p ${process.env.WORKLINGO_E2E_WEB_PORT ?? '33106'}`,
  } : server),
});
