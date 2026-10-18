import { describe, expect, it } from 'vitest';
import { summarizeIeltsStudyProgress } from './ielts-study-progress.service.js';

describe('IELTS study evidence summary', () => {
  it('does not turn pending or failed productive work into a score or mastered chunk', () => {
    const result = summarizeIeltsStudyProgress({ completedSessionCount: 1, dueReviewCount: 0, attempts: [
      { evaluationStatus: 'QUEUED', score: null, activity: { skills: ['speaking'], languageBlockReferences: ['ielts-one'] } },
      { evaluationStatus: 'EVALUATION_FAILED', score: null, activity: { skills: ['writing'], languageBlockReferences: ['ielts-one'] } },
    ], records: [{ languageBlockId: 'one', skill: 'reading', state: 'STABLE', lastEvidenceAt: new Date() }] });
    expect(result.masteredChunkCount).toBe(0);
    expect(result.practicedChunkCount).toBe(1);
    expect(result.pendingEvaluationCount).toBe(1);
    expect(result.skills.find(item => item.skill === 'speaking')?.score).toBeNull();
  });
  it('requires stable evaluated evidence in every skill for mastery', () => {
    expect(summarizeIeltsStudyProgress({ completedSessionCount: 0, dueReviewCount: 0, attempts: [], records: ['reading', 'listening', 'speaking', 'writing'].map(skill => ({ languageBlockId: 'one', skill, state: 'STABLE', lastEvidenceAt: new Date() })) }).masteredChunkCount).toBe(1);
  });
});
