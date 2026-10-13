import { canonicalLessonSource } from './content-authoring.fixture.js';

export const foundationLessonSource = canonicalLessonSource
  .replace('WorkLingoLesson/1.0', 'WorkLingoLesson/1.1')
  .replace('[LESSON]', `[FOUNDATION]
category: grammar
template_id: foundation-grammar
template_version: 1
[/FOUNDATION]

[OBJECTIVE explain-complaint]
statement: Hiểu lý do khiếu nại và phản hồi đúng ngữ cảnh.
skills: reading | listening | speaking | writing
required: true
[/OBJECTIVE]

[LESSON]`)
  .replace(/(\[ACTIVITY [^\]]+\])/g, '$1\nobjective_refs: explain-complaint')
  .replace('skills: writing\n', 'skills: writing\ncontent_refs: complaint-email\nprompt: We sincerely apologize for the delayed delivery.\nrubric: Explain the delay and use apologize for correctly.\n')
  .replace('skills: listening\n', 'skills: listening\ncontent_refs: complaint-email\n')
  .replace('The customer asks to speak with a manager regarding a delayed order.', 'The customer asks to speak with a manager regarding a delayed order.\n\nEVIDENCE: complaint-call:1')
  .replace('skills: speaking\n', 'skills: speaking\ncontent_refs: complaint-email\nprompt: We sincerely apologize for the delay and will resolve the issue immediately.\nrubric: Pronounce apologize clearly and preserve the meaning.\n');
