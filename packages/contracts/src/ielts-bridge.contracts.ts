import { z } from 'zod';

import { learningSkillSchema } from './learning-session.contracts.ts';

const slugSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const unique = <T>(values: readonly T[]) => new Set(values).size === values.length;

export const ieltsBridgeQuestionTypeSchema = z.enum([
  'listening_form_completion',
  'listening_note_completion',
  'listening_multiple_choice',
  'listening_matching',
  'listening_map_plan_labelling',
  'listening_sentence_completion',
  'reading_true_false_not_given',
  'reading_yes_no_not_given',
  'reading_matching_headings',
  'reading_matching_information',
  'reading_multiple_choice',
  'reading_summary_completion',
  'reading_sentence_completion',
  'reading_short_answer',
  'writing_task_analysis',
  'writing_brainstorming',
  'writing_paragraph_structure',
  'writing_thesis_statement',
  'writing_topic_sentences',
  'writing_coherence_cohesion',
  'writing_task_1',
  'writing_task_2',
  'writing_self_editing',
  'speaking_part_1',
  'speaking_part_2_cue_card',
  'speaking_part_3_discussion',
  'speaking_fluency',
  'speaking_idea_development',
  'speaking_pronunciation',
  'speaking_vocabulary_range',
  'speaking_grammar_range',
]);
export type IeltsBridgeQuestionType = z.infer<typeof ieltsBridgeQuestionTypeSchema>;

export const ieltsBridgeStageTypes = [
  'introduction',
  'assessment_purpose',
  'analysed_example',
  'guided_model',
  'easy_practice',
  'increased_practice',
  'independent_practice',
  'timed_practice',
  'feedback',
  'review',
] as const;
export const ieltsBridgeStageTypeSchema = z.enum(ieltsBridgeStageTypes);
export type IeltsBridgeStageType = z.infer<typeof ieltsBridgeStageTypeSchema>;

const instructionTaskSchema = z.object({ kind: z.literal('instruction') }).strict();
const singleChoiceTaskSchema = z.object({
  kind: z.literal('single_choice'),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(1000)).min(2).max(10).refine(unique, 'Options must be unique'),
  answerIndex: z.number().int().nonnegative(),
}).strict().superRefine((task, context) => {
  if (task.answerIndex >= task.options.length) context.addIssue({ code: 'custom', path: ['answerIndex'], message: 'Answer index is outside options' });
});
const multiChoiceTaskSchema = z.object({
  kind: z.literal('multi_choice'),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(1000)).min(2).max(12).refine(unique, 'Options must be unique'),
  answerIndexes: z.array(z.number().int().nonnegative()).min(1).max(12).refine(unique, 'Answer indexes must be unique'),
}).strict().superRefine((task, context) => {
  if (task.answerIndexes.some((index) => index >= task.options.length)) context.addIssue({ code: 'custom', path: ['answerIndexes'], message: 'Answer index is outside options' });
});
const responseRubricSchema = z.object({
  criteria: z.array(z.string().trim().min(1).max(500)).min(1).max(10).refine(unique, 'Rubric criteria must be unique'),
  modelAnswer: z.string().trim().min(1).max(10_000).optional(),
}).strict();
const shortTextTaskSchema = z.object({
  kind: z.literal('short_text'), prompt: z.string().trim().min(1).max(2000),
  minWords: z.number().int().min(1).max(1000), rubric: responseRubricSchema,
}).strict();
const spokenResponseTaskSchema = z.object({
  kind: z.literal('spoken_response'), prompt: z.string().trim().min(1).max(2000),
  preparationSeconds: z.number().int().min(0).max(120), responseSeconds: z.number().int().min(10).max(300),
  rubric: responseRubricSchema,
}).strict();
export const ieltsBridgeTaskSchema = z.union([
  instructionTaskSchema, singleChoiceTaskSchema, multiChoiceTaskSchema, shortTextTaskSchema, spokenResponseTaskSchema,
]);
export type IeltsBridgeTask = z.infer<typeof ieltsBridgeTaskSchema>;

const feedbackSchema = z.object({
  correct: z.string().trim().min(1).max(2000),
  incorrect: z.string().trim().min(1).max(2000),
}).strict();

export const ieltsBridgeStageSchema = z.object({
  slug: slugSchema,
  type: ieltsBridgeStageTypeSchema,
  title: z.string().trim().min(1).max(200),
  instruction: z.string().trim().min(1).max(10_000),
  strategySteps: z.array(z.string().trim().min(1).max(1000)).max(20).refine(unique, 'Strategy steps must be unique'),
  timeLimitSeconds: z.number().int().min(30).max(1800).nullable(),
  task: ieltsBridgeTaskSchema,
  feedback: feedbackSchema.nullable(),
}).strict().superRefine((stage, context) => {
  if ((stage.type === 'timed_practice') !== (stage.timeLimitSeconds !== null)) {
    context.addIssue({ code: 'custom', path: ['timeLimitSeconds'], message: 'Only timed practice must define a time limit' });
  }
});

