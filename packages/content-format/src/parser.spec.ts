import { describe, expect, it } from 'vitest';
import { canonicalLessonSource, invalidLessonSources } from '@worklingo/test-fixtures';
import { parseLessonSource } from './parser.js';

describe('parseLessonSource', () => {
  it('parses the canonical lesson fixture into an accurate AST with source ranges', () => {
    const result = parseLessonSource(canonicalLessonSource);

    expect(result.issues).toEqual([]);
    const doc = result.document;
    expect(doc.formatVersion).toBe('WorkLingoLesson/1.0');

    // Lesson section
    expect(doc.lesson).toBeDefined();
    expect(doc.lesson?.slug).toBe('handling-customer-complaints');
    expect(doc.lesson?.title).toBe('Handling Customer Complaints');
    expect(doc.lesson?.level).toBe('foundation');
    expect(doc.lesson?.durationMinutes).toBe(60);
    expect(doc.lesson?.objective).toBe('Understand and respond to a customer complaint effectively.');

    // Range slicing check for lesson title
    const lessonTitleSlice = canonicalLessonSource.slice(doc.lesson!.range.start.offset, doc.lesson!.range.end.offset);
    expect(lessonTitleSlice).toContain('title: Handling Customer Complaints');

    // Word Banks
    expect(doc.wordBanks).toHaveLength(1);
    const bank = doc.wordBanks[0]!;
    expect(bank.slug).toBe('customer-service');
    expect(bank.title).toBe('Customer Service');
    expect(bank.languageBlocks).toHaveLength(2);

    const block1 = bank.languageBlocks[0]!;
    expect(block1.slug).toBe('apologize');
    expect(block1.expression).toBe('apologize');
    expect(block1.meaningVi).toBe('xin lỗi');
    expect(block1.pronunciation).toBe('/əˈpɒlədʒaɪz/');
    expect(block1.collocations).toEqual(['sincerely apologize', 'apologize for the delay']);
    expect(block1.grammarPattern).toBe('apologize for + noun/V-ing');
    expect(block1.examples).toEqual([
      'We sincerely apologize for the inconvenience.',
      'Please apologize to the customer for the delay.',
    ]);
    expect(block1.commonErrors).toEqual([
      'Do not use "apologize about the delay".',
      'Remember that apologize is followed by for.',
    ]);

    // Content
    expect(doc.contents).toHaveLength(1);
    const content = doc.contents[0]!;
    expect(content.slug).toBe('complaint-email');
    expect(content.type).toBe('email');
    expect(content.text).toContain('Dear Support Team,');
    expect(content.text).toContain('David Miller');

    // Audio Script
    expect(doc.audioScripts).toHaveLength(1);
    const audio = doc.audioScripts[0]!;
    expect(audio.slug).toBe('complaint-call');
    expect(audio.speaker).toBe('customer');
    expect(audio.script).toContain('Hello, I am calling regarding my delayed order.');

    // Activities
    expect(doc.activities).toHaveLength(4);

    const act1 = doc.activities[0]!;
    expect(act1.slug).toBe('activate-warmup');
    expect(act1.learningBlock).toBe('activate');
    expect(act1.activityType).toBe('writing');
    expect(act1.responseType).toBe('short_text');
    expect(act1.skills).toEqual(['writing']);
    expect(act1.languageBlockRefs).toEqual(['apologize']);

    const act2 = doc.activities[1]!;
    expect(act2.slug).toBe('reading-comprehension');
    expect(act2.learningBlock).toBe('read_decode');
    expect(act2.activityType).toBe('reading');
    expect(act2.responseType).toBe('multiple_choice');
    expect(act2.contentRefs).toEqual(['complaint-email']);
    expect(act2.languageBlockRefs).toEqual(['apologize', 'resolve-issue']);
    expect(act2.options).toHaveLength(3);
    expect(act2.options[0]?.label).toBe('A');
    expect(act2.options[1]?.label).toBe('B');
    expect(act2.answer).toBe('B');
    expect(act2.explanation).toContain('David states that his items arrived damaged');
    expect(act2.evidence).toEqual(['complaint-email:4']);

    const act3 = doc.activities[2]!;
    expect(act3.slug).toBe('listening-comprehension');
    expect(act3.learningBlock).toBe('listen_reason');
    expect(act3.activityType).toBe('listening');
    expect(act3.audioRef).toBe('complaint-call');

    const act4 = doc.activities[3]!;
    expect(act4.slug).toBe('speaking-practice');
    expect(act4.learningBlock).toBe('respond');
    expect(act4.activityType).toBe('speaking');
    expect(act4.responseType).toBe('shadowing');
  });

  it('rejects unsupported format header with PARSE_UNSUPPORTED_FORMAT', () => {
    const result = parseLessonSource(invalidLessonSources.unsupportedFormat);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_UNSUPPORTED_FORMAT',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects unclosed sections with PARSE_UNCLOSED_SECTION', () => {
    const result = parseLessonSource(invalidLessonSources.unclosedSection);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_UNCLOSED_SECTION',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects mismatched closing tags with PARSE_MISMATCHED_SECTION', () => {
    const result = parseLessonSource(invalidLessonSources.mismatchedSection);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_MISMATCHED_SECTION',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects unclosed multiline blocks with PARSE_UNCLOSED_MULTILINE', () => {
    const result = parseLessonSource(invalidLessonSources.unclosedMultiline);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_UNCLOSED_MULTILINE',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects unknown fields with PARSE_UNKNOWN_FIELD', () => {
    const result = parseLessonSource(invalidLessonSources.unknownField);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_UNKNOWN_FIELD',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects duplicate scalar fields with PARSE_DUPLICATE_FIELD', () => {
    const result = parseLessonSource(invalidLessonSources.duplicateScalarField);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_DUPLICATE_FIELD',
          severity: 'error',
        }),
      ]),
    );
  });

  it('rejects uppercase or invalid identifiers with PARSE_INVALID_IDENTIFIER', () => {
    const result = parseLessonSource(invalidLessonSources.invalidIdentifier);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PARSE_INVALID_IDENTIFIER',
          severity: 'error',
        }),
      ]),
    );
  });

  it('recovers at the next recognizable section boundary after a malformed section', () => {
    const malformedWithRecovery = `FORMAT: WorkLingoLesson/1.0

[CONTENT bad-content]
type: email
unknown_field: xyz
[/CONTENT]

[LESSON]
slug: recovered-lesson
title: Recovered Lesson
level: foundation
duration_minutes: 60
objective: Successfully recovered lesson.
`;
    const result = parseLessonSource(malformedWithRecovery);

    // Should have reported an error for unknown field in bad-content
    expect(result.issues.some((i) => i.code === 'PARSE_UNKNOWN_FIELD')).toBe(true);
    // But still successfully parsed the subsequent [LESSON] section
    expect(result.document.lesson).toBeDefined();
    expect(result.document.lesson?.slug).toBe('recovered-lesson');
    expect(result.document.lesson?.title).toBe('Recovered Lesson');
  });

  it('correctly handles Review Focus case: BOM + CRLF + Vietnamese + emoji surrogate pairs', () => {
    const bomCrlfSource =
      '\uFEFFFORMAT: WorkLingoLesson/1.0\r\n\r\n' +
      '[LESSON]\r\n' +
      'slug: vn-emoji-lesson\r\n' +
      'title: Tiếng Việt 😀 xin chào\r\n' +
      'level: foundation\r\n' +
      'duration_minutes: 60\r\n' +
      'objective: Test BOM CRLF Vietnamese.\r\n';

    const result = parseLessonSource(bomCrlfSource);
    expect(result.issues).toEqual([]);
    expect(result.document.lesson).toBeDefined();

    const lesson = result.document.lesson!;
    expect(lesson.title).toBe('Tiếng Việt 😀 xin chào');

    // Title line starts at line 4 (BOM is offset 0 on line 1)
    // Slicing lesson range must match exact source
    const slice = bomCrlfSource.slice(lesson.range.start.offset, lesson.range.end.offset);
    expect(slice).toContain('title: Tiếng Việt 😀 xin chào');
    expect(lesson.range.start.line).toBe(3); // [LESSON] is on line 3
    expect(lesson.range.start.column).toBe(1);
  });
});
