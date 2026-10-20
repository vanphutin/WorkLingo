import { intermediateTopicJsonSchema, type IntermediateTopicJson } from '@worklingo/contracts';
import type { IntermediateLessonDraft } from './lesson-model';
type TopicJson = IntermediateTopicJson;
function toDraft(value: TopicJson): IntermediateLessonDraft {
  return { ...value, dialogue: value.readingText, durationMinutes: 60 };
}
export const topicJsonSchema = intermediateTopicJsonSchema;
export function topicJsonToDraft(value: unknown): IntermediateLessonDraft {
  return toDraft(topicJsonSchema.parse(value));
}
export function topicDraftToJson(draft: IntermediateLessonDraft): TopicJson {
  return {
    format: 'WorkLingoIntermediateTopic/1.0', slug: draft.slug, title: draft.title, level: draft.level,
    objective: draft.objective, readingText: draft.readingText, speaker: draft.speaker, activatePrompt: draft.activatePrompt,
    ...(draft.spokenText !== undefined ? { spokenText: draft.spokenText } : {}),
    ...(draft.speechReview !== undefined ? { speechReview: draft.speechReview } : {}),
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
