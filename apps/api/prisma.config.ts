import { defineConfig } from 'prisma/config';
import { existsSync } from 'node:fs';

// Match the API's package-local .env convention when invoking the Prisma CLI.
if (existsSync('.env')) process.loadEnvFile('.env');

// Keep seeding provider-free. DATABASE_URL is supplied by the local environment.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
