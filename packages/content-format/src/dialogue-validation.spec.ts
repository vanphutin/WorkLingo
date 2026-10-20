import { describe, expect, it } from 'vitest';
import { canonicalLessonSource } from '@worklingo/test-fixtures';
import { analyzeLessonSource, parseLessonSource, validateLessonDocument } from './index.ts';

function withDialogue(text: string, kind: 'content' | 'audio_script' = 'content'): string {
  return canonicalLessonSource + (kind === 'content'
    ? `\n[CONTENT dialogue-test]\ntype: dialogue\ntext:\n<<<\n${text}\n>>>\n[/CONTENT]\n`
    : `\n[AUDIO_SCRIPT dialogue-test]\nscript:\n<<<\n${text}\n>>>\n[/AUDIO_SCRIPT]\n`);
}

describe('dialogue author validation', () => {
  it.each(['content', 'audio_script'] as const)('blocks %s with missing genders for three characters', (kind) => {
    const source = withDialogue('An (male): First.\nLan: Second.\nMinh: Third.', kind);
    const result = analyzeLessonSource(source);
    expect(result.canPublish).toBe(false);
    expect(result.normalizedDraft).toBeNull();
    const issues = result.issues.filter((issue) => issue.code === 'DIALOGUE_MISSING_GENDER');
    expect(issues).toHaveLength(2);
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', path: `${kind}.dialogue-test.${kind === 'content' ? 'text' : 'script'}` }),
    ]));
    const document = parseLessonSource(source).document;
    expect(issues[0]?.range).toEqual(kind === 'content' ? document.contents.at(-1)?.range : document.audioScripts.at(-1)?.range);
  });

  it.each([
    ['An (male): Hi.\nAN (female): Bye.', 'DIALOGUE_CONFLICTING_GENDER'],
    ['An (): Hi.', 'DIALOGUE_INVALID_GENDER'],
    ['An (unknown): Hi.', 'DIALOGUE_INVALID_GENDER'],
    [': Hello.', 'DIALOGUE_INVALID_LABEL'],
  ])('blocks invalid dialogue %j', (text, code) => {
    const result = analyzeLessonSource(withDialogue(text));
    expect(result.canPublish).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code, severity: 'error' })]));
  });

  it.each([
    'An: First.\nLan: Second.',
    'An (male): First.\nLan (female): Second.\nMinh (male): Third.',
  ])('accepts compatible dialogue and preserves the stored transcript: %s', (text) => {
    const result = analyzeLessonSource(withDialogue(text));
    expect(result.canPublish).toBe(true);
    expect(result.normalizedDraft?.contentBlocks.at(-1)?.text).toBe(text);
  });

  it('leaves ordinary AUDIO_SCRIPT colon narration and email prose valid', () => {
    const audio = withDialogue('Note: Arrive at 9:30.\nReminder: Bring your laptop.', 'audio_script');
    expect(analyzeLessonSource(audio).canPublish).toBe(true);
    const email = withDialogue('An (unsupported): This is quoted email prose.').replace('type: dialogue', 'type: email');
    expect(analyzeLessonSource(email).canPublish).toBe(true);
  });

  it('respects the existing issue budget for dialogue validation', () => {
    const source = withDialogue('An: First.\nLan: Second.\nMinh: Third.');
    const result = validateLessonDocument(parseLessonSource(source).document, { maxIssues: 1 });
    expect(result.canPublish).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe('DIALOGUE_MISSING_GENDER');
  });

  it('blocks an AUDIO_SCRIPT containing only a malformed bare heading', () => {
    const result = analyzeLessonSource(withDialogue('An:: Hello.', 'audio_script'));
    expect(result.canPublish).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DIALOGUE_INVALID_LABEL', path: 'audio_script.dialogue-test.script' }),
    ]));
  });
});
