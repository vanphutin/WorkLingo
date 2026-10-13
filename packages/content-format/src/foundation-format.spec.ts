import { describe, expect, it } from 'vitest';
import { canonicalLessonSource, foundationLessonSource } from '@worklingo/test-fixtures';
import { analyzeLessonSource, parseLessonSource } from './index.js';

describe('Foundation Format 1.1', () => {
  it('parses metadata without changing Format 1.0', () => {
    const result = analyzeLessonSource(foundationLessonSource);
    expect(result.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(result.normalizedDraft).toMatchObject({ foundation: {
      category: 'grammar', templateId: 'foundation-grammar', templateVersion: 1,
      objectives: [{ slug: 'explain-complaint', required: true, skills: ['reading', 'listening', 'speaking', 'writing'] }],
      activityObjectives: { 'reading-comprehension': ['explain-complaint'] },
    } });
    expect(analyzeLessonSource(canonicalLessonSource).canPublish).toBe(true);
    expect(analyzeLessonSource(canonicalLessonSource).normalizedDraft).not.toHaveProperty('foundation');
  });

  it('preserves BOM, CRLF and Vietnamese source ranges', () => {
    const source = '\uFEFF' + foundationLessonSource.replace('required: true', 'required: maybe').replaceAll('\n', '\r\n');
    const issue = analyzeLessonSource(source).issues.find((item) => item.code === 'VAL_INVALID_OBJECTIVE');
    expect(issue).toBeDefined();
    const range = issue!.range;
    expect(source.slice(range.start.offset, range.end.offset)).toContain('Hiểu lý do');
    expect(source.slice(0, range.start.offset).split('\n')).toHaveLength(range.start.line);
    expect(range.start.column).toBe(1);
  });

  it.each([
    ['unknown reference', 'objective_refs: explain-complaint', 'objective_refs: missing', 'VAL_UNKNOWN_OBJECTIVE'],
    ['unassessed skill', 'skills: reading | listening | speaking | writing', 'skills: reading | listening | speaking | writing', 'VAL_UNASSESSED_OBJECTIVE'],
    ['missing explanation', 'David states that his items arrived damaged and accessories were missing.', '', 'VAL_ASSESSMENT_REQUIRED'],
    ['invalid evidence line', 'complaint-call:1', 'complaint-call:1junk', 'VAL_INVALID_EVIDENCE'],
    ['unrelated evidence', 'complaint-call:1', 'complaint-email:4', 'VAL_INVALID_EVIDENCE'],
    ['missing rubric', 'rubric: Explain the delay and use apologize for correctly.', '', 'VAL_ASSESSMENT_REQUIRED'],
    ['missing pronunciation', 'pronunciation: /əˈpɒlədʒaɪz/', '', 'VAL_ASSESSMENT_REQUIRED'],
    ['missing grammar pattern', 'grammar_pattern: apologize for + noun/V-ing', '', 'VAL_ASSESSMENT_REQUIRED'],
    ['placeholder title', 'title: Handling Customer Complaints', 'title: TODO lesson title', 'VAL_INCOMPLETE_TEMPLATE'],
  ])('rejects %s', (name, before, after, code) => {
    let source = foundationLessonSource.replace(before, after);
    if (name === 'unassessed skill') source = source.replace('objective_refs: explain-complaint', 'objective_refs:');
    const result = analyzeLessonSource(source);
    expect(result.canPublish).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(code);
    expect(result.normalizedDraft).toBeNull();
  });

  it('rejects duplicate or unclosed metadata and downgrade smuggling', () => {
    for (const source of [
      foundationLessonSource.replace('[/FOUNDATION]', ''),
      foundationLessonSource + '\n[FOUNDATION]\ncategory: grammar\n[/FOUNDATION]',
      foundationLessonSource.replace('WorkLingoLesson/1.1', 'WorkLingoLesson/1.0'),
    ]) expect(analyzeLessonSource(source).canPublish).toBe(false);
    expect(parseLessonSource(foundationLessonSource).issues).toEqual([]);
  });

  it('requires bounded unique objectives and one required objective', () => {
    const objective = foundationLessonSource.match(/\[OBJECTIVE explain-complaint\][\s\S]*?\[\/OBJECTIVE\]/)![0];
    for (const source of [
      foundationLessonSource.replace(objective, ''),
      foundationLessonSource + '\n' + objective,
      foundationLessonSource.replace('required: true', 'required: false'),
      foundationLessonSource.replace('template_version: 1', 'template_version: 1junk'),
      foundationLessonSource.replace('skills: reading | listening | speaking | writing', 'skills: reading | reading'),
    ]) expect(analyzeLessonSource(source).canPublish).toBe(false);
  });
});
