import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const workspaceEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);

const command = process.argv[2];
const require = createRequire(import.meta.url);
const commandArguments =
  command === 'dev'
    ? [require.resolve('tsx/cli'), 'watch', 'src/main.ts']
    : command === 'start'
      ? ['dist/main.js']
      : undefined;

if (!commandArguments) {
  console.error('Usage: node scripts/run-api.mjs <dev|start>');
  process.exit(1);
}

const child = spawn(process.execPath, commandArguments, {
  env: process.env,
  stdio: 'inherit',
});

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
