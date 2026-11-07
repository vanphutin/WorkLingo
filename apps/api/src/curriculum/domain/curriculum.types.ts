import { z } from 'zod';

import { approvedTopicSnapshotSchema, type MissionPurpose } from '@worklingo/contracts';
import { foundationCategories } from '@worklingo/content-format';

const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const skill = z.enum(['reading', 'listening', 'speaking', 'writing']);
// Matching is authored as one left-hand prompt and its candidate right-hand options per question.
const questionSchema = z.object({
  slug, prompt: text,
  responseType: z.enum(['multiple_choice', 'true_false', 'matching', 'fill_blank', 'short_answer', 'open_ended']).optional(),
  options: z.array(text).default([]), answerIndex: z.number().int().min(-1).default(-1),
  acceptedAnswers: z.array(text).min(1).max(100).optional(),
  answerCaseSensitive: z.boolean().optional(),
  semanticCriteria: text.optional(),
  explanation: text, evidence: text,
}).superRefine((q, context) => {
  const type = q.responseType ?? 'multiple_choice';
  if (type === 'multiple_choice' || type === 'true_false' || type === 'matching') {
    if (q.options.length < 2 || q.answerIndex < 0 || q.answerIndex >= q.options.length) context.addIssue({code:'custom',message:'Answer must reference an option'});
    if (type === 'true_false' && (q.options.length !== 2 || q.options[0]?.toLowerCase() !== 'true' || q.options[1]?.toLowerCase() !== 'false')) context.addIssue({code:'custom',message:'True/false requires True and False options in order'});
  } else if (type === 'open_ended') {
    if (!q.semanticCriteria?.trim()) context.addIssue({code:'custom',message:'Open-ended answers require semantic criteria'});
  } else if (!q.acceptedAnswers?.length && !q.semanticCriteria?.trim()) {
    context.addIssue({code:'custom',message:'Text answers require authored alternatives or semantic criteria'});
  }
});
const comprehensionPayload = z.object({ prompt: text, questions: z.array(questionSchema).min(1), audioText: text.optional() });
const responsePayload = z.object({
  audioText: text.optional(),
  rubricId: text.optional(), rubricVersion: text.optional(),
  prompt: text, sampleAnswer: text, requiredPhrases: z.array(text), minWords: z.number().int().positive(),
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
  z.object({ ...activityBase, activityType: z.literal('speaking'), payload: responsePayload.extend({ mode: z.enum(['shadowing', 'guided_response']) }) }),
  z.object({ ...activityBase, activityType: z.literal('writing'), payload: responsePayload }),
]).superRefine((activity, context) => {
  if (activity.activityType !== 'speaking' && activity.activityType !== 'writing') return;
  if (activity.payload.rubricId === undefined && activity.payload.requiredPhrases.length === 0) context.addIssue({code:'custom',message:'Legacy responses require target phrases'});
});
export const lessonSnapshotSchema = z.object({
  formatVersion: z.literal('WorkLingoLesson/1.2').optional(),
  instructions: z.array(z.object({slug, phase:z.enum(['readDecode','listenReason','respond']), order:z.number().int().nonnegative(), text})).optional(),
  intermediateTopic: approvedTopicSnapshotSchema.optional(),
  foundation: z.object({
    category: z.enum(foundationCategories), templateId: slug, templateVersion: z.literal(1),
    objectives: z.array(z.object({ slug, statement: text, skills: z.array(skill).min(1).max(4), required: z.boolean() })).min(1).max(50),
    activityObjectives: z.record(slug, z.array(slug).min(1).max(50)),
    responseRubrics: z.record(slug, text),
  }).optional(),
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
  const beginner = lesson.formatVersion === 'WorkLingoLesson/1.2';
  if (beginner && !lesson.foundation) context.addIssue({code:'custom',message:'Beginner requires Foundation metadata'});
  if (beginner && lesson.foundation) {
    const foundation=lesson.foundation;
    const objectiveMap=new Map(foundation.objectives.map(o=>[o.slug,o]));
    const activityIds=new Set(lesson.activities.map(a=>a.id));
    const activitySlugs=new Set(lesson.activities.map(a=>a.slug));
    if (activityIds.size!==lesson.activities.length || activitySlugs.size!==lesson.activities.length || objectiveMap.size!==foundation.objectives.length || !foundation.objectives.some(o=>o.required)) context.addIssue({code:'custom',message:'Ambiguous Beginner identity/evidence'});
    if (Object.keys(foundation.activityObjectives).some(slug=>!activitySlugs.has(slug))) context.addIssue({code:'custom',message:'Unknown Beginner activity mapping'});
    for (const activity of lesson.activities) {
      const refs=foundation.activityObjectives[activity.slug];
      if (!refs?.length || new Set(refs).size!==refs.length || refs.some(ref=>!objectiveMap.has(ref)) || !refs.some(ref=>objectiveMap.get(ref)?.skills.includes(activity.activityType))) context.addIssue({code:'custom',message:'Missing or invalid Beginner objective mapping'});
    }
    for (const objective of foundation.objectives.filter(o=>o.required)) for (const skill of objective.skills) {
      if (!lesson.activities.some(a=>a.activityType===skill && foundation.activityObjectives[a.slug]?.includes(objective.slug))) context.addIssue({code:'custom',message:'Unassessed Beginner objective skill'});
    }
  }
  if (!beginner && lesson.instructions !== undefined) context.addIssue({code:'custom',message:'Instructions require Beginner format'});
  for (const activity of lesson.activities) {
    if (activity.activityType !== 'speaking' && activity.activityType !== 'writing') continue;
    if (beginner) {
      const expected = activity.activityType === 'speaking' ? 'beginner-guided-speaking' : 'beginner-short-writing';
      if (activity.payload.rubricId !== expected || activity.payload.rubricVersion !== '1' || (activity.activityType === 'speaking' && activity.payload.mode !== 'guided_response')) context.addIssue({code:'custom',message:'Unsupported Beginner response rubric/mode'});
    } else if (activity.payload.rubricId !== undefined || activity.payload.rubricVersion !== undefined || (activity.activityType === 'speaking' && activity.payload.mode !== 'shadowing')) context.addIssue({code:'custom',message:'Beginner response requires versioned snapshot'});
  }
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
  readonly purpose: MissionPurpose;
  readonly lessonVersion: LessonSnapshot & { readonly id: string; readonly version: number };
}
