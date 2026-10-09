import ts from 'typescript';
import { defineConfig } from 'vitest/config';

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
      JOB_WORKER_ENABLED: 'false',
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
