import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

const workspaceEnv = path.resolve(__dirname, '../../.env');
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);
const localEnv = path.resolve(__dirname, '.env');
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

// Keep seeding provider-free. DATABASE_URL is supplied by the local environment.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
