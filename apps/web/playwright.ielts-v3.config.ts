import { defineConfig, devices } from '@playwright/test';
import legacy from './playwright.config';

// Each invocation owns its disposable schema. Run legacy and V3 separately so
// both server-selected rollout states are exercised without changing live flags.
export default defineConfig({
  ...legacy,
  projects: [
    { name: 'ielts-flow-v3-desktop', testMatch: /ielts-(?:study|flow-v3)\.spec\.ts/u, use: { ...devices['Desktop Chrome'] } },
    { name: 'ielts-flow-v3-mobile', testMatch: /ielts-(?:study|flow-v3)\.spec\.ts/u, use: { ...devices['Pixel 5'] } },
  ],
  webServer: Array.isArray(legacy.webServer) ? legacy.webServer.map((server, index) => index === 0 ? { ...server, env: { ...server.env, WORKLINGO_IELTS_FLOW: 'v3' } } : server) : legacy.webServer,
});
