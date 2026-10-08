import { createHash } from 'node:crypto';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import type { MasteryService } from '../../mastery/application/mastery.service.js';
import { describe, expect, it, vi } from 'vitest';

import { EvaluationService } from './evaluation.service.js';

const writingAttempt = {
  id: '00000000-0000-4000-8000-000000000001',
  learnerId: '00000000-0000-4000-8000-000000000002',
  rawResponse: { text: 'I will follow up with the customer before Friday.' },
  activity: {
    activityType: 'writing',
    contentReferences: ['email-1'],
    id: '00000000-0000-4000-8000-000000000003',
    languageBlockReferences: ['follow-up'],
    learningBlock: 'respond',
    order: 1,
    payload: {
      minWords: 5,
      prompt: 'Write a short workplace follow-up.',
      requiredPhrases: ['follow up'],
      sampleAnswer: 'I will follow up with the customer before Friday.',
    },
    skills: ['writing'],
    slug: 'write-follow-up',
  },
  evaluationResults: [],
  recording: null,
  session: {
    lessonVersionId: '00000000-0000-4000-8000-000000000004',
    mission: { level: { code: 'FOUNDATION_1' } },
  },
} as const;

const languageResult = {
  feedback: {
    correctedExample: 'I will follow up with the customer before Friday.',
    improvements: ['Add a clear next step.'],
    strengths: ['The response is direct.'],
    summary: 'The workplace response is clear.',
  },
  scores: {
    clarity: 0.8,
    meaningAndLogic: 0.8,
    targetLanguage: 0.9,
    taskCompletion: 0.8,
  },
} as const;

describe('EvaluationService', () => {
  it('persists one immutable result and records mastery in the same transaction', async () => {
    const createResult = vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000005', score: 0.825,
    });
    const transaction = {
      activityAttempt: { update: vi.fn().mockResolvedValue({}) },
      evaluationResult: { create: createResult, findUnique: vi.fn().mockResolvedValue(null) },
      recording: { update: vi.fn() },
    };
    const database = {
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(writingAttempt) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const language = { evaluate: vi.fn().mockResolvedValue(languageResult) } as unknown as LanguageEvaluationPort;
    const mastery = { recordAttemptEvaluation: vi.fn().mockResolvedValue([]) } as unknown as MasteryService;
    const service = new EvaluationService(database, language, mastery, { recordingRetentionDays: 7 });

    const result = await service.evaluateAttempt(writingAttempt.id);

    expect(language.evaluate).toHaveBeenCalledWith(expect.objectContaining({
      activityType: 'writing',
      learnerResponse: writingAttempt.rawResponse.text,
      levelCode: 'FOUNDATION_1',
      prompt: writingAttempt.activity.payload.prompt,
      referenceText: writingAttempt.activity.payload.sampleAnswer,
      requiredPhrases: writingAttempt.activity.payload.requiredPhrases,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
    }));
    expect(createResult).toHaveBeenCalledWith({ data: expect.objectContaining({
      attemptId: writingAttempt.id,
      lessonVersionId: writingAttempt.session.lessonVersionId,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
      score: expect.closeTo(0.825),
    }) });
    expect(mastery.recordAttemptEvaluation).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: writingAttempt.id,
      evaluationStatus: 'EVALUATED',
      languageBlockSlugs: ['follow-up'],
      score: expect.closeTo(0.825),
      tx: transaction,
    }));
    expect(result).toMatchObject({
      id: '00000000-0000-4000-8000-000000000005', score: expect.closeTo(0.825),
    });
  });

  it('returns an existing result without calling the provider or mastery again', async () => {
    const existing = { id: 'existing-result', score: 0.7 };
    const inputHash = createHash('sha256').update(JSON.stringify({
      activityId: writingAttempt.activity.id,
      learnerResponse: writingAttempt.rawResponse.text,
      lessonVersionId: writingAttempt.session.lessonVersionId,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
      speechMetrics: null,
    })).digest('hex');
    const database = {
      activityAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          ...writingAttempt,
          evaluationResults: [{ ...existing, inputHash, rubricVersion: '1' }],
        }),
      },
    } as unknown as PrismaService;
    const language = { evaluate: vi.fn() } as unknown as LanguageEvaluationPort;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new EvaluationService(database, language, mastery, { recordingRetentionDays: 7 });

    await expect(service.evaluateAttempt(writingAttempt.id)).resolves.toEqual(existing);
    expect(language.evaluate).not.toHaveBeenCalled();
    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
  });
});
