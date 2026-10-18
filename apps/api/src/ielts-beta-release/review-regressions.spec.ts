import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../common/database/prisma.service.js';
import { IELTS_BRIDGE_SEEDS } from '../ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { IeltsBridgeLearnerService } from '../ielts-bridge/application/ielts-bridge-learner.service.js';
import { IeltsIntegratedLearnerService } from '../ielts-integrated-practice/application/ielts-integrated-learner.service.js';
import { scoreObjectiveAnswer } from '../ielts-mock/domain/ielts-mock-scoring.js';
import { curateBridge } from './curation.js';
import { buildMock, validateOriginalMock } from './content.js';

const id = (n: number) => `${n}0000000-0000-4000-8000-000000000001`;
const now = new Date('2026-10-15T00:00:00Z');

describe('independent review regressions', () => {
  it('returns neutral scored-stage directions in real Bridge and Integrated learner payloads', async () => {
    const contents = IELTS_BRIDGE_SEEDS.map(curateBridge);
    for (const [index, content] of contents.entries()) {
      const moduleVersion = { id: id(index + 2), moduleId: id(index + 3), version: 1, title: content.title, content, status: 'PUBLISHED' };
      const progress = { id: id(1), learnerId: id(9), moduleId: moduleVersion.moduleId, moduleVersionId: moduleVersion.id,
        currentStageIndex: 7, revision: 1, stageResults: [], timedStageStartedAt: now, timedStageDeadlineAt: new Date(now.getTime() + 120000),
        completedAt: null, createdAt: now, updatedAt: now, moduleVersion };
      const db = { ieltsBridgeProgress: { findUnique: async () => progress } };
      const result = await new IeltsBridgeLearnerService(db as unknown as PrismaService).getSession(id(9), moduleVersion.moduleId);
      for (const stage of result.module.stages.filter((stage) => ['easy_practice', 'increased_practice', 'timed_practice'].includes(stage.type))) {
        const authored = content.stages.find((item) => item.slug === stage.slug)!;
        expect(stage.instruction).not.toBe(authored.feedback?.correct);
        expect(stage.feedback).toBeNull();
        expect(stage.task).not.toHaveProperty('answerIndex');
        expect(stage.task).not.toHaveProperty('rubric');
        if (stage.task.kind === 'single_choice') expect(stage.instruction).toBe('Read the supplied text and question. Choose one option, then submit your answer to receive feedback.');
      }
    }
    const blocks = contents.map((content, index) => ({ order: index + 1, skill: content.skill, targetMinutes: [15, 15, 20, 10][index],
      moduleVersionId: id(index + 2), questionType: content.questionType, mode: 'new_practice',
      moduleVersion: { content }, startedAt: index === 0 ? now : null, completedAt: null, result: null }));
    const session = { id: id(1), planSnapshot: { durationMinutes: 60, difficulty: 'foundation', profileVersionId: id(8),
      blocks: blocks.map(({ order, skill, targetMinutes, moduleVersionId, questionType, mode }) => ({ order, skill, targetMinutes, moduleVersionId, questionType, mode })) },
      currentBlockIndex: 0, revision: 1, startedAt: now, completedAt: null, blocks };
    const db = { ieltsIntegratedSession: { findFirst: async () => session } };
    const result = await new IeltsIntegratedLearnerService(db as unknown as PrismaService).get(id(9), id(1));
    for (const [index, block] of result.blocks.entries()) {
      const authored = contents[index]!.stages.find((stage) => stage.type === 'timed_practice')!;
      expect(block.instruction).not.toBe(authored.feedback?.correct);
      expect(block.task).not.toHaveProperty('answerIndex');
      expect(block.task).not.toHaveProperty('rubric');
      if (block.task.kind === 'single_choice') expect(block.instruction).toBe('Read the supplied text and question. Choose one option, then submit your answer to receive feedback.');
    }
  });

  it('scores both evidenced hide variants, rejects wrong or over-limit answers, and narrows the identification question', () => {
    const mock = buildMock();
    const hide = mock.listening.parts[1]!.questions[3]!;
    for (const answer of ['hide', 'wooden hide', ' WOODEN   HIDE ']) expect(scoreObjectiveAnswer(answer, hide.answerPolicy)).toBe(true);
    for (const answer of ['wooden', 'visitor centre', 'the wooden hide', 'wooden hide beside the pool']) expect(scoreObjectiveAnswer(answer, hide.answerPolicy)).toBe(false);
    const identification = mock.listening.parts[0]!.questions[6]!;
    expect(identification.prompt).toContain('general category');
    expect(scoreObjectiveAnswer('identification', identification.answerPolicy)).toBe(true);
    expect(scoreObjectiveAnswer('receipt', identification.answerPolicy)).toBe(false);
    expect(() => validateOriginalMock(mock)).not.toThrow();
  });

  it('requires all accepted variants to have reviewed source evidence and explanatory feedback', () => {
    const mock = structuredClone(buildMock());
    const hide = mock.listening.parts[1]!.questions[3]!;
    hide.answerPolicy.acceptedAnswers = ['wooden hide', 'hide'];
    expect(() => validateOriginalMock(mock)).not.toThrow();
    hide.answerPolicy.acceptedAnswers.push('visitor centre');
    expect(() => validateOriginalMock(mock)).toThrow();
    hide.answerPolicy.acceptedAnswers = ['wooden hide', 'hide'];
    mock.listening.parts[1]!.questions[3] = { ...hide, explanation: 'This answer is supported without an evidence excerpt.' };
    expect(() => validateOriginalMock(mock)).toThrow();
  });
});
