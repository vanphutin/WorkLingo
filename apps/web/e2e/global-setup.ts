import { mkdir } from 'node:fs/promises';

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
}
