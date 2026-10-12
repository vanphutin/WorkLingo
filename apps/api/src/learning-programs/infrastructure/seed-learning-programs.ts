import { PROGRAM_CATALOG, type ProgramCatalogEntry } from '../domain/program-catalog.js';

interface LearningProgramSeedDatabase {
  learningProgram: {
    upsert(input: {
      create: ProgramCatalogEntry;
      update: Record<string, never>;
      where: { slug: string };
    }): Promise<unknown>;
  };
}

export async function seedLearningPrograms(
  database: LearningProgramSeedDatabase,
): Promise<void> {
  for (const program of PROGRAM_CATALOG) {
    await database.learningProgram.upsert({
      create: program,
      update: {},
      where: { slug: program.slug },
    });
  }
}
