import { describe, expect, it } from 'vitest';
import { programAnalyticsQuerySchema, programAnalyticsSchema } from './program-analytics.contracts.ts';

describe('program analytics contracts', () => {
  it('accepts only bounded positive UTC half-open windows and bounded pages', () => {
    const range = { from: '2026-01-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' };
    expect(programAnalyticsQuerySchema.parse(range)).toMatchObject({ versionPage: 1, nodePage: 1, limit: 25 });
    for (const query of [{ ...range, to: range.from }, { ...range, to: '2026-07-01T00:00:00Z' }, { ...range, from: '2026-01-01' }, { ...range, from: '2026-01-01T00:00:00+00:00' }, { ...range, limit: 101 }, { ...range, private: true }]) {
      expect(programAnalyticsQuerySchema.safeParse(query).success).toBe(false);
    }
    expect(programAnalyticsSchema.safeParse({ learnerId: 'private' }).success).toBe(false);
  });
});
