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
    environment: 'node',
  },
});
