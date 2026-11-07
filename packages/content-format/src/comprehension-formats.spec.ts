import { describe, expect, it } from 'vitest';
import {
  canonicalLessonSource,
  foundationLessonSource,
} from '@worklingo/test-fixtures';
import { analyzeLessonSource, parseLessonSource } from './index.js';
import { lessonSnapshotSchema } from '../../../apps/api/src/curriculum/domain/curriculum.types.js';

function sourceFor(type: string, fields = '', options = '') {
  return canonicalLessonSource.replace(
    /\[ACTIVITY reading-comprehension\][\s\S]*?\[\/ACTIVITY\]/u,
    `[ACTIVITY reading-comprehension]
learning_block: read_decode
activity_type: reading
response_type: ${type}
skills: reading
content_refs: complaint-email
language_block_refs: apologize
${fields}
QUESTION: What happened?
${options}
EXPLANATION: Source-backed reason.
EVIDENCE: complaint-email:4
[/ACTIVITY]`,
  );
}
const formats = [
  [
    'true_false',
    '',
    'OPTIONS:\nA. True\nB. False\nANSWER: A',
    { responseType: 'true_false', options: ['True', 'False'], answerIndex: 0 },
  ],
  [
    'matching',
    '',
    'OPTIONS:\nA. Damaged items\nB. Missing invoice\nANSWER: A',
    {
      responseType: 'matching',
      options: ['Damaged items', 'Missing invoice'],
      answerIndex: 0,
    },
  ],
  [
    'fill_blank',
    'accepted_answers: damaged | broken\nanswer_case_sensitive: false',
    '',
    {
      responseType: 'fill_blank',
      options: [],
      answerIndex: -1,
      acceptedAnswers: ['damaged', 'broken'],
      answerCaseSensitive: false,
    },
  ],
  [
    'short_answer',
    'accepted_answers: damaged items\nsemantic_criteria: Accept a paraphrase that preserves the damage report.',
    '',
    {
      responseType: 'short_answer',
      answerIndex: -1,
      acceptedAnswers: ['damaged items'],
      semanticCriteria: 'Accept a paraphrase that preserves the damage report.',
    },
  ],
  [
    'open_ended',
    'semantic_criteria: Explain the damage and missing accessories using the source.',
    '',
    {
      responseType: 'open_ended',
      answerIndex: -1,
      semanticCriteria:
        'Explain the damage and missing accessories using the source.',
    },
  ],
] as const;
describe('authored comprehension formats', () => {
  it.each(formats)(
    'parses and normalizes %s with private authored criteria',
    (type, fields, options, expected) => {
      const source = sourceFor(type, fields, options);
      const parsed = parseLessonSource(source);
      expect(parsed.issues).toEqual([]);
      const analysis = analyzeLessonSource(source);
      expect(analysis.issues.filter((i) => i.severity === 'error')).toEqual([]);
      expect(analysis.canPublish).toBe(true);
      const activity = analysis.normalizedDraft!.activities.find(
        (a) => a.slug === 'reading-comprehension',
      )!;
      expect(
        'questions' in activity.payload ? activity.payload.questions[0] : null,
      ).toMatchObject(expected);
      const draft = analysis.normalizedDraft!;
      const snapshot = lessonSnapshotSchema.parse(
        JSON.parse(
          JSON.stringify({
            title: draft.title,
            contentBlocks: draft.contentBlocks.map((c) => ({
              ...c,
              id: crypto.randomUUID(),
            })),
            wordBanks: draft.wordBanks.map((w) => ({
              ...w,
              id: crypto.randomUUID(),
              languageBlocks: w.languageBlocks.map((l) => ({
                ...l,
                id: crypto.randomUUID(),
              })),
            })),
            activities: draft.activities.map((a) => ({
              ...a,
              id: crypto.randomUUID(),
            })),
          }),
        ),
      );
      const published = snapshot.activities.find(
        (a) => a.slug === 'reading-comprehension',
      )!;
      expect(
        'questions' in published.payload
          ? published.payload.questions[0]
          : null,
      ).toMatchObject(expected);
    },
  );
  it('supports the same comprehension formats in Foundation metadata without weakening objective evidence', () => {
    const source = sourceFor(
      'open_ended',
      'semantic_criteria: Explain damage from source.',
    );
    const original = parseLessonSource(
      canonicalLessonSource,
    ).document.activities.find((a) => a.slug === 'reading-comprehension')!;
    const replacement = source
      .match(/\[ACTIVITY reading-comprehension\][\s\S]*?\[\/ACTIVITY\]/u)![0]
      .replace(
        'skills: reading',
        'skills: reading\nobjective_refs: explain-complaint',
      );
    expect(original.slug).toBe('reading-comprehension');
    const foundation = foundationLessonSource.replace(
      /\[ACTIVITY reading-comprehension\][\s\S]*?\[\/ACTIVITY\]/u,
      replacement,
    );
    expect(
      analyzeLessonSource(foundation).issues.filter(
        (i) => i.severity === 'error',
      ),
    ).toEqual([]);
  });
  it.each([
    sourceFor('open_ended'),
    sourceFor('fill_blank'),
    sourceFor('short_answer'),
    sourceFor(
      'fill_blank',
      'accepted_answers: yes\nanswer_case_sensitive: perhaps',
    ),
    sourceFor('true_false', '', 'OPTIONS:\nA. Yes\nB. No\nANSWER: A'),
  ])(
    'rejects incomplete private criteria or invalid response metadata %#',
    (source) => expect(analyzeLessonSource(source).canPublish).toBe(false),
  );
});
