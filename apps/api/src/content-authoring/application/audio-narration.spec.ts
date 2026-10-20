import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalLessonSource } from '@worklingo/test-fixtures';
import { narrationReviewInput, parseLessonSource, setAudioNarration } from '@worklingo/content-format';
import { analyzeReviewedSource, assertNarrationReviewed } from './audio-narration.js';

describe('narration review enforcement', () => {
  it('rejects forged and stale review stamps even when source syntax is valid', () => {
    const doc = parseLessonSource(canonicalLessonSource).document;
    const script = doc.audioScripts[0]!;
    const spokenText = script.script;
    const unsigned = setAudioNarration(canonicalLessonSource, script.slug, spokenText);
    const candidate = parseLessonSource(unsigned).document.audioScripts[0]!;
    const hash = createHash('sha256').update(narrationReviewInput(doc, candidate)).digest('hex');
    const reviewed = setAudioNarration(unsigned, script.slug, spokenText, hash);
    expect(analyzeReviewedSource(reviewed).canPublish).toBe(true);
    const stale = reviewed.replace(`speech_review: ${hash}`, `speech_review: ${'a'.repeat(64)}`);
    expect(analyzeReviewedSource(stale).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'NARRATION_REVIEW_STALE' })]));
    expect(() => assertNarrationReviewed(parseLessonSource(stale).document)).toThrow();
  });
});
