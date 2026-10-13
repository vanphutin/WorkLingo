import { describe, expect, it } from 'vitest';

import { validateOrientationContent } from './orientation-validation.js';

const slide = (id: string, slug: string) => ({
  id,
  slug,
  title: slug,
  body: 'A concise explanation for the learner.',
  transcript: 'Narration that remains available as a transcript.',
  imageAssetId: null,
  audioAssetId: null,
  question: null,
});

describe('orientation validation', () => {
  it('returns field-addressable issues for malformed content and foreign media', () => {
    const content = {
      title: 'IELTS Orientation',
      description: 'A guided introduction.',
      slides: [
        { ...slide('11111111-1111-4111-8111-111111111111', 'welcome'), audioAssetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
        slide('22222222-2222-4222-8222-222222222222', 'skills'),
        slide('33333333-3333-4333-8333-333333333333', 'score'),
      ],
    };

    expect(validateOrientationContent(content, new Set())).toEqual([
      {
        code: 'MEDIA_NOT_OWNED',
        path: 'slides.0.audioAssetId',
        message: 'Referenced media must belong to this IELTS orientation.',
      },
    ]);
  });

  it('accepts valid content whose referenced media belongs to the orientation', () => {
    const mediaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(validateOrientationContent({
      title: 'IELTS Orientation',
      description: 'A guided introduction.',
      slides: [
        { ...slide('11111111-1111-4111-8111-111111111111', 'welcome'), imageAssetId: mediaId },
        slide('22222222-2222-4222-8222-222222222222', 'skills'),
        slide('33333333-3333-4333-8333-333333333333', 'score'),
      ],
    }, new Set([mediaId]))).toEqual([]);
  });
});
