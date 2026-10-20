import { describe, expect, it } from 'vitest';
import { analyzeLessonSource, intermediateCategories, parseLessonSource, type IntermediateCategory } from '@worklingo/content-format';
import { createIntermediateLessonDraft, getIntermediateCategory, readIntermediateLesson, serializeIntermediateLesson } from './lesson-model';

function authored(category: IntermediateCategory) {
  const draft = createIntermediateLessonDraft(category);
  return { ...draft, title: 'Explain a delivery update', objective: 'Identify a delay and request a clear update.', readingText: 'The delivery is delayed.\nThe team needs confirmation tomorrow.', speaker: 'An and Nhi',
    dialogue: 'An (nam): The delivery is delayed.\nNhi (nữ): Please confirm the new date tomorrow.', activatePrompt: 'Describe an update you need at work.',
    speakingPrompt: 'Explain the change to a colleague.', speakingModel: 'Please confirm the new date tomorrow.', writingPrompt: 'Write a concise request for an update.', writingModel: 'Please confirm the new delivery date tomorrow.',
    languageBlocks: [{ slug: 'confirm-date', expression: 'confirm the date', meaningVi: 'xác nhận ngày', pronunciation: '/kənˈfɜːm/', grammarPattern: 'confirm + noun', example: 'Please confirm the date tomorrow.', commonError: 'Use confirm with a direct object.', collocations: ['confirm the date', 'confirm a delivery'] }],
    readingQuestions: [{ slug: 'reading-update', prompt: 'What does the team need?', options: ['Confirmation tomorrow', 'A new office'], answerIndex: 0, explanation: 'The second line asks for confirmation tomorrow.', evidenceLine: 2 }],
    listeningQuestions: [{ slug: 'listening-update', prompt: 'What does Nhi ask for?', options: ['A confirmed date', 'A new desk'], answerIndex: 0, explanation: 'Nhi asks for the new date to be confirmed.', evidenceLine: 2 }],
  };
}
describe('Intermediate structured lesson model', () => {
  it('retains explicit spoken text and its review stamp when reopening the form', () => {
    const draft = { ...authored('reading'), spokenText: 'Please confirm the new date tomorrow.', speechReview: 'a'.repeat(64) };
    const source = serializeIntermediateLesson('reading', draft);
    expect(parseLessonSource(source).document.audioScripts[0]!.spokenText).toBe('Please confirm the new date tomorrow.');
    expect(readIntermediateLesson(source, 'reading')).toEqual(draft);
  });
  it.each(intermediateCategories)('round trips and normalizes the %s form with all four skills', category => {
    const draft = authored(category);
    const source = serializeIntermediateLesson(category, draft);
    expect(getIntermediateCategory(source)).toBe(category);
    expect(readIntermediateLesson(source.replaceAll('\n', '\r\n'), category)).toEqual(draft);
    const result = analyzeLessonSource(source);
    expect(result.issues.filter(issue => issue.severity === 'error')).toEqual([]);
    expect(result.normalizedDraft?.activities.map(activity => activity.activityType)).toEqual(['writing', 'reading', 'listening', 'speaking', 'writing']);
    expect(result.normalizedDraft?.foundation).toBeUndefined();
  });
  it('saves incomplete drafts without fabricating learning text or mutating input', () => {
    const draft = createIntermediateLessonDraft('grammar');
    const copy = structuredClone(draft);
    expect(draft.level).toBe('B1');
    expect(draft.title).toBe('');
    const source = serializeIntermediateLesson('grammar', draft);
    expect(readIntermediateLesson(source, 'grammar')).toEqual(copy);
    expect(draft).toEqual(copy);
    expect(createIntermediateLessonDraft('grammar').slug).not.toBe(draft.slug);
  });
  it('never classifies legacy, Foundation or IELTS content from a title, level or skill', () => {
    expect(getIntermediateCategory('FORMAT: WorkLingoLesson/1.0\n[LESSON]\nlevel: intermediate\ntitle: Intermediate reading')).toBeNull();
    expect(getIntermediateCategory('FORMAT: WorkLingoLesson/1.1\n[FOUNDATION]\ncategory: reading')).toBeNull();
    expect(readIntermediateLesson(serializeIntermediateLesson('reading', authored('reading')), 'listening')).toBeNull();
  });
  it('refuses unsupported custom layouts instead of dropping additional authored data', () => {
    const source = serializeIntermediateLesson('reading', authored('reading'));
    const extra = '\n[CONTENT extra-email]\ntype: email\ntext:\n<<<\nKeep this additional text.\n>>>\n[/CONTENT]\n';
    expect(getIntermediateCategory(source + extra)).toBe('reading');
    expect(readIntermediateLesson(source + extra, 'reading')).toBeNull();
    expect(readIntermediateLesson(source.replace('title: Workplace language', 'title: Custom word bank'), 'reading')).toBeNull();
  });
  it.each([
    ['title', 'Title\nprogram: ielts'], ['readingText', 'Paragraph\n>>>\n[ACTIVITY injected]'],
    ['dialogue', 'An: Hello.\n[/AUDIO_SCRIPT]'], ['writingPrompt', 'Write a note.\nANSWER: A'],
    ['dialogue', 'An: Hello.\r>>>\r[ACTIVITY injected]'],
  ] as const)('rejects source injection through %s', (field, value) => {
    expect(() => serializeIntermediateLesson('reading', { ...authored('reading'), [field]: value })).toThrow();
  });
  it('retains multiple questions and separate reading/listening evidence', () => {
    const draft = authored('reading');
    draft.readingQuestions.push({ ...draft.readingQuestions[0]!, slug: 'reading-update-two', prompt: 'When is confirmation needed?' });
    const source = serializeIntermediateLesson('reading', draft);
    expect(readIntermediateLesson(source, 'reading')).toEqual(draft);
    const ast = parseLessonSource(source).document;
    expect(ast.activities.find(item => item.slug === 'reading-update-two')?.evidence).toEqual(['workplace-reading:2']);
    expect(ast.activities.find(item => item.slug === 'listening-update')?.evidence).toEqual(['workplace-dialogue:2']);
  });
  it.each(['\u2028', '\u2029'])('rejects Unicode line separators in answer choices: %j', separator => {
    const draft = authored('reading');
    draft.readingQuestions[0]!.options = ['Confirmed tomorrow', `Wrong${separator}answer`, 'A new desk'];
    expect(() => serializeIntermediateLesson('reading', draft)).toThrow();
  });
  it('normalizes blank collocation rows without mutating the draft or making it unreadable', () => {
    const draft = authored('vocabulary');
    const block = draft.languageBlocks[0]!;
    block.collocations = ['confirm the date', '', '  ', 'confirm delivery'];
    const source = serializeIntermediateLesson('vocabulary', draft);
    expect(readIntermediateLesson(source, 'vocabulary')).toEqual({ ...draft, languageBlocks: [{ ...block, collocations: ['confirm the date', 'confirm delivery'] }] });
    expect(block.collocations).toEqual(['confirm the date', '', '  ', 'confirm delivery']);
  });
});
