import { defineConfig } from 'prisma/config';

// Explicit no-env config for the disposable R2 migration/qualification runner.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
});
