import { defineConfig } from 'vitest/config';
import isolated from './vitest.r2.config.js';

if (!process.env.WL_R2_TEST_DATABASE_URL) throw new Error('Explicit disposable R2 database required');
// Deliberate legacy seams: guarded shared harness, two explicitly guarded
// standalone no-env migrations, or no database. Other standalone migrations
// and separately authorized Beginner main/fixture suites are excluded.
export default defineConfig({ ...isolated, test: { ...isolated.test,
  include: [
    'test/integration/curriculum-foundation-progress.integration.spec.ts',
    'test/integration/ielts-beta-catalog.integration.spec.ts',
    'test/integration/ielts-study-session.integration.spec.ts',
    'test/integration/learning-sessions.integration.spec.ts',
    'test/integration/mastery.integration.spec.ts',
    'test/integration/learning-programs-api.integration.spec.ts',
  ],
} });
