import { defineConfig } from 'vitest/config';
import base from './vitest.r2.config';
const url = process.env.WL_R22_TEST_DATABASE_URL;
if (!url) throw new Error('EXPLICIT_R22_TEST_DATABASE_REQUIRED');
const target = new URL(url);
if (
  `${target.hostname}:${target.port}${target.pathname}` !==
    '127.0.0.1:55452/worklingo_r22' ||
  (target.searchParams.get('schema') ?? 'public') !== 'public'
)
  throw new Error('OWNED_DISPOSABLE_R22_DATABASE_REQUIRED');
export default defineConfig({
  envDir: false,
  plugins: base.plugins,
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
    include:
      process.env.WL_R22_BROWSER === '1'
        ? ['test/integration/r22-browser-bootstrap.spec.ts']
        : ['test/integration/r22-*.spec.ts'],
    exclude:
      process.env.WL_R22_BROWSER === '1'
        ? []
        : ['test/integration/r22-browser-bootstrap.spec.ts'],
    env: {
      NODE_ENV: 'test',
      WORKLINGO_E2E_MODE: 'true',
      DATABASE_URL: url,
      TEST_DATABASE_URL: url,
      SESSION_SECRET: 'r22-owned-synthetic-integration-secret-over32characters',
      WORKLINGO_DATA_DIR:
        process.env.WL_R22_TEST_DATA_DIR ??
        'C:/Users/ASUS/AppData/Local/Temp/worklingo-r22-20261107/data',
      DIRECT_URL: '',
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: '',
      OPENAI_MODEL: '',
      DISCOVERY_API_KEY: '',
      MICROSOFT_SPEECH_KEY: '',
      MICROSOFT_SPEECH_REGION: '',
      JOB_WORKER_ENABLED: 'false',
      WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'fake',
      WORKLINGO_STT_PROVIDER: 'fake',
      WORKLINGO_TTS_PROVIDER: 'fake-tts',
      WORKLINGO_ASSESSMENT_ENABLED: 'false',
      WORKLINGO_ASSESSMENT_PRIVACY_VERIFIED: 'false',
    },
  },
});
