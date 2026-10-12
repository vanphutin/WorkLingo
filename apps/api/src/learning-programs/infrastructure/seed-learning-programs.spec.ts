import { describe, expect, it } from 'vitest';

import type { ProgramCatalogEntry } from '../domain/program-catalog.js';
import { seedLearningPrograms } from './seed-learning-programs.js';

type StoredProgram = Omit<ProgramCatalogEntry, 'description'> & { description: string };

class InMemoryProgramDelegate {
  readonly rows = new Map<string, StoredProgram>();

  async upsert(input: {
    create: ProgramCatalogEntry;
    update: Record<string, never>;
    where: { slug: string };
  }): Promise<StoredProgram> {
    const existing = this.rows.get(input.where.slug);
    if (existing) return existing;
    this.rows.set(input.where.slug, input.create);
    return input.create;
  }
}

describe('seedLearningPrograms', () => {
  it('creates the four canonical programs and preserves stored descriptions on rerun', async () => {
    const learningProgram = new InMemoryProgramDelegate();

    await seedLearningPrograms({ learningProgram });
    const intermediate = learningProgram.rows.get('intermediate');
    expect(intermediate).toBeDefined();
    learningProgram.rows.set('intermediate', {
      ...intermediate!,
      description: 'Operator-authored Intermediate description',
    });

    await seedLearningPrograms({ learningProgram });

    expect([...learningProgram.rows.values()]).toEqual([
      expect.objectContaining({
        availabilityStatus: 'COMING_SOON',
        displayOrder: 1,
        id: '10000000-0000-4000-8000-000000000001',
        slug: 'beginner',
      }),
      expect.objectContaining({
        availabilityStatus: 'AVAILABLE',
        description: 'Operator-authored Intermediate description',
        displayOrder: 2,
        id: '10000000-0000-4000-8000-000000000002',
        slug: 'intermediate',
      }),
      expect.objectContaining({
        availabilityStatus: 'COMING_SOON',
        displayOrder: 3,
        id: '10000000-0000-4000-8000-000000000003',
        slug: 'toeic',
      }),
      expect.objectContaining({
        availabilityStatus: 'IN_DEVELOPMENT',
        displayOrder: 4,
        id: '10000000-0000-4000-8000-000000000004',
        slug: 'ielts',
      }),
    ]);
  });
});
