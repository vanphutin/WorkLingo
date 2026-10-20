import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyTopicJsonRepairEdits, isSafeTopicJsonRepair, intermediateTopicJsonSchema } from './index.ts';
const source = readFileSync(new URL('../../../docs/examples/intermediate-topic.json', import.meta.url), 'utf8');
describe('Conservative topic JSON repair', () => {
  it('accepts punctuation repair without changing primitives or question counts', () => {
    const broken = source.replace('"level": "B1",', '"level": "B1",,');
    expect(isSafeTopicJsonRepair(broken, source)).toBe(true);
    expect(applyTopicJsonRepairEdits(broken, [{ search: '"level": "B1",,', replacement: '"level": "B1",' }])).toBe(source);
  });
  it('permits flattening model whitespace but preserves the source passage line structure', () => {
    const json = JSON.parse(source);
    const original = JSON.stringify({ ...json, writingModel: 'Dear guest,\n\nYour booking is confirmed.' });
    const repaired = JSON.stringify({ ...json, writingModel: 'Dear guest, Your booking is confirmed.' });
    expect(isSafeTopicJsonRepair(original, repaired)).toBe(true);
    expect(isSafeTopicJsonRepair(source, JSON.stringify({ ...json, readingText: json.readingText.replace(/\n/g, ' ') }))).toBe(false);
  });
  it('refuses changed answers, invented questions, missing data and ambiguous patches', () => {
    const json = JSON.parse(source);
    expect(isSafeTopicJsonRepair(source, JSON.stringify({ ...json, readingQuestions: [{ ...json.readingQuestions[0], answerIndex: 1 }] }))).toBe(false);
    expect(isSafeTopicJsonRepair(source, JSON.stringify({ ...json, readingQuestions: [...json.readingQuestions, { ...json.readingQuestions[0], slug: 'new-question' }] }))).toBe(false);
    expect(isSafeTopicJsonRepair('{"title":"unfinished', source)).toBe(false);
    expect(applyTopicJsonRepairEdits(source, [{ search: '"slug"', replacement: '"id"' }])).toBeNull();
    expect(applyTopicJsonRepairEdits(source, [])).toBeNull();
  });
  it('refuses structural regrouping and duplicate keys that could silently discard content', () => {
    const duplicate = source.replace('"title": "A restaurant reservation",', '"title": "Original content", "title": "A restaurant reservation",');
    expect(isSafeTopicJsonRepair(duplicate, duplicate.replace('"level": "B1"', '"level" : "B1"'))).toBe(false);
    const missingClosingBrace = source.trimEnd().slice(0, -1);
    expect(isSafeTopicJsonRepair(missingClosingBrace, source)).toBe(false);
  });
  it('keeps exact field diagnostics for multiple invalid scalar fields', () => {
    const result = intermediateTopicJsonSchema.safeParse({ ...JSON.parse(source), writingModel: 'A\nB', speaker: 'An\nNhi' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining(['writingModel', 'speaker']));
  });
});
