import { isIntermediateCategory, parseLessonSource, type ActivityNode, type IntermediateCategory } from '@worklingo/content-format';

export interface IntermediateLanguageBlock {
  slug: string; expression: string; meaningVi: string; pronunciation: string; grammarPattern: string;
  example: string; commonError: string; collocations: string[];
}
export interface IntermediateQuestion {
  slug: string; prompt: string; options: string[]; answerIndex: number; explanation: string; evidenceLine: number;
}
export interface IntermediateLessonDraft {
  slug: string; title: string; level: string; objective: string; durationMinutes: number;
  readingText: string; speaker: string; dialogue: string; activatePrompt: string;
  speakingPrompt: string; speakingModel: string; writingPrompt: string; writingModel: string;
  languageBlocks: IntermediateLanguageBlock[]; readingQuestions: IntermediateQuestion[]; listeningQuestions: IntermediateQuestion[];
}

export function createIntermediateLessonDraft(category: IntermediateCategory): IntermediateLessonDraft {
  const question = (skill: string): IntermediateQuestion => ({ slug: `${skill}-question-1`, prompt: '', options: ['', ''], answerIndex: 0, explanation: '', evidenceLine: 1 });
  return {
    slug: `intermediate-${category}-${crypto.randomUUID().slice(0, 8)}`, title: '', level: 'B1', objective: '', durationMinutes: 60,
    readingText: '', speaker: '', dialogue: '', activatePrompt: '', speakingPrompt: '', speakingModel: '', writingPrompt: '', writingModel: '',
    languageBlocks: [{ slug: 'target-phrase', expression: '', meaningVi: '', pronunciation: '', grammarPattern: '', example: '', commonError: '', collocations: [] }],
    readingQuestions: [question('reading')], listeningQuestions: [question('listening')],
  };
}

