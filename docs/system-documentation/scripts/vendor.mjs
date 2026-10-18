import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
export async function bundleMermaid(home) {
  await fs.mkdir(path.join(home,'vendor'),{recursive:true});
  await build({entryPoints:[require.resolve('mermaid')],outfile:path.join(home,'vendor/mermaid.js'),bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,legalComments:'linked',logLevel:'warning'});
  await fs.copyFile(require.resolve('mermaid/LICENSE'),path.join(home,'vendor/MERMAID-LICENSE'));
}
