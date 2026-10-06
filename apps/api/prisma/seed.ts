import { PrismaClient } from '@prisma/client';

import { seedFoundationCurriculum } from '../src/curriculum/infrastructure/seed-foundation.js';
import { seedContentAdmin } from '../src/users/infrastructure/seed-content-admin.js';

async function main(): Promise<void> {
  const database = new PrismaClient();
  try {
    await seedFoundationCurriculum(database);
    await seedContentAdmin(database);
    console.info('Foundation curriculum and content admin seed complete.');
  } finally {
    await database.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  console.error('Curriculum seed failed. Check database configuration, migrations, and lesson version consistency.');
  process.exitCode = 1;
});
