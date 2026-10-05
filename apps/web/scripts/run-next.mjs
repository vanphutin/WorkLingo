import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const workspaceEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);

const command = process.argv[2];
if (command !== 'dev' && command !== 'start') {
  console.error('Usage: node scripts/run-next.mjs <dev|start>');
  process.exit(1);
}

const port = process.env.WEB_PORT ?? '3000';
if (!/^\d+$/.test(port) || Number(port) > 65_535) {
  console.error(`WEB_PORT must be a valid TCP port, received: ${port}`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const nextCli = require.resolve('next/dist/bin/next');
const child = spawn(
  process.execPath,
  [nextCli, command, '-H', '127.0.0.1', '-p', port],
  { env: process.env, stdio: 'inherit' },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
