import { orientationContentSchema } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { IELTS_ORIENTATION_SEED, seedIeltsOrientation } from './seed-ielts-orientation.js';

describe('IELTS orientation seed', () => {
  it('provides a concise data-driven presentation with transcripts and knowledge checks', () => {
    const content = orientationContentSchema.parse(IELTS_ORIENTATION_SEED);
    expect(content.slides.length).toBeGreaterThanOrEqual(8);
    expect(content.slides.every((slide) => slide.transcript.length > 0)).toBe(true);
    expect(content.slides.filter((slide) => slide.question !== null).length).toBeGreaterThanOrEqual(2);
  });

  it('creates only the missing logical orientation and preserves existing Admin work', async () => {
    const upsert = vi.fn();
    await seedIeltsOrientation({ ieltsOrientation: { upsert } });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: 'ielts-orientation' }, update: {},
    }));
  });
});
