import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface SchemaAdmin {
  $executeRawUnsafe(query: string): Promise<unknown>;
  $disconnect(): Promise<void>;
}

export default async function globalTeardown(): Promise<void> {
  const schemaName = process.env.WORKLINGO_E2E_SCHEMA;
  const baseDatabaseUrl = process.env.WORKLINGO_E2E_BASE_DATABASE_URL;
  const dataDirectory = process.env.WORKLINGO_E2E_DATA_DIR;
  if (!schemaName || !/^worklingo_e2e_[0-9a-f]{32}$/u.test(schemaName) ||
      !baseDatabaseUrl || !dataDirectory) {
    throw new Error('Refusing to clean up an unverified WorkLingo E2E target');
  }
  const resolvedDataDirectory = path.resolve(dataDirectory);
  if (path.dirname(resolvedDataDirectory) !== path.resolve(tmpdir()) ||
      path.basename(resolvedDataDirectory) !== schemaName) {
    throw new Error('Refusing to clean up an E2E data directory outside the temporary directory');
  }

  const apiRequire = createRequire(path.resolve(__dirname, '../../../apps/api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as {
    PrismaClient: new (options: { datasourceUrl: string }) => SchemaAdmin;
  };
  const database = new PrismaClient({ datasourceUrl: baseDatabaseUrl });
  try {
    await database.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await database.$disconnect();
  }
  await rm(resolvedDataDirectory, { recursive: true, force: true });
}
