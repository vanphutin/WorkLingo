import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsMockReviewService } from './ielts-mock-review.service.js';

const reviewerId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const input = { expectedRevision: 5, idempotencyKey: '33333333-3333-4333-8333-333333333333', writingTask1: [6, 6, 6, 6] as const, writingTask2: [7, 7, 7, 7] as const, speaking: [6.5, 6.5, 6.5, 6.5] as const, strengths: ['Clear workplace examples'], gaps: ['Develop lexical precision'], nextActions: ['Practise paraphrasing evidence'] };

async function setup(status = 'EVALUATION_PENDING') {
  const attempt = { id: attemptId, revision: 5, status, objectiveScore: { listening: { rawScore: 30, mockBand: 7 }, reading: { rawScore: 28, mockBand: 6.5 } }, mockTestVersion: { content: INITIAL_IELTS_ACADEMIC_MOCK } };
  const tx = { $executeRaw: vi.fn(), mutationReceipt: { findUnique: vi.fn(), create: vi.fn() }, ieltsMockAttempt: { findUnique: vi.fn().mockResolvedValue(attempt), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, ieltsMockReview: { create: vi.fn() }, auditLog: { create: vi.fn() } };
  const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)), ieltsMockAttempt: { findMany: vi.fn().mockResolvedValue([]) } };
  const module = await Test.createTestingModule({ providers: [IeltsMockReviewService, { provide: PrismaService, useValue: database }] }).compile();
  return { service: module.get(IeltsMockReviewService), tx };
}

describe('IeltsMockReviewService', () => {
  it('refuses a V2 speaking band without retained audio in all three parts', async () => {
    const { service, tx } = await setup();
    const base = await tx.ieltsMockAttempt.findUnique();
    tx.ieltsMockAttempt.findUnique.mockResolvedValue({ ...base, policyVersion: 'v2' });
    Object.assign(tx, { ieltsMockRecording: { findMany: vi.fn().mockResolvedValue([]) } });
    await expect(service.review(reviewerId, attemptId, input)).rejects.toMatchObject({ response: { code: 'IELTS_MOCK_SPEAKING_AUDIO_REQUIRED' } });
  });
  it('completes a report only after teacher-reviewed productive bands', async () => {
    const { service, tx } = await setup();
    const report = await service.review(reviewerId, attemptId, input);
    expect(report).toMatchObject({ status: 'COMPLETED', overallMockBand: 6.5, skills: { writing: { status: 'TEACHER_REVIEWED', mockBand: 6.5 }, speaking: { status: 'TEACHER_REVIEWED', mockBand: 6.5 } } });
    expect(tx.ieltsMockReview.create).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'REVIEW_IELTS_MOCK_ATTEMPT' }) }));
  });

  it('rejects review before the learner submits every section', async () => {
    const { service } = await setup('IN_PROGRESS');
    await expect(service.review(reviewerId, attemptId, input)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a bounded review page with an explicit next offset', async () => {
    const { service } = await setup();
    const findMany = (service as unknown as { database: { ieltsMockAttempt: { findMany: ReturnType<typeof vi.fn> } } }).database.ieltsMockAttempt.findMany;
    findMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({ id: String(index), submittedAt: new Date(index) })));

    const page = await service.listPending();

    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }], take: 51 }));
  });
});
