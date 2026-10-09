import { rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

interface SchemaAdmin {
  $executeRawUnsafe(query: string): Promise<unknown>;
  $disconnect(): Promise<void>;
}

const isDeadlock = (error: unknown): boolean => (
  typeof error === 'object' && error !== null && 'meta' in error
  && typeof error.meta === 'object' && error.meta !== null && 'code' in error.meta
  && error.meta.code === '40P01'
);

const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

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
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        await database.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        break;
      } catch (error) {
        if (!isDeadlock(error) || attempt === 5) throw error;
        await wait(attempt * 100);
      }
    }
  } finally {
    await database.$disconnect();
  }
  await rm(resolvedDataDirectory, { recursive: true, force: true });
}
