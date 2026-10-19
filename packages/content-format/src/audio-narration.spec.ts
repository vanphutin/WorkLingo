import { describe, expect, it } from 'vitest';
import { parseLessonSource, validateLessonDocument } from './index.ts';
import { audioScriptFingerprintText, narrationEvidenceIssues, narrationReviewInput, setAudioNarration, spokenScript, suggestEmailBody } from './audio-narration.ts';

const source = `FORMAT: WorkLingoLesson/1.0
[AUDIO_SCRIPT letter]
script:
<<<
From: May <may@example.com>
To: Team
Subject: Opening

Dear Team,
We open at 09:30. The deposit is $50.
>>>
[/AUDIO_SCRIPT]
[CONTENT email]
type: email
text:
<<<
From: May <may@example.com>
To: Team
Subject: Opening

Dear Team,
We open at 09:30. The deposit is $50.
>>>
[/CONTENT]
[ACTIVITY listen]
activity_type: listening
audio_ref: letter
EVIDENCE: email:1
[/ACTIVITY]`;

describe('reviewed narration', () => {
  it('only suggests removing a definite leading email header, preserving values and signatures', () => {
    expect(suggestEmailBody('From: May\nTo: Team\nSubject: Opening\n\nDear Team,\nPay $50 at 09:30.\nRegards, May'))
      .toBe('Dear Team,\nPay $50 at 09:30.\nRegards, May');
    for (const text of ['From: tomorrow we open early.\nPlease attend.', 'Title\n\nAn article.', 'From: May\nTo: Team\nNo boundary']) {
      expect(suggestEmailBody(text)).toBeNull();
    }
  });

  it('round trips speech without modifying the original or allowing source delimiters', () => {
    const updated = setAudioNarration(source, 'letter', 'Dear Team,\nWe open at 09:30.', 'a'.repeat(64));
    const script = parseLessonSource(updated).document.audioScripts[0]!;
    expect(script.spokenText).toBe('Dear Team,\nWe open at 09:30.');
    expect(script.speechReview).toBe('a'.repeat(64));
    expect(script.script).toContain('From: May <may@example.com>');
    expect(spokenScript(script)).toBe('Dear Team,\nWe open at 09:30.');
    expect(setAudioNarration(updated, 'letter', undefined)).toBe(source);
    expect(() => setAudioNarration(source, 'letter', '>>>\n[/AUDIO_SCRIPT]')).toThrow();
  });

  it('blocks removing evidence used by listening questions', () => {
    const document = parseLessonSource(setAudioNarration(source, 'letter', 'Dear Team,\nWe open at 09:30.', 'a'.repeat(64))).document;
    expect(validateLessonDocument(document).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'NARRATION_EVIDENCE_REMOVED', severity: 'error' }),
    ]));
  });

  it('binds review to source, speaker, speech and listening questions; keeps legacy audio fingerprints', () => {
    const doc = parseLessonSource(source).document;
    const original = doc.audioScripts[0]!;
    expect(audioScriptFingerprintText(original)).toBe(original.script);
    const rendition = { ...original, spokenText: 'Dear Team,', speechReview: 'a'.repeat(64) };
    expect(audioScriptFingerprintText(rendition)).not.toBe(original.script);
    const key = narrationReviewInput(doc, rendition);
    expect(narrationReviewInput(doc, { ...rendition, speaker: 'May (female)' })).not.toBe(key);
    expect(narrationReviewInput({ ...doc, activities: [] }, rendition)).not.toBe(key);
    expect(narrationReviewInput(doc, { ...rendition, script: 'Changed' })).not.toBe(key);
    expect(narrationReviewInput(doc, { ...rendition, spokenText: 'Changed' })).not.toBe(key);
  });
  it('preserves narration-looking field names inside original prose', () => {
    const original = source.replace('Dear Team,', 'speech_review: keep this original line');
    const result = setAudioNarration(original, 'letter', 'Hello team.', 'a'.repeat(64));
    expect(parseLessonSource(result).document.audioScripts[0]!.script).toContain('speech_review: keep this original line');
  });
  it('does not mistake a dialogue speaker label for removed evidence', () => {
    const original = source.replaceAll('From: May <may@example.com>', 'An: Hello.').replaceAll('To: Team', 'Nhi: Hi.');
    const doc = parseLessonSource(setAudioNarration(original, 'letter', 'An: Hello.\nNhi: Hi.', 'a'.repeat(64))).document;
    expect(validateLessonDocument(doc).issues.filter(i => i.code === 'NARRATION_EVIDENCE_REMOVED')).toEqual([]);
  });
  it('blocks removing evidence that references an audio script directly', () => {
    const doc = parseLessonSource(setAudioNarration(source.replace('email:1', 'letter:1'), 'letter', 'Goodbye.', 'a'.repeat(64))).document;
    expect(narrationEvidenceIssues(doc, doc.audioScripts[0]!)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'NARRATION_EVIDENCE_REMOVED', severity: 'error' }),
    ]));
  });
  it('invalidates review when a prompt-based question changes', () => {
    const doc = parseLessonSource(source).document;
    const script = doc.audioScripts[0]!;
    const first = { ...doc, activities: doc.activities.map(a => ({ ...a, question: undefined, prompt: 'Where is the order?' })) };
    const next = { ...doc, activities: doc.activities.map(a => ({ ...a, question: undefined, prompt: 'Who placed the order?' })) };
    expect(narrationReviewInput(first, script)).not.toBe(narrationReviewInput(next, script));
  });
  it('does not insert fields inside closing-token prose or an original multiline block', () => {
    for (const line of ['The literal token [/AUDIO_SCRIPT] appears here.', '[/AUDIO_SCRIPT]']) {
      const original = source.replace('Dear Team,', line);
      const before = parseLessonSource(original).document.audioScripts[0]!.script;
      const updated = setAudioNarration(original, 'letter', 'Hello team.', 'a'.repeat(64));
      expect(parseLessonSource(updated).document.audioScripts[0]!.script).toBe(before);
      expect(parseLessonSource(updated).document.audioScripts[0]!.spokenText).toBe('Hello team.');
    }
  });
});
