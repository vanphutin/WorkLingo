import { defineConfig } from '@playwright/test';
import existing from './playwright.config';

// Preserve existing isolated API/setup/teardown and journeys; qualify optimized web.
const servers = Array.isArray(existing.webServer) ? existing.webServer : [];
export default defineConfig({
  ...existing,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/phase6-live-results',
  webServer: servers.map((server, index) => index === 1 ? {
    ...server,
    command: `pnpm exec next start -H 127.0.0.1 -p ${process.env.WORKLINGO_E2E_WEB_PORT ?? '33106'}`,
  } : server),
});
