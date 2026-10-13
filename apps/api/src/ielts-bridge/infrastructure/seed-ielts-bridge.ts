import { createHash } from 'node:crypto';

import {
  ieltsBridgeModuleContentSchema,
  type IeltsBridgeModuleContent,
  type IeltsBridgeStageType,
  type IeltsBridgeTask,
} from '@worklingo/contracts';

type Stage = IeltsBridgeModuleContent['stages'][number];

interface ModuleSeedConfig {
  readonly title: string;
  readonly description: string;
  readonly skill: IeltsBridgeModuleContent['skill'];
  readonly questionType: IeltsBridgeModuleContent['questionType'];
  readonly purpose: string;
  readonly evidenceRule: string;
  readonly prompt: string;
  readonly options: readonly [string, string, ...string[]];
  readonly answerIndex: number;
  readonly independentPrompt: string;
  readonly modelAnswer: string;
}

const feedback = (evidenceRule: string) => ({
  correct: `Correct. ${evidenceRule}`,
  incorrect: `Recheck the complete evidence. ${evidenceRule}`,
});

function makeTask(config: ModuleSeedConfig, type: IeltsBridgeStageType): IeltsBridgeTask {
  if (['introduction', 'assessment_purpose', 'guided_model', 'feedback', 'review'].includes(type)) {
    return { kind: 'instruction' };
  }
  if (type === 'independent_practice') {
    if (config.skill === 'speaking') {
      return { kind: 'spoken_response', prompt: config.independentPrompt, preparationSeconds: 20, responseSeconds: 60,
        rubric: { criteria: ['Answer directly', 'Develop one relevant detail', 'Use clear connected speech'], modelAnswer: config.modelAnswer } };
    }
    return { kind: 'short_text', prompt: config.independentPrompt, minWords: config.skill === 'writing' ? 40 : 8,
      rubric: { criteria: ['Use the complete evidence', 'Explain the reasoning'], modelAnswer: config.modelAnswer } };
  }
  if (type === 'timed_practice' && config.skill === 'writing') {
    return { kind: 'short_text', prompt: config.independentPrompt, minWords: 50,
      rubric: { criteria: ['Identify the task precisely', 'Outline a relevant response', 'Check scope and purpose'], modelAnswer: config.modelAnswer } };
  }
  if (type === 'timed_practice' && config.skill === 'speaking') {
    return { kind: 'spoken_response', prompt: config.independentPrompt, preparationSeconds: 15, responseSeconds: 60,
      rubric: { criteria: ['Respond without memorised filler', 'Develop the answer', 'Remain intelligible'], modelAnswer: config.modelAnswer } };
  }
  return { kind: 'single_choice', prompt: config.prompt, options: [...config.options], answerIndex: config.answerIndex };
}

function makeStages(config: ModuleSeedConfig): Stage[] {
  const titles: Record<IeltsBridgeStageType, string> = {
    introduction: 'Meet the question type', assessment_purpose: 'What IELTS is measuring',
    analysed_example: 'Analyse one example', guided_model: 'Follow the reasoning model',
    easy_practice: 'Supported practice', increased_practice: 'Stronger distractors',
    independent_practice: 'Explain your own reasoning', timed_practice: 'Try it with a timer',
    feedback: 'Use feedback as evidence', review: 'Transfer the strategy',
  };
  const types: IeltsBridgeStageType[] = [
    'introduction', 'assessment_purpose', 'analysed_example', 'guided_model', 'easy_practice',
    'increased_practice', 'independent_practice', 'timed_practice', 'feedback', 'review',
  ];
  return types.map((type) => ({
    slug: type.replaceAll('_', '-'), type, title: titles[type],
    instruction: type === 'assessment_purpose' ? config.purpose
      : type === 'review' ? `Apply this rule in a new context: ${config.evidenceRule}`
        : `${config.description} ${config.evidenceRule}`,
    strategySteps: type === 'introduction' ? ['Understand the task before looking for an answer.']
      : ['Read or listen for complete meaning.', 'Check grammar, scope and purpose.', 'Explain why alternatives fail.'],
    timeLimitSeconds: type === 'timed_practice' ? 120 : null,
    task: makeTask(config, type),
    feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
      ? feedback(config.evidenceRule) : null,
  }));
}

