import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

function runApiCommand(args: string[]): void {
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['--filter', '@worklingo/api', ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: process.env.WORKLINGO_E2E_DATABASE_URL,
    },
    shell: process.platform === 'win32',
    timeout: 90_000,
  });
  if (result.status !== 0) {
    throw new Error(`${args.join(' ')} failed:\n${result.stderr || result.stdout || result.error}`);
  }
}

export default async function globalSetup(): Promise<void> {
  const schemaName = process.env.WORKLINGO_E2E_SCHEMA;
  const dataDirectory = process.env.WORKLINGO_E2E_DATA_DIR;
  if (!schemaName || !/^worklingo_e2e_[0-9a-f]{32}$/u.test(schemaName) || !dataDirectory) {
    throw new Error('Playwright requires a unique WorkLingo E2E schema and data directory');
  }
  if (!process.env.WORKLINGO_ADMIN_EMAIL || !process.env.WORKLINGO_ADMIN_PASSWORD) {
    throw new Error('Content Admin credentials are required. Run pnpm setup:local first.');
  }

  await mkdir(dataDirectory, { recursive: true });
  runApiCommand(['prisma', 'migrate', 'deploy']);
  runApiCommand(['prisma', 'db', 'seed']);
}
