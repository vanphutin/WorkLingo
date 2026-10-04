import { z } from 'zod';

const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const skill = z.enum(['reading', 'listening', 'speaking', 'writing']);
const questionSchema = z.object({
  slug, prompt: text, options: z.array(text).min(2), answerIndex: z.number().int().nonnegative(),
  explanation: text, evidence: text,
}).refine((q) => q.answerIndex < q.options.length, 'Answer must reference an option');
const comprehensionPayload = z.object({ prompt: text, questions: z.array(questionSchema).min(1) });
const responsePayload = z.object({
  prompt: text, sampleAnswer: text, requiredPhrases: z.array(text).min(1), minWords: z.number().int().positive(),
});
const activityBase = {
  id: z.uuid(), slug, order: z.number().int().nonnegative(),
  learningBlock: z.enum(['activate', 'readDecode', 'listenReason', 'respond']),
  skills: z.array(skill).min(1), contentReferences: z.array(slug).min(1),
  languageBlockReferences: z.array(slug).min(1),
};
export const activitySchema = z.discriminatedUnion('activityType', [
  z.object({ ...activityBase, activityType: z.literal('reading'), payload: comprehensionPayload }),
  z.object({ ...activityBase, activityType: z.literal('listening'), payload: comprehensionPayload }),
  z.object({ ...activityBase, activityType: z.literal('speaking'), payload: responsePayload.extend({ mode: z.literal('shadowing') }) }),
  z.object({ ...activityBase, activityType: z.literal('writing'), payload: responsePayload }),
]);
export const lessonSnapshotSchema = z.object({
  title: text,
  contentBlocks: z.array(z.object({
    id: z.uuid(), slug, type: z.enum(['email', 'dialogue']), text,
    audio: z.object({ kind: z.literal('textPlaceholder'), notice: text }).optional(),
  })).min(1),
  wordBanks: z.array(z.object({
    id: z.uuid(), slug, name: text,
    languageBlocks: z.array(z.object({
      id: z.uuid(), slug, canonicalForm: text, meaning: text, pronunciation: text,
      collocations: z.array(text), grammarPattern: text, examples: z.array(text).min(1),
      commonErrors: z.array(text), cefrLevel: text, transferContexts: z.array(text).min(1),
    })).min(1),
  })).min(1),
  activities: z.array(activitySchema).min(1),
}).superRefine((lesson, context) => {
  const contents = new Set(lesson.contentBlocks.map((block) => block.slug));
  const languages = new Set(lesson.wordBanks.flatMap((bank) => bank.languageBlocks.map((block) => block.slug)));
  for (const [index, activity] of lesson.activities.entries()) {
    if (activity.contentReferences.some((ref) => !contents.has(ref)) ||
        activity.languageBlockReferences.some((ref) => !languages.has(ref))) {
      context.addIssue({ code: 'custom', path: ['activities', index], message: 'Unknown content or language block reference' });
    }
    if (!activity.skills.includes(activity.activityType)) {
      context.addIssue({ code: 'custom', path: ['activities', index, 'skills'], message: 'Activity must cover its own skill' });
    }
  }
});

export type CurriculumActivity = z.infer<typeof activitySchema>;
export type LessonSnapshot = z.infer<typeof lessonSnapshotSchema>;
// Application-only contract includes answer specifications; never expose it directly to learners.
export interface PublishedMission {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly objective: string;
  readonly levelCode: string;
  readonly lessonVersion: LessonSnapshot & { readonly id: string; readonly version: number };
}