function scalar(value: string, field: string): string {
  if (typeof value !== 'string' || /[\r\n\u2028\u2029]/u.test(value) || value.includes('\0')) throw new Error(`${field}: use a single line.`);
  return value.trim();
}
function identifier(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) throw new Error('Use a lowercase lesson or item slug, separated by hyphens.');
  return value;
}
function block(value: string, field: string, paragraphs: boolean): string {
  const text = value.replace(/\r\n?/gu, '\n').trim();
  if (text.split('\n').some(line => /^\s*(?:\[|<<<|>>>|FORMAT:|QUESTION:|OPTIONS:|ANSWER:|EXPLANATION:|EVIDENCE:)/u.test(line))
    || text.includes('\0') || (!paragraphs && /\n\s*\n/u.test(text))) throw new Error(`${field}: contains unsupported source delimiters or paragraph breaks.`);
  return text;
}

export function serializeIntermediateLesson(category: IntermediateCategory, draft: IntermediateLessonDraft): string {
  if (!isIntermediateCategory(category)) throw new Error('Unsupported Intermediate category.');
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 1 || draft.durationMinutes > 300) throw new Error('Lesson duration must be between 1 and 300 minutes.');
  if (draft.languageBlocks.length < 1 || draft.readingQuestions.length < 1 || draft.listeningQuestions.length < 1) throw new Error('Keep at least one language block and one question for each comprehension skill.');
  const allSlugs = ['workplace-language', 'workplace-reading', 'workplace-dialogue', 'workplace-audio', 'activate', 'speaking-response', 'writing-response',
    ...draft.languageBlocks.map(item => item.slug), ...draft.readingQuestions.map(item => item.slug), ...draft.listeningQuestions.map(item => item.slug)];
  allSlugs.forEach(identifier);
  if (new Set(allSlugs).size !== allSlugs.length) throw new Error('Lesson item slugs must be unique.');
  const refs = draft.languageBlocks.map(item => item.slug).join(' | ');
  const activities = (skill: 'reading' | 'listening', questions: IntermediateQuestion[]) => questions.map(question => {
    if (question.options.length < 2 || question.options.length > 10 || !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length
      || !Number.isInteger(question.evidenceLine) || question.evidenceLine < 1) throw new Error('Check question options, answer and evidence line.');
    return `[ACTIVITY ${identifier(question.slug)}]
learning_block: ${skill === 'reading' ? 'read_decode' : 'listen_reason'}
activity_type: ${skill}
response_type: multiple_choice
skills: ${skill}
content_refs: ${skill === 'reading' ? 'workplace-reading' : 'workplace-dialogue'}
language_block_refs: ${refs}
${skill === 'listening' ? 'audio_ref: workplace-audio\n' : ''}
QUESTION:
${block(question.prompt, 'Question', false)}

OPTIONS:
${question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${scalar(option, 'Option')}`).join('\n')}

ANSWER: ${String.fromCharCode(65 + question.answerIndex)}

EXPLANATION:
${block(question.explanation, 'Explanation', false)}

EVIDENCE: ${skill === 'reading' ? 'workplace-reading' : 'workplace-dialogue'}:${question.evidenceLine}
[/ACTIVITY]`;
  }).join('\n\n');
  const response = (skill: 'speaking' | 'writing', prompt: string, model: string) => `[ACTIVITY ${skill}-response]
learning_block: respond
activity_type: ${skill}
response_type: ${skill === 'speaking' ? 'shadowing' : 'short_text'}
skills: ${skill}
content_refs: workplace-reading
language_block_refs: ${refs}
prompt: ${scalar(model, 'Model response')}

QUESTION:
${block(prompt, 'Response prompt', false)}
[/ACTIVITY]`;
  return `FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: ${identifier(draft.slug)}
title: ${scalar(draft.title, 'Title')}
level: ${scalar(draft.level, 'Level')}
duration_minutes: ${draft.durationMinutes}
objective: ${scalar(draft.objective, 'Objective')}
program: intermediate
category: ${category}
authoring_template: intermediate-form-v1
[/LESSON]

[WORD_BANK workplace-language]
title: Workplace language
${draft.languageBlocks.map(item => {
    const collocations = item.collocations.map(value => scalar(value, 'Collocation')).filter(value => value.length > 0);
    if (collocations.some(value => value.includes('|'))) throw new Error('Write each collocation as a separate item.');
    return `[[LANGUAGE_BLOCK ${identifier(item.slug)}]]
expression: ${scalar(item.expression, 'Expression')}
meaning_vi: ${scalar(item.meaningVi, 'Meaning')}
pronunciation: ${scalar(item.pronunciation, 'Pronunciation')}
grammar_pattern: ${scalar(item.grammarPattern, 'Grammar pattern')}
collocations: ${collocations.join(' | ')}
example: ${scalar(item.example, 'Example')}
common_error: ${scalar(item.commonError, 'Common error')}
[[/LANGUAGE_BLOCK]]`;
  }).join('\n')}
[/WORD_BANK]

[CONTENT workplace-reading]
type: email
text:
<<<
${block(draft.readingText, 'Reading text', true)}
>>>
[/CONTENT]

[AUDIO_SCRIPT workplace-audio]
speaker: ${scalar(draft.speaker, 'Speaker')}
script:
<<<
${block(draft.dialogue, 'Dialogue', true)}
>>>
[/AUDIO_SCRIPT]

[CONTENT workplace-dialogue]
type: dialogue
text:
<<<
${block(draft.dialogue, 'Dialogue', true)}
>>>
[/CONTENT]

[ACTIVITY activate]
learning_block: activate
activity_type: writing
response_type: short_text
skills: writing
content_refs: workplace-reading
language_block_refs: ${refs}

QUESTION:
${block(draft.activatePrompt, 'Warm-up prompt', false)}
[/ACTIVITY]

${activities('reading', draft.readingQuestions)}

${activities('listening', draft.listeningQuestions)}

${response('speaking', draft.speakingPrompt, draft.speakingModel)}

${response('writing', draft.writingPrompt, draft.writingModel)}
`;
}

export function getIntermediateCategory(source: string): IntermediateCategory | null {
  const document = parseLessonSource(source).document;
  const lesson = document.lesson;
  return !document.foundation && lesson?.program === 'intermediate' && isIntermediateCategory(lesson.category ?? '') ? lesson.category as IntermediateCategory : null;
}

/** Lossless managed-format reader. Custom lessons stay in the advanced editor. */
export function readIntermediateLesson(source: string, category: IntermediateCategory): IntermediateLessonDraft | null {
  try {
    const parsed = parseLessonSource(source);
    const { lesson, wordBanks, contents, audioScripts, activities } = parsed.document;
    if (parsed.issues.length || getIntermediateCategory(source) !== category || lesson?.authoringTemplate !== 'intermediate-form-v1'
      || wordBanks.length !== 1 || contents.length !== 2 || audioScripts.length !== 1) return null;
    const question = (activity: ActivityNode): IntermediateQuestion => ({
      slug: activity.slug, prompt: activity.question ?? '', options: activity.options.map(item => item.text),
      answerIndex: activity.answer ? activity.answer.charCodeAt(0) - 65 : 0, explanation: activity.explanation ?? '',
      evidenceLine: Number(activity.evidence[0]?.split(':')[1] ?? 1),
    });
    const draft: IntermediateLessonDraft = {
      slug: lesson.slug, title: lesson.title, level: lesson.level, objective: lesson.objective, durationMinutes: lesson.durationMinutes,
      readingText: contents.find(item => item.slug === 'workplace-reading')?.text ?? '', speaker: audioScripts[0]!.speaker ?? '', dialogue: audioScripts[0]!.script,
      activatePrompt: activities.find(item => item.slug === 'activate')?.question ?? '',
      speakingPrompt: activities.find(item => item.slug === 'speaking-response')?.question ?? '', speakingModel: activities.find(item => item.slug === 'speaking-response')?.prompt ?? '',
      writingPrompt: activities.find(item => item.slug === 'writing-response')?.question ?? '', writingModel: activities.find(item => item.slug === 'writing-response')?.prompt ?? '',
      languageBlocks: wordBanks[0]!.languageBlocks.map(item => ({ slug: item.slug, expression: item.expression, meaningVi: item.meaningVi,
        pronunciation: item.pronunciation ?? '', grammarPattern: item.grammarPattern ?? '', example: item.examples[0] ?? '', commonError: item.commonErrors[0] ?? '', collocations: [...item.collocations] })),
      readingQuestions: activities.filter(item => item.activityType === 'reading').map(question),
      listeningQuestions: activities.filter(item => item.activityType === 'listening').map(question),
    };
    const canonical = (text: string) => text.replaceAll('\r\n', '\n').trim();
    return canonical(serializeIntermediateLesson(category, draft)) === canonical(source) ? draft : null;
  } catch { return null; }
}
