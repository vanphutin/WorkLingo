import { defineConfig } from '@playwright/test';
import phase4 from './playwright.phase4.config';
export default defineConfig({ ...phase4, testMatch: /liquid-glass-phase5.*\.spec\.ts/u,
  timeout: 120_000, outputDir: '../../.superpowers/sdd/02-redesign-plan/phase5-browser-results' });
