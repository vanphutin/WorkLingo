import { describe, expect, it } from 'vitest';
import { foundationLessonSource, canonicalLessonSource } from '@worklingo/test-fixtures';
import { analyzeLessonSource, parseLessonSource, type ResponseType } from './index.js';
const guidedResponse: ResponseType = 'guided_response';

export function beginnerSource(): string {
  return foundationLessonSource.replace('WorkLingoLesson/1.1', 'WorkLingoLesson/1.2')
    .replace('duration_minutes: 60', 'duration_minutes: 45')
    .replace('response_type: shadowing', 'response_type: '+guidedResponse)
    .replace(/(response_type: (?:guided_response|short_text))/gu, '$1\nmin_words: 1\nsample_answer: Hidden response\nrubric_version: 1')
    .replace('response_type: guided_response', 'response_type: guided_response\nrubric_id: beginner-guided-speaking')
    .replace('response_type: short_text', 'response_type: short_text\nrubric_id: beginner-short-writing')
    + '\n[INSTRUCTION practice-guide]\nphase: readDecode\norder: 0\ntext: Đọc ví dụ rồi làm bài.\n[/INSTRUCTION]\n';
}

describe('Beginner format 1.2', () => {
  it('normalizes instructions and independent response without legacy word floor', () => {
    const result = analyzeLessonSource(beginnerSource());
    expect(result.issues.filter(i => i.severity === 'error')).toEqual([]);
    expect(result.canPublish).toBe(true); // pure structural result, runtime publication remains denied
    expect(result.normalizedDraft).toMatchObject({ formatVersion: 'WorkLingoLesson/1.2', instructions: [
      { slug: 'practice-guide', phase: 'readDecode', order: 0, text: 'Đọc ví dụ rồi làm bài.' },
    ] });
    expect(result.normalizedDraft?.activities.find(a=>a.activityType==='speaking')?.payload).toMatchObject({
      mode: 'guided_response', minWords: 1, sampleAnswer: 'Hidden response', rubricId: 'beginner-guided-speaking', rubricVersion: '1',
    });
    expect(result.normalizedDraft?.activities.find(a=>a.activityType==='writing')?.payload).toMatchObject({ minWords: 1, rubricId:'beginner-short-writing' });
  });
  it('handles BOM and CRLF without losing instruction source range', () => {
    const source = '\uFEFF'+beginnerSource().replaceAll('\n','\r\n');
    const result = parseLessonSource(source);
    expect(result.issues).toEqual([]);
    const instruction = result.document.instructions![0]!;
    expect(source.slice(instruction.range.start.offset,instruction.range.end.offset)).toContain('Đọc ví dụ');
  });
  it.each([
    ['min_words: 1', 'min_words: 0'], ['min_words: 1', 'min_words: 1junk'],
    ['rubric_version: 1', 'rubric_version: 2'], ['rubric_id: beginner-guided-speaking','rubric_id: beginner-short-writing'],
    ['sample_answer: Hidden response','sample_answer: TODO'], ['phase: readDecode','phase: unknown'],
    ['order: 0','order: -1'], ['text: Đọc ví dụ rồi làm bài.','text: TODO'],
  ])('rejects invalid 1.2 field %s -> %s', (before,after) => {
    expect(analyzeLessonSource(beginnerSource().replace(before,after)).canPublish).toBe(false);
  });
  it('rejects missing fields, duplicate instructions and incomplete instruction tags', () => {
    const s=beginnerSource();
    for(const candidate of [s.replace('min_words: 1',''),s.replace('sample_answer: Hidden response',''),s.replace('[/INSTRUCTION]',''),s+s.slice(s.indexOf('[INSTRUCTION'))]) {
      expect(analyzeLessonSource(candidate).canPublish).toBe(false);
    }
  });
  it('does not allow 1.2 semantics in 1.0/1.1 or alter legacy snapshots', () => {
    for(const version of ['1.0','1.1']) expect(analyzeLessonSource(beginnerSource().replace('1.2',version)).canPublish).toBe(false);
    for(const source of [foundationLessonSource,canonicalLessonSource]) {
      const normalized=analyzeLessonSource(source).normalizedDraft!;
      expect(normalized).not.toHaveProperty('instructions');
      expect(normalized).not.toHaveProperty('formatVersion');
      expect(normalized.activities.find(a=>a.activityType==='speaking')?.payload).toMatchObject({mode:'shadowing'});
    }
  });
});
