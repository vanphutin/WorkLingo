import { PrismaClient } from '@prisma/client';

import { seedFoundationCurriculum } from '../src/curriculum/infrastructure/seed-foundation.js';
import { seedContentAdmin } from '../src/users/infrastructure/seed-content-admin.js';
import { seedWorkplaceTransferCurriculum } from '../src/curriculum/infrastructure/seed-workplace-transfer.js';
import { createLocalSeedStorage } from '../src/curriculum/infrastructure/seed-audio.js';

async function main(): Promise<void> {
  const database = new PrismaClient();
  const storage = createLocalSeedStorage();
  try {
    await seedFoundationCurriculum(database, storage);
    await seedWorkplaceTransferCurriculum(database, storage);
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
