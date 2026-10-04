import { PrismaClient } from '@prisma/client';

import { seedFoundationCurriculum } from '../src/curriculum/infrastructure/seed-foundation.js';

async function main(): Promise<void> {
  const database = new PrismaClient();
  try {
    await seedFoundationCurriculum(database);
    console.info('Foundation curriculum seed complete.');
  } finally {
    await database.$disconnect();
  }
}

main().catch(() => {
  console.error('Curriculum seed failed. Check database configuration, migrations, and lesson version consistency.');
  process.exitCode = 1;
});
