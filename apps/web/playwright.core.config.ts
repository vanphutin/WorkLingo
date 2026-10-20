import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig(foundation, {
  testMatch: /liquid-glass-core\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/core-browser-results',
});
