import ts from 'typescript';
import { defineConfig } from 'vitest/config';

const databaseUrl = process.env.WL_R2_TEST_DATABASE_URL ?? '';
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (url.hostname !== '127.0.0.1' || url.port !== '55447' || url.pathname !== '/worklingo_r2') {
    throw new Error('R2 tests require the owned disposable PostgreSQL endpoint');
  }
}

// Independent of the ordinary config: never loads .env or shared DB defaults.
export default defineConfig({
  envDir: false,
  plugins: [{ name: 'r2-decorator-metadata', enforce: 'pre', transform(code, id) {
    if (!/\.[cm]?ts$/u.test(id)) return undefined;
    const result = ts.transpileModule(code, { fileName: id, compilerOptions: {
      emitDecoratorMetadata: true, experimentalDecorators: true,
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, sourceMap: true,
    } });
    return { code: result.outputText, map: result.sourceMapText };
  } }],
  test: {
    environment: 'node', fileParallelism: false, testTimeout: 20_000,
    include: ['src/**/*.spec.ts', 'test/integration/r2-*.spec.ts'],
    exclude: process.env.WL_R2_BROWSER === '1' ? ['**/node_modules/**'] : ['**/node_modules/**', 'test/integration/r2-browser-bootstrap.spec.ts'],
    env: {
      NODE_ENV: 'test', DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl,
      SESSION_SECRET: 'r2-isolated-session-secret-at-least-32-characters',
      WORKLINGO_DATA_DIR: 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/storage',
      DIRECT_URL: '', OPENAI_API_KEY: '', OPENAI_BASE_URL: '', OPENAI_MODEL: '',
      DISCOVERY_API_KEY: '', MICROSOFT_SPEECH_KEY: '', MICROSOFT_SPEECH_REGION: '',
      JOB_WORKER_ENABLED: 'false', WORKLINGO_BEGINNER_ISOLATED_TEST: '1',
      WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'fake', WORKLINGO_STT_PROVIDER: 'fake',
      WORKLINGO_TTS_PROVIDER: 'fake-tts',
    },
  },
});
