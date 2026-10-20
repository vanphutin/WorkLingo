import { describe, expect, it } from 'vitest';
import { parseLessonSource } from './parser.ts';
import { analyzeLessonSource } from './validator.ts';
import { intermediateCategories, isIntermediateCategory } from './intermediate-authoring.ts';

const lesson = (metadata = '') => `FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: lesson-one\ntitle: Lesson One\nlevel: B1\nduration_minutes: 60\nobjective: Understand a workplace update.\n${metadata}[/LESSON]\n`;
describe('Intermediate authoring metadata', () => {
  it.each(['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'])('reads explicit %s classification without treating it as Foundation', category => {
    const result = parseLessonSource(lesson(`program: intermediate\ncategory: ${category}\nauthoring_template: intermediate-form-v1\n`));
    expect(result.issues).toEqual([]);
    expect(result.document.lesson).toMatchObject({ program: 'intermediate', category, authoringTemplate: 'intermediate-form-v1' });
    expect(result.document.foundation).toBeUndefined();
  });
  it('keeps old format documents unclassified and validates category slugs', () => {
    expect(parseLessonSource(lesson()).document.lesson).not.toHaveProperty('program');
    expect(intermediateCategories).toHaveLength(7);
    expect(isIntermediateCategory('reading')).toBe(true);
    expect(isIntermediateCategory('constructor')).toBe(false);
  });
  it.each(['program: intermediate\n', 'category: reading\n', 'program: ielts\ncategory: reading\n', 'program: intermediate\ncategory: unknown\n'])('rejects invalid or unpaired classification: %s', metadata => {
    expect(analyzeLessonSource(lesson(metadata)).issues).toContainEqual(expect.objectContaining({ code: 'VAL_AUTHORING_CLASSIFICATION', severity: 'error' }));
  });
  it('preserves empty draft options while rejecting them for publication', () => {
    const source = lesson() + '[ACTIVITY draft-question]\nlearning_block: read_decode\nactivity_type: reading\nresponse_type: multiple_choice\nskills: reading\nQUESTION: Choose a response.\nOPTIONS:\nA. \nB. \n\nANSWER: A\n[/ACTIVITY]\n';
    expect(parseLessonSource(source).document.activities[0]?.options.map(item => item.text)).toEqual(['', '']);
    expect(analyzeLessonSource(source).issues).toContainEqual(expect.objectContaining({ code: 'VAL_EMPTY_OPTION', severity: 'error' }));
  });
});