const questionTypeSkill = (questionType: IeltsBridgeQuestionType) => questionType.split('_', 1)[0];

export const ieltsBridgeModuleContentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  skill: learningSkillSchema,
  questionType: ieltsBridgeQuestionTypeSchema,
  required: z.boolean(),
  stages: z.array(ieltsBridgeStageSchema).length(ieltsBridgeStageTypes.length).refine(
    (stages) => unique(stages.map((stage) => stage.slug)), 'Stage slugs must be unique',
  ),
}).strict().superRefine((content, context) => {
  if (questionTypeSkill(content.questionType) !== content.skill) {
    context.addIssue({ code: 'custom', path: ['questionType'], message: 'Question type must belong to the selected skill' });
  }
  for (const [index, expected] of ieltsBridgeStageTypes.entries()) {
    if (content.stages[index]?.type !== expected) context.addIssue({ code: 'custom', path: ['stages', index, 'type'], message: `Expected ${expected}` });
  }
});
export type IeltsBridgeModuleContent = z.infer<typeof ieltsBridgeModuleContentSchema>;

const learnerSingleChoiceTaskSchema = z.object({
  kind: z.literal('single_choice'), prompt: z.string(), options: z.array(z.string()).min(2).max(10),
}).strict();
const learnerMultiChoiceTaskSchema = z.object({
  kind: z.literal('multi_choice'), prompt: z.string(), options: z.array(z.string()).min(2).max(12),
}).strict();
const learnerShortTextTaskSchema = z.object({
  kind: z.literal('short_text'), prompt: z.string(), minWords: z.number().int().min(1).max(1000),
}).strict();
const learnerSpokenResponseTaskSchema = z.object({
  kind: z.literal('spoken_response'), prompt: z.string(), preparationSeconds: z.number().int().min(0).max(120),
  responseSeconds: z.number().int().min(10).max(300),
}).strict();
export const learnerIeltsBridgeTaskSchema = z.union([
  instructionTaskSchema, learnerSingleChoiceTaskSchema, learnerMultiChoiceTaskSchema,
  learnerShortTextTaskSchema, learnerSpokenResponseTaskSchema,
]);
export const learnerIeltsBridgeStageSchema = z.object({
  slug: slugSchema,
  type: ieltsBridgeStageTypeSchema,
  title: z.string(),
  instruction: z.string(),
  strategySteps: z.array(z.string()),
  timeLimitSeconds: z.number().int().min(30).max(1800).nullable(),
  task: learnerIeltsBridgeTaskSchema,
  feedback: z.null(),
}).strict();
export const learnerIeltsBridgeModuleSchema = z.object({
  id: z.uuid(), moduleId: z.uuid(), version: z.number().int().positive(),
  title: z.string(), description: z.string(), skill: learningSkillSchema,
  questionType: ieltsBridgeQuestionTypeSchema,
  stages: z.array(learnerIeltsBridgeStageSchema).length(ieltsBridgeStageTypes.length),
}).strict();
export type LearnerIeltsBridgeModuleDto = z.infer<typeof learnerIeltsBridgeModuleSchema>;

export const ieltsBridgeProgressSchema = z.object({
  moduleId: z.uuid(), moduleVersionId: z.uuid(), currentStageIndex: z.number().int().min(0).max(9),
  revision: z.number().int().positive(), startedAt: z.iso.datetime(), completedAt: z.iso.datetime().nullable(),
  timedStageStartedAt: z.iso.datetime().nullable(), stageResults: z.array(z.object({
    stageSlug: slugSchema, correct: z.boolean().nullable(), timedOut: z.boolean(), submittedAt: z.iso.datetime(),
  }).strict()).max(10),
}).strict();
export type IeltsBridgeProgressDto = z.infer<typeof ieltsBridgeProgressSchema>;

export const saveIeltsBridgeDraftSchema = z.object({
  expectedRevision: z.number().int().positive().nullable(), idempotencyKey: z.uuid(), content: ieltsBridgeModuleContentSchema,
}).strict();
export const ieltsBridgeCommandSchema = z.object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid() }).strict();
export const ieltsBridgeProgressUpdateSchema = z.object({
  expectedRevision: z.number().int().positive(), stageIndex: z.number().int().min(0).max(9),
  startTimer: z.boolean().optional(), answer: z.unknown().optional(), completeStage: z.boolean().optional(),
}).strict();

