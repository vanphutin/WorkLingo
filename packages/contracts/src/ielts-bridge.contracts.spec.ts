import { describe, expect, it } from 'vitest';

import {
  adminIeltsBridgeModuleSchema,
  ieltsBridgeCatalogSchema,
  ieltsBridgeModuleContentSchema,
  ieltsBridgeQuestionTypeSchema,
  ieltsBridgeStageTypes,
  learnerIeltsBridgeModuleSchema,
} from './ielts-bridge.contracts.ts';

const stages = ieltsBridgeStageTypes.map((type, index) => ({
  slug: type.replaceAll('_', '-'),
  type,
  title: `Stage ${index + 1}`,
  instruction: 'Use the strategy before answering.',
  strategySteps: ['Read the complete prompt.', 'Explain the evidence.'],
  timeLimitSeconds: type === 'timed_practice' ? 120 : null,
  task: ['analysed_example', 'easy_practice', 'increased_practice', 'timed_practice'].includes(type)
    ? { kind: 'single_choice' as const, prompt: 'Choose one.', options: ['A', 'B'], answerIndex: 1 }
    : type === 'independent_practice'
      ? { kind: 'short_text' as const, prompt: 'Explain the evidence.', minWords: 10, rubric: { criteria: ['Use complete evidence.'] } }
      : { kind: 'instruction' as const },
  feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
    ? { correct: 'Correct with evidence.', incorrect: 'Review the evidence.' } : null,
}));

const moduleContent = {
  title: 'True, False or Not Given bridge',
  description: 'Learn to separate contradiction from missing information.',
  skill: 'reading' as const,
  questionType: 'reading_true_false_not_given' as const,
  required: true,
  stages,
};

describe('IELTS Bridge contracts', () => {
  it('exposes the complete master-prompt taxonomy', () => {
    expect(ieltsBridgeQuestionTypeSchema.options).toHaveLength(31);
    expect(ieltsBridgeQuestionTypeSchema.options).toContain('listening_map_plan_labelling');
    expect(ieltsBridgeQuestionTypeSchema.options).toContain('reading_matching_headings');
    expect(ieltsBridgeQuestionTypeSchema.options).toContain('writing_task_2');
    expect(ieltsBridgeQuestionTypeSchema.options).toContain('speaking_part_2_cue_card');
  });

  it('accepts exactly one ordered ten-stage cycle with one valid timed stage', () => {
    expect(ieltsBridgeModuleContentSchema.parse(moduleContent).stages.map((stage) => stage.type)).toEqual(ieltsBridgeStageTypes);
  });

  it('rejects missing, reordered or incorrectly timed stages and cross-skill question types', () => {
    expect(ieltsBridgeModuleContentSchema.safeParse({ ...moduleContent, stages: stages.slice(0, 9) }).success).toBe(false);
    expect(ieltsBridgeModuleContentSchema.safeParse({ ...moduleContent, stages: [stages[1], stages[0], ...stages.slice(2)] }).success).toBe(false);
    expect(ieltsBridgeModuleContentSchema.safeParse({
      ...moduleContent,
      stages: stages.map((stage) => stage.type === 'easy_practice' ? { ...stage, timeLimitSeconds: 60 } : stage),
    }).success).toBe(false);
    expect(ieltsBridgeModuleContentSchema.safeParse({ ...moduleContent, questionType: 'listening_multiple_choice' }).success).toBe(false);
    expect(ieltsBridgeModuleContentSchema.safeParse({
      ...moduleContent,
      stages: stages.map((stage) => stage.type === 'easy_practice' ? { ...stage, task: { kind: 'instruction' }, feedback: null } : stage),
    }).success).toBe(false);
  });

  it('keeps answer keys and hidden rubrics out of learner modules', () => {
    expect(learnerIeltsBridgeModuleSchema.safeParse({
      id: crypto.randomUUID(),
      moduleId: crypto.randomUUID(),
      version: 1,
      title: moduleContent.title,
      description: moduleContent.description,
      skill: moduleContent.skill,
      questionType: moduleContent.questionType,
      stages: stages.map(({ task, feedback: _feedback, ...stage }) => ({
        ...stage,
        feedback: null,
        task: task.kind === 'single_choice'
          ? { kind: task.kind, prompt: task.prompt, options: task.options }
          : task.kind === 'short_text'
            ? { kind: task.kind, prompt: task.prompt, minWords: task.minWords }
          : task,
      })),
    }).success).toBe(true);

    expect(learnerIeltsBridgeModuleSchema.safeParse({
      id: crypto.randomUUID(), moduleId: crypto.randomUUID(), version: 1,
      title: moduleContent.title, description: moduleContent.description,
      skill: moduleContent.skill, questionType: moduleContent.questionType,
      stages,
    }).success).toBe(false);
  });

  it('defines the admin authoring envelope with immutable version history', () => {
    expect(adminIeltsBridgeModuleSchema.parse({
      id: crypto.randomUUID(), slug: moduleContent.questionType.replaceAll('_', '-'), status: 'DRAFT',
      draftRevision: 1, draft: moduleContent, currentPublishedVersion: null, versions: [],
      updatedAt: new Date().toISOString(),
    })).toMatchObject({ draftRevision: 1, status: 'DRAFT' });
  });

  it('keeps locked learner catalogs free of unpublished module content', () => {
    expect(ieltsBridgeCatalogSchema.parse({
      eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [],
    })).toEqual({ eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [] });
  });
});
