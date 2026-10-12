import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiError } from './api-client';
import { LearningProgramClient } from './learning-program-client';

const validCatalog = {
  programs: [
    {
      availabilityStatus: 'AVAILABLE',
      description: 'Use English confidently at work.',
      destination: '/dashboard',
      iconKey: 'intermediate',
      isSelectable: true,
      learningGoal: 'Communicate effectively at work.',
      name: 'Intermediate',
      proficiencyLabel: 'Intermediate / B1-B2',
      publishedLevelCount: 2,
      publishedPathCount: 1,
      slug: 'intermediate',
    },
  ],
} as const;

describe('LearningProgramClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads the authenticated learning program catalog', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => validCatalog,
      ok: true,
      status: 200,
    } as Response);

    const result = await new LearningProgramClient('/api/v1').getCatalog();

    expect(result).toEqual(validCatalog);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/learning-programs', {
      credentials: 'include',
      method: 'GET',
    });
  });

  it.each([
    ['destination', { destination: '/unapproved' }],
    ['icon', { iconKey: 'rocket' }],
    ['status', { availabilityStatus: 'SECRET_PREVIEW' }],
  ])('rejects an arbitrary %s value', async (_label, override) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        programs: [{ ...validCatalog.programs[0], ...override }],
      }),
      ok: true,
      status: 200,
    } as Response);

    await expect(new LearningProgramClient('/api/v1').getCatalog()).rejects.toThrow();
  });

  it('throws a safe ApiError for a non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        code: 'PROGRAM_CATALOG_UNAVAILABLE',
        message: 'Learning program catalog is temporarily unavailable.',
        secret: 'database-host',
      }),
      ok: false,
      status: 503,
    } as Response);

    await expect(new LearningProgramClient('/api/v1').getCatalog()).rejects.toMatchObject({
      code: 'PROGRAM_CATALOG_UNAVAILABLE',
      message: 'Learning program catalog is temporarily unavailable.',
      status: 503,
    } satisfies Partial<ApiError>);
  });
});
