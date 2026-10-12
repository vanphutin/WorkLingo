import { describe, expect, it } from 'vitest';

import {
  learningProgramCatalogSchema,
  learningProgramIconKeySchema,
} from './learning-program.contracts';

const intermediateProgram = {
  availabilityStatus: 'AVAILABLE',
  description: 'Build reliable workplace English across four skills.',
  destination: '/dashboard',
  iconKey: 'intermediate',
  isSelectable: true,
  learningGoal: 'Communicate confidently at work.',
  name: 'Intermediate',
  proficiencyLabel: 'B1-B2',
  publishedLevelCount: 2,
  publishedPathCount: 1,
  slug: 'intermediate',
} as const;

describe('learning program contracts', () => {
  it('accepts the closed learner catalog response', () => {
    const input = { programs: [intermediateProgram] };

    expect(learningProgramCatalogSchema.parse(input)).toEqual(input);
  });

  it('rejects unknown icon keys, destinations and extra properties', () => {
    expect(() => learningProgramIconKeySchema.parse('rocket')).toThrow();
    expect(() =>
      learningProgramCatalogSchema.parse({
        programs: [{ ...intermediateProgram, destination: '/ielts' }],
      }),
    ).toThrow();
    expect(() =>
      learningProgramCatalogSchema.parse({
        programs: [{ ...intermediateProgram, internalId: 'must-not-leak' }],
      }),
    ).toThrow();
  });

  it('requires non-negative integer published counts', () => {
    expect(() =>
      learningProgramCatalogSchema.parse({
        programs: [{ ...intermediateProgram, publishedLevelCount: -1 }],
      }),
    ).toThrow();
  });
});
