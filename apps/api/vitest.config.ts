import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { defineConfig } from 'vitest/config';

const workspaceEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ??
  'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      name: 'typescript-decorator-metadata',
      transform(code, id) {
        if (!/\.[cm]?ts$/u.test(id)) return undefined;

        const result = ts.transpileModule(code, {
          compilerOptions: {
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            module: ts.ModuleKind.ESNext,
            sourceMap: true,
            target: ts.ScriptTarget.ES2022,
          },
          fileName: id,
        });

        return { code: result.outputText, map: result.sourceMapText };
      },
    },
  ],
  test: {
    env: {
      TEST_DATABASE_URL: testDatabaseUrl,
      JOB_WORKER_ENABLED: 'false',
      MICROSOFT_SPEECH_KEY: '',
      MICROSOFT_SPEECH_REGION: '',
      NODE_ENV: 'test',
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: '',
      OPENAI_MODEL: '',
      // Automated tests must stay deterministic and must never inherit paid or
      // network-backed providers from a developer's local .env file.
      WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'fake',
      WORKLINGO_STT_PROVIDER: 'fake',
      WORKLINGO_TTS_PROVIDER: 'fake-tts',
    },
    environment: 'node',
    // Integration suites share the local PostgreSQL instance and mutate schema data.
    // Running files concurrently makes app bootstrap and cleanup contend for the
    // same database, which causes nondeterministic hook timeouts on local machines.
    fileParallelism: false,
    // A progression journey intentionally issues concurrent HTTP transactions.
    // Keep a bounded margin for Docker Desktop and the concurrent web test worker.
    testTimeout: 15_000,
  },
});