const configs: ModuleSeedConfig[] = [
  {
    title: 'Listening: Form Completion', description: 'Predict the answer type, then verify the whole spoken message.',
    skill: 'listening', questionType: 'listening_form_completion',
    purpose: 'Form completion measures whether you can follow practical details and write an answer that fits both meaning and grammar.',
    evidenceRule: 'A similar-sounding word is not enough; the selected detail must fit the form label and the speaker’s final meaning.',
    prompt: 'The form asks for “preferred appointment day”. The speaker says, “Tuesday is difficult, so Thursday would be best.” Which answer is supported?',
    options: ['Tuesday', 'Thursday', 'Difficult'], answerIndex: 1,
    independentPrompt: 'Explain which clues identify the answer type and final appointment day.',
    modelAnswer: 'The label requires a day. Tuesday is rejected, and “would be best” confirms Thursday as the final preference.',
  },
  {
    title: 'Reading: True, False or Not Given', description: 'Separate agreement, contradiction and missing information.',
    skill: 'reading', questionType: 'reading_true_false_not_given',
    purpose: 'This task measures precise comparison between a statement and the writer’s actual claim.',
    evidenceRule: 'TRUE agrees, FALSE is contradicted, and NOT GIVEN means the passage does not provide enough evidence.',
    prompt: 'Passage: “The office trialled flexible Fridays for three months.” Statement: “Flexible Fridays became permanent.”',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'], answerIndex: 2,
    independentPrompt: 'Explain why the statement cannot be labelled TRUE or FALSE from the sentence alone.',
    modelAnswer: 'The passage confirms a trial but gives no decision after the trial, so permanence is not stated or contradicted.',
  },
  {
    title: 'Writing: Task Analysis', description: 'Identify purpose, audience, scope and required response before drafting.',
    skill: 'writing', questionType: 'writing_task_analysis',
    purpose: 'Task analysis measures whether your response addresses every instruction with relevant ideas and an appropriate form.',
    evidenceRule: 'A fluent response can still fail if it answers a different question or ignores part of the task.',
    prompt: 'A prompt asks for causes and solutions. Which plan fully covers the task?',
    options: ['Describe one cause only', 'Compare two unrelated opinions', 'Explain causes and propose supported solutions'], answerIndex: 2,
    independentPrompt: 'Analyse a causes-and-solutions prompt and write a concise response plan.',
    modelAnswer: 'Define the issue, group the main causes, then pair realistic solutions with those causes and support each paragraph.',
  },
  {
    title: 'Speaking: Part 1', description: 'Give direct, natural answers and develop them with one useful detail.',
    skill: 'speaking', questionType: 'speaking_part_1',
    purpose: 'Part 1 measures your ability to answer familiar questions clearly and naturally without memorised speeches.',
    evidenceRule: 'Answer the exact question first, then add a reason, example or contrast that remains relevant.',
    prompt: 'Question: “Do you prefer working alone or with a team?” Which opening is most direct?',
    options: ['There are many kinds of companies.', 'I usually prefer a small team because we can share ideas quickly.', 'Work is important in modern society.'], answerIndex: 1,
    independentPrompt: 'Do you prefer starting work early or later in the day? Give a direct answer and develop it.',
    modelAnswer: 'I prefer starting early because I can focus before messages begin. For example, I usually finish my hardest task before nine.',
  },
];

export const IELTS_BRIDGE_SEEDS = configs.map((config) => ieltsBridgeModuleContentSchema.parse({
  title: config.title, description: config.description, skill: config.skill,
  questionType: config.questionType, required: true, stages: makeStages(config),
}));

interface BridgeSeedTransaction {
  ieltsBridgeModule: {
    upsert(input: { where: { slug: string }; update: Record<string, never>; create: { slug: string; draftContent: IeltsBridgeModuleContent } }): Promise<{ id: string; status: string; currentPublishedVersionId: string | null }>;
    update(input: { where: { id: string }; data: { currentPublishedVersionId: string; status: 'PUBLISHED' } }): Promise<unknown>;
  };
  ieltsBridgeModuleVersion: {
    findUnique(input: { where: { moduleId_version: { moduleId: string; version: number } } }): Promise<{ id: string } | null>;
    create(input: { data: { moduleId: string; version: number; title: string; skill: string; questionType: string; required: boolean; sourceHash: string; content: IeltsBridgeModuleContent } }): Promise<{ id: string }>;
  };
}

interface BridgeSeedDatabase {
  $transaction<T>(work: (transaction: BridgeSeedTransaction) => Promise<T>): Promise<T>;
}

export async function seedIeltsBridge(database: BridgeSeedDatabase): Promise<void> {
  for (const content of IELTS_BRIDGE_SEEDS) {
    await database.$transaction(async (transaction) => {
      const slug = content.questionType.replaceAll('_', '-');
      const module = await transaction.ieltsBridgeModule.upsert({
        where: { slug }, update: {}, create: { slug, draftContent: content },
      });
      if (module.currentPublishedVersionId !== null || module.status === 'ARCHIVED') return;
      const existing = await transaction.ieltsBridgeModuleVersion.findUnique({
        where: { moduleId_version: { moduleId: module.id, version: 1 } },
      });
      const version = existing ?? await transaction.ieltsBridgeModuleVersion.create({ data: {
        moduleId: module.id, version: 1, title: content.title, skill: content.skill.toUpperCase(),
        questionType: content.questionType, required: content.required,
        sourceHash: createHash('sha256').update(JSON.stringify(content)).digest('hex'), content,
      } });
      await transaction.ieltsBridgeModule.update({
        where: { id: module.id }, data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' },
      });
    });
  }
}
