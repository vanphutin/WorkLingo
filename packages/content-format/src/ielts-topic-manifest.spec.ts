import { describe, expect, it } from 'vitest';
import * as format from './index.ts';

const manifest = { schemaVersion: 1, title: 'Education', description: 'Discuss education in two real situations.', packs: [{ slug: 'ielts-education-foundation', difficulty: 'foundation', curriculumRevisionId: '11111111-1111-4111-8111-111111111111', focusChunkSlugs: Array.from({ length: 12 }, (_, i) => `ielts-education-chunk-${i}`), contexts: [{ slug: 'ielts-course-advice', title: 'Choosing a course' }, { slug: 'ielts-study-group', title: 'Planning a study group' }] }] };
describe('IELTS topic manifest', () => {
  it('parses versioned curriculum references without lesson overrides', () => {
    expect(format.parseIeltsTopicManifest(manifest)).toEqual(manifest);
    expect(() => format.parseIeltsTopicManifest({ ...manifest, lesson: {} })).toThrow();
  });
  it.each(['band-9', 'expert', ''])('rejects unsupported difficulty %s', difficulty => {
    expect(() => format.parseIeltsTopicManifest({ ...manifest, packs: [{ ...manifest.packs[0], difficulty }] })).toThrow();
  });
  it('rejects too few or duplicate chunks and contexts', () => {
    expect(() => format.parseIeltsTopicManifest({ ...manifest, packs: [{ ...manifest.packs[0], focusChunkSlugs: ['ielts-one'] }] })).toThrow();
    expect(() => format.parseIeltsTopicManifest({ ...manifest, packs: [{ ...manifest.packs[0], contexts: [manifest.packs[0]!.contexts[0]] }] })).toThrow();
    expect(() => format.parseIeltsTopicManifest({ ...manifest, packs: [{ ...manifest.packs[0], focusChunkSlugs: Array(12).fill('ielts-one') }] })).toThrow();
  });
});
