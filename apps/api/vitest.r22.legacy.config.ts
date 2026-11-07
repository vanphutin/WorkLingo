import { defineConfig } from 'vitest/config';
import base from './vitest.r2.config.js';
if (!process.env.WL_R2_TEST_DATABASE_URL)
  throw new Error('EXPLICIT_OWNED_R2_LEGACY_DATABASE_REQUIRED');
// Base validates127.0.0.1:55447/worklingo_r2; harness enforces no-env migrations.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    hookTimeout: 120000,
    testTimeout: 60000,
    include: [
      'test/integration/placement-attempt.integration.spec.ts',
      'test/integration/placement-confirmation.integration.spec.ts',
      'test/integration/placement-isolation.integration.spec.ts',
      'test/integration/versioned-learner-audio.integration.spec.ts',
      'src/ielts-study/application/ielts-topic-admin.service.spec.ts',
    ],
  },
});
