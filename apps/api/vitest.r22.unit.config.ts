import { defineConfig } from 'vitest/config';
import isolated from './vitest.r2.config.js';

// Unit-only entry point: no .env, DB defaults or integration bootstrap imports.
// These two source-tree suites have dedicated integration/guarded configs;
// they remain required separate gates rather than skipped tests.
export default defineConfig({
  ...isolated,
  test: {
    ...isolated.test,
    include: ['src/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      'src/ielts-study/application/ielts-topic-admin.service.spec.ts',
      'src/teacher-ai/application/beginner-evaluator-context.spec.ts',
    ],
    env: {
      ...isolated.test?.env,
      DATABASE_URL: '',
      TEST_DATABASE_URL: '',
      DIRECT_URL: '',
      WORKLINGO_ASSESSMENT_ENABLED: 'false',
      WORKLINGO_ASSESSMENT_PRIVACY_VERIFIED: 'false',
    },
  },
});
