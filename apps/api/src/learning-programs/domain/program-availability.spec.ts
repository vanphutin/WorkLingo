import { describe, expect, it } from 'vitest';

import { deriveProgramAccess } from './program-availability.js';

describe('deriveProgramAccess', () => {
  it.each(['AVAILABLE', 'BETA'] as const)(
    'makes Intermediate selectable when status is %s',
    (availabilityStatus) => {
      expect(
        deriveProgramAccess({ availabilityStatus, slug: 'intermediate' }),
      ).toEqual({ destination: '/dashboard', isSelectable: true });
    },
  );

  it.each(['COMING_SOON', 'DISABLED'] as const)(
    'keeps Intermediate disabled when status is %s',
    (availabilityStatus) => {
      expect(
        deriveProgramAccess({ availabilityStatus, slug: 'intermediate' }),
      ).toEqual({ destination: null, isSelectable: false });
    },
  );

  it('keeps a program without an approved destination non-selectable', () => {
    expect(
      deriveProgramAccess({ availabilityStatus: 'AVAILABLE', slug: 'ielts' }),
    ).toEqual({ destination: null, isSelectable: false });
  });
});
