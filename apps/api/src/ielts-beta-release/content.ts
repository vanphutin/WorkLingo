import { createHash } from 'node:crypto';
import { ieltsMockContentSchema, type IeltsMockContent } from '@worklingo/contracts';
import { listening, type EvidenceItem } from './original-listening.js';
import { reading } from './original-reading.js';
export { listening, reading };

export function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function stableUuid(value: string): string {
  const hex = hash(value);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Only 5/6/7/8 reference points are published averages. All other thresholds below are local approximations. */
export function conversion(skill: 'listening' | 'reading') {
  const anchors = [[0, 0], [10, 4], [skill === 'listening' ? 16 : 15, 5], [23, 6], [30, 7], [35, 8], [39, 9], [40, 9]] as const;
  return Array.from({ length: 41 }, (_, rawScore) => {
    const right = anchors.findIndex(([raw]) => raw >= rawScore);
    if (right === 0) return { rawScore, mockBand: 0 };
    const [low, bandLow] = anchors[right - 1]!; const [high, bandHigh] = anchors[right]!;
    return { rawScore, mockBand: Math.floor((bandLow + (rawScore - low) / (high - low) * (bandHigh - bandLow)) * 2) / 2 };
  });
}
const question = (item: EvidenceItem, order: number, section: string) => ({
  id: stableUuid(`local-beta-v1:${section}:${order}`), order, type: 'short_answer' as const,
  prompt: `${item[0]} Use no more than two words from the ${section === 'listening' ? 'recording' : 'passage'}.`,
  options: [], answerPolicy: { acceptedAnswers: [item[1], ...(item[3] ?? []).map(([answer]) => answer)], caseSensitive: false, maxWords: 2 },
  competencyTags: [`${section}_detail`, `${section}_evidence`],
  explanation: `Evidence: ${[item[2], ...(item[3] ?? []).map(([, evidence]) => evidence)].map((evidence) => `“${evidence}”`).join('; ')}`,
});

export function buildMock(audioIds: readonly string[] = []): IeltsMockContent {
  let readingOrder = 0;
  return ieltsMockContentSchema.parse({
    schemaVersion: 1, variant: 'ACADEMIC', title: 'Community and knowledge — original local Beta practice',
    disclosure: 'Local Beta practice, not an official IELTS result. Original fictional cases; offline US voices; shorter audio and short-answer tasks only. Raw scores are useful; bands use an uncalibrated local estimate. Writing/Speaking require teacher review.',
    allowedModes: ['LEARNING', 'PRACTICE'],
    listening: { durationMinutes: 30, conversion: conversion('listening'), parts: listening.map((part, index) => ({
      part: index + 1, audioAssetId: audioIds[index] ?? null,
      questions: part.items.map((item, offset) => question(item, index * 10 + offset + 1, 'listening')),
    })) },
    reading: { durationMinutes: 60, conversion: conversion('reading'), passages: reading.map((passage, index) => ({
      section: index + 1, title: passage.title, passage: passage.text,
      questions: passage.items.map((item) => question(item, ++readingOrder, 'reading')),
    })) },
    writing: { durationMinutes: 60, tasks: [
      { task: 1, title: 'Participation in community learning',
        prompt: 'The table below gives the percentage of adults attending three types of community learning in the fictional town of Merewick. The same survey method was used in each year. Summarise the main features and make relevant comparisons. Write at least 150 words. Suggested time: 20 minutes.\n\nActivity | 2018 | 2021 | 2024\nLanguage classes | 18% | 24% | 31%\nPractical repair | 6% | 14% | 23%\nLocal history | 22% | 20% | 17%\n\nAdults could attend more than one activity, so columns need not total 100%. Describe the data; do not invent causes.',
        minimumWords: 150, weight: 1, criteria: ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'], competencyTags: ['writing_task_1', 'data_comparison'] },
      { task: 2, title: 'Public access to practical learning',
        prompt: 'Some people believe local governments should provide free practical courses, such as home repair and digital skills, for all adults. Others think individuals and employers should pay for this training. Discuss both views and give your own opinion. Support your ideas with reasons and relevant examples. Write at least 250 words. Suggested time: 40 minutes.',
        minimumWords: 250, weight: 2, criteria: ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'], competencyTags: ['writing_task_2', 'balanced_argument'] },
    ] },
    speaking: { durationMinutes: { minimum: 11, maximum: 14 }, parts: [
      { part: 1, title: 'Familiar places and learning', prompts: ['What do you like about the area where you live?', 'How often do you visit a library or community centre?', 'Do you prefer learning a new skill alone or with someone else? Why?', 'What practical skill would you like to learn?'], preparationSeconds: 0, responseSeconds: 240, competencyTags: ['speaking_part_1', 'developed_response'] },
      { part: 2, title: 'A useful thing you learned', prompts: ['Describe a useful skill that someone taught you. Say what it was, who helped you, how you practised it, and explain why it has been useful. You have one minute to prepare and up to two minutes to speak.'], preparationSeconds: 60, responseSeconds: 120, competencyTags: ['speaking_part_2', 'narrative'] },
      { part: 3, title: 'Learning and public responsibility', prompts: ['Why might some adults find it difficult to join training courses?', 'How can communities decide which practical skills to teach?', 'Should online courses replace opportunities to learn face to face?', 'How should the success of publicly funded learning be evaluated?'], preparationSeconds: 0, responseSeconds: 300, competencyTags: ['speaking_part_3', 'reasoned_opinion'] },
    ] },
  });
}

/** Checks authored answer evidence, not just structural Zod validity. */
export function validateOriginalMock(value: unknown): void {
  const content = ieltsMockContentSchema.parse(value);
  if (!content.disclosure.includes('uncalibrated') || !content.disclosure.includes('teacher review') || content.allowedModes.includes('EXAM_SIMULATION')) throw new Error('Missing truthful Beta limitations.');
  const sections = [
    { actual: content.listening.parts, source: listening.map((part) => ({ text: part.turns.map((turn) => turn.text).join(' '), items: part.items })) },
    { actual: content.reading.passages, source: reading },
  ];
  const prompts = new Set<string>(); const ids = new Set<string>();
  for (const section of sections) for (const [partIndex, part] of section.actual.entries()) {
    const source = section.source[partIndex]!;
    const text = 'passage' in part ? part.passage : source.text;
    for (const [index, item] of part.questions.entries()) {
      const evidence = source.items[index];
      const reviewedAnswers = evidence ? [[evidence[1], evidence[2]], ...(evidence[3] ?? [])] : [];
      if (!evidence || !text.includes(evidence[2]) || !item.explanation.includes(evidence[2])
        || hash(item.answerPolicy.acceptedAnswers) !== hash(reviewedAnswers.map(([answer]) => answer))
        || reviewedAnswers.some(([answer, excerpt]) => !text.includes(excerpt!) || !item.explanation.includes(excerpt!)
          || !excerpt!.toLowerCase().includes(answer!.toLowerCase()) || answer!.split(/\s+/u).length > 2)
        || !item.prompt.startsWith(evidence[0]) || prompts.has(item.prompt) || ids.has(item.id)) throw new Error('Unsupported or duplicated objective question.');
      prompts.add(item.prompt); ids.add(item.id);
    }
  }
}
