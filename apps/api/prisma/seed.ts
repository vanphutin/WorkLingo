import { PrismaClient } from '@prisma/client';

import { seedFoundationCurriculum } from '../src/curriculum/infrastructure/seed-foundation.js';
import { seedContentAdmin } from '../src/users/infrastructure/seed-content-admin.js';
import { seedWorkplaceTransferCurriculum } from '../src/curriculum/infrastructure/seed-workplace-transfer.js';
import { createLocalSeedStorage } from '../src/curriculum/infrastructure/seed-audio.js';
import { seedPlacementCurriculum } from '../src/curriculum/infrastructure/seed-placement.js';
import { seedLearningPrograms } from '../src/learning-programs/infrastructure/seed-learning-programs.js';
import { seedIeltsOrientation } from '../src/ielts-orientation/infrastructure/seed-ielts-orientation.js';
import { seedIeltsBridge } from '../src/ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { seedIeltsIntegratedProfiles } from '../src/ielts-integrated-practice/infrastructure/seed-ielts-integrated-profiles.js';
import { seedIeltsBandCurriculum } from '../src/ielts-band-curriculum/infrastructure/seed-ielts-band-curriculum.js';
import { seedIeltsMocks } from '../src/ielts-mock/infrastructure/seed-ielts-mocks.js';

async function main(): Promise<void> {
  const database = new PrismaClient();
  const storage = createLocalSeedStorage();
  try {
    await seedLearningPrograms(database);
    await seedIeltsOrientation(database);
    await seedIeltsBridge(database);
    await seedIeltsIntegratedProfiles(database);
    await seedIeltsBandCurriculum(database);
    await seedIeltsMocks(database);
    await seedFoundationCurriculum(database, storage);
    await seedWorkplaceTransferCurriculum(database, storage);
    await seedPlacementCurriculum(database, storage);
    await seedContentAdmin(database);
    console.info('Program catalog, IELTS orientation and bridge, learning curriculum, placement, and content admin seed complete.');
  } finally {
    await database.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  console.error('Curriculum seed failed. Check database configuration, migrations, and lesson version consistency.');
  process.exitCode = 1;
});
