import { describe, expect, it } from 'vitest';
import { canonicalLessonSource, invalidLessonSources } from '@worklingo/test-fixtures';
import { parseLessonSource } from './parser.js';
import { validateLessonDocument } from './validator.js';

describe('validateLessonDocument', () => {
  it('validates the canonical lesson fixture with 0 errors and canPublish === true', () => {
    const parseRes = parseLessonSource(canonicalLessonSource);
    expect(parseRes.issues).toEqual([]);

    const valRes = validateLessonDocument(parseRes.document);
    const errors = valRes.issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
    expect(valRes.canPublish).toBe(true);
  });

  it('rejects missing content and language block references with VAL_MISSING_REF', () => {
    const parseRes = parseLessonSource(invalidLessonSources.missingReference);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(false);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VAL_MISSING_CONTENT_REF',
          severity: 'error',
        }),
        expect.objectContaining({
          code: 'VAL_MISSING_LANGUAGE_BLOCK_REF',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects invalid answer options with VAL_INVALID_ANSWER', () => {
    const parseRes = parseLessonSource(invalidLessonSources.invalidAnswer);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(false);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VAL_INVALID_ANSWER',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects missing four-skill coverage with VAL_MISSING_SKILL_COVERAGE', () => {
    const parseRes = parseLessonSource(invalidLessonSources.missingSkillCoverage);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(false);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VAL_MISSING_SKILL_COVERAGE',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects listening activity without audio script reference with VAL_MISSING_AUDIO_REF', () => {
    const parseRes = parseLessonSource(invalidLessonSources.listeningWithoutAudio);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(false);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VAL_MISSING_AUDIO_REF',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects duplicate slugs across sections with VAL_DUPLICATE_SLUG', () => {
    const duplicateSlugSource = `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: dup-test
title: Dup Test
level: foundation
duration_minutes: 60
objective: Dup test.

[CONTENT item-1]
type: email
text:
<<<
Email 1
>>>
[/CONTENT]

[CONTENT item-1]
type: email
text:
<<<
Email 2
>>>
[/CONTENT]
`;
    const parseRes = parseLessonSource(duplicateSlugSource);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(false);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VAL_DUPLICATE_SLUG',
          severity: 'error',
        }),
      ]),
    );
  });

  it('emits warnings for unused content and audio scripts without blocking publish', () => {
    // Canonical has everything used. Let's add an extra unused audio script
    const sourceWithUnused = canonicalLessonSource + `
[AUDIO_SCRIPT unused-audio]
speaker: customer
script:
<<<
Unused audio script text.
>>>
[/AUDIO_SCRIPT]
`;
    const parseRes = parseLessonSource(sourceWithUnused);
    const valRes = validateLessonDocument(parseRes.document);

    expect(valRes.canPublish).toBe(true);
    expect(valRes.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'WARN_UNUSED_AUDIO_SCRIPT',
          severity: 'warning',
        }),
      ]),
    );
  });
});
