import { z } from 'zod';
import type { IntermediateLessonDraft } from './lesson-model';
import { serializeIntermediateTopicLesson } from './topic-lesson-model';

const text = z.string().max(100_000);
const question = z.strictObject({
  slug: text, prompt: text, options: z.array(text).min(2).max(10),
  answerIndex: z.number().int().nonnegative(), explanation: text, evidenceLine: z.number().int().positive(),
});
const jsonShape = z.strictObject({
  format: z.literal('WorkLingoIntermediateTopic/1.0'),
  slug: text, title: text.trim().min(1), level: text, objective: text,
  readingText: text.trim().min(1), speaker: text, activatePrompt: text,
  speakingPrompt: text, speakingModel: text, writingPrompt: text, writingModel: text,
  languageBlocks: z.array(z.strictObject({
    slug: text, expression: text, meaningVi: text, pronunciation: text, grammarPattern: text,
    example: text, commonError: text, collocations: z.array(text).max(100),
  })).min(1).max(100),
  readingQuestions: z.array(question).min(1).max(100), listeningQuestions: z.array(question).min(1).max(100),
});
type TopicJson = z.infer<typeof jsonShape>;
function toDraft(value: TopicJson): IntermediateLessonDraft {
  return { ...value, dialogue: value.readingText, durationMinutes: 60 };
}
export const topicJsonSchema = jsonShape.superRefine((value, context) => {
  const lines = value.readingText.replace(/\r\n?/gu, '\n').split('\n').length;
  for (const key of ['readingQuestions', 'listeningQuestions'] as const) {
    value[key].forEach((item, index) => {
      if (item.answerIndex >= item.options.length) context.addIssue({ code: 'custom', path: [key, index, 'answerIndex'], message: 'Answer index must refer to an option (starting at 0).' });
      if (item.evidenceLine > lines) context.addIssue({ code: 'custom', path: [key, index, 'evidenceLine'], message: 'Evidence line must exist in the source passage (starting at 1).' });
    });
  }
  try { serializeIntermediateTopicLesson(toDraft(value)); }
  catch (cause) { context.addIssue({ code: 'custom', message: cause instanceof Error ? cause.message : 'Unsupported lesson content.' }); }
});
export function topicJsonToDraft(value: unknown): IntermediateLessonDraft {
  return toDraft(topicJsonSchema.parse(value));
}
export function topicDraftToJson(draft: IntermediateLessonDraft): TopicJson {
  return {
    format: 'WorkLingoIntermediateTopic/1.0', slug: draft.slug, title: draft.title, level: draft.level,
    objective: draft.objective, readingText: draft.readingText, speaker: draft.speaker, activatePrompt: draft.activatePrompt,
    speakingPrompt: draft.speakingPrompt, speakingModel: draft.speakingModel,
    writingPrompt: draft.writingPrompt, writingModel: draft.writingModel,
    languageBlocks: draft.languageBlocks, readingQuestions: draft.readingQuestions, listeningQuestions: draft.listeningQuestions,
  };
}
export function createTopicJsonTemplate(): TopicJson {
  return {
    format: 'WorkLingoIntermediateTopic/1.0', slug: 'restaurant-reservation', title: 'A restaurant reservation', level: 'B1',
    objective: 'Understand a reservation and confirm the details politely.',
    readingText: 'An (nam): I would like to book a table for two at seven.\nNhi (nữ): Certainly. May I have your name?\nAn (nam): An Nguyen. Could we sit near the window?\nNhi (nữ): Of course. Your table will be ready at seven.',
    speaker: 'An (nam), Nhi (nữ)', activatePrompt: 'What details do you need when booking a restaurant table?',
    languageBlocks: [{ slug: 'book-a-table', expression: 'book a table', meaningVi: 'đặt bàn', pronunciation: '/bʊk ə ˈteɪbəl/',
      grammarPattern: 'I would like to + verb', example: 'I would like to book a table for two.',
      commonError: 'Use for two, rather than for two persons, in a casual reservation.', collocations: ['book a table for two', 'confirm a reservation'] }],
    readingQuestions: [{ slug: 'reservation-time', prompt: 'What time is the reservation?', options: ['At seven.', 'At eight.'], answerIndex: 0, explanation: 'An asks for a table at seven.', evidenceLine: 1 }],
    listeningQuestions: [{ slug: 'seating-request', prompt: 'Where would An like to sit?', options: ['Near the window.', 'Near the door.'], answerIndex: 0, explanation: 'An requests a table near the window.', evidenceLine: 3 }],
    speakingPrompt: 'Confirm the reservation using the details in the passage.', speakingModel: 'Your table for two will be ready at seven.',
    writingPrompt: 'Write a short confirmation of the booking and seating request.', writingModel: 'Dear An, your table for two near the window is booked for seven. We look forward to welcoming you.',
  };
}
