import { defineConfig } from '@playwright/test';
import foundation from './playwright.foundation.config';

export default defineConfig(foundation, {
  testMatch: /liquid-glass-shell\.spec\.ts/u,
  outputDir: '../../.superpowers/sdd/02-redesign-plan/shell-browser-results',
});
