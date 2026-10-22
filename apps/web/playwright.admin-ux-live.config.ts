import { defineConfig, devices } from '@playwright/test';
import legacy from './playwright.config';
export default defineConfig({
  ...legacy,
  use: { ...legacy.use, actionTimeout: 15000 },
  outputDir: '../../.superpowers/admin-experience-v2/live-results',
  projects: [
    { name: 'admin-ux-live-desktop', testMatch: /admin-(?:experience-live|curriculum-audit|observability)\.spec\.ts/u, use: { ...devices['Desktop Chrome'] } },
    { name: 'admin-ux-live-mobile', testMatch: /admin-(?:experience-live|curriculum-audit|observability)\.spec\.ts/u, use: { ...devices['Pixel 5'] }, dependencies: ['admin-ux-live-desktop'] },
  ],
});
