import { foundationCategories, type FoundationCategory } from './foundation-metadata.ts';

const guidance: Record<FoundationCategory, string> = {
  grammar: 'Explain a form, contrast its meaning, then use it in a new workplace context.',
  pronunciation: 'Notice a sound or stress contrast, shadow it, and explain the meaning difference.',
  vocabulary: 'Infer a phrase in context, retrieve it, then transfer it to another situation.',
  reading: 'Connect purpose, details and inference; justify answers using exact text lines.',
  listening: 'Connect what speakers mean and need; justify answers using exact script lines. Declare dialogue voices with Name (nam/nữ) or Name (male/female); later turns may use Name alone. More than two characters requires gender for every character. Never infer gender from names.',
  speaking: 'Shadow a purposeful model; assess intelligibility and meaning with a clear rubric.',
  writing: 'Understand a model then produce a clear message for a specific reader and purpose.',
};

/** Editable scaffolds, never seed/publish-ready lessons. All TODOs need author review. */
export function getFoundationTemplate(category: FoundationCategory): { id: string; version: 1; source: string } {
  if (!foundationCategories.includes(category)) throw new Error('Unknown Foundation category');
  const id = `foundation-${category}`;
  const activities = (['reading', 'listening', 'speaking', 'writing'] as const).map((skill) => {
    const comprehension = skill === 'reading' || skill === 'listening';
    const block = skill === 'reading' ? 'read_decode' : skill === 'listening' ? 'listen_reason' : 'respond';
    return `[ACTIVITY ${skill}-practice]
learning_block: ${block}
activity_type: ${skill}
response_type: ${comprehension ? 'multiple_choice' : skill === 'speaking' ? 'shadowing' : 'short_text'}
skills: ${skill}
objective_refs: foundation-target
content_refs: workplace-context
language_block_refs: target-phrase
${skill === 'listening' ? 'audio_ref: workplace-audio\n' : ''}${!comprehension ? 'prompt: TODO write the model response\nrubric: TODO define observable meaning and language criteria\n' : ''}
QUESTION: TODO write a contextual task for ${skill}
${comprehension ? `
OPTIONS:
A. TODO correct response
B. TODO plausible misunderstanding

ANSWER: A

EXPLANATION: TODO explain the reasoning and why the distractor is wrong

EVIDENCE: ${skill === 'listening' ? 'workplace-audio' : 'workplace-context'}:1
` : ''}[/ACTIVITY]`;
  }).join('\n\n');
  return { id, version: 1, source: `FORMAT: WorkLingoLesson/1.1

[FOUNDATION]
category: ${category}
template_id: ${id}
template_version: 1
[/FOUNDATION]

[OBJECTIVE foundation-target]
statement: TODO ${guidance[category]}
skills: reading | listening | speaking | writing
required: true
[/OBJECTIVE]

[LESSON]
slug: ${id}-draft
title: TODO author a ${category} lesson
level: foundation
duration_minutes: 60
objective: TODO ${guidance[category]}
[/LESSON]

[WORD_BANK workplace-phrases]
title: TODO topic
[[LANGUAGE_BLOCK target-phrase]]
expression: TODO contextual phrase
meaning_vi: TODO nghĩa trong ngữ cảnh
pronunciation: TODO pronunciation
grammar_pattern: TODO useful pattern
example: TODO workplace example
[[/LANGUAGE_BLOCK]]
[/WORD_BANK]

[CONTENT workplace-context]
type: email
text:
<<<
TODO write the complete workplace situation.
>>>
[/CONTENT]

[AUDIO_SCRIPT workplace-audio]
speaker: colleague
script:
<<<
An (nam): TODO introduce a workplace situation.
Lan (nữ): TODO respond with a related need or question.
An: TODO continue the conversation, not isolated words.
>>>
[/AUDIO_SCRIPT]

${activities}
` };
}
