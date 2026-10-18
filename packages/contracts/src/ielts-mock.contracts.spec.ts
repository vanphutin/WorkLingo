import { describe, expect, it } from 'vitest';
import {
  INITIAL_IELTS_ACADEMIC_MOCK,
  ieltsMockContentSchema,
  ieltsMockReportSchema,
  newIeltsMockModeSchema,
  playbackLeaseSchema,
  ieltsMockRecordingSchema,
} from './ielts-mock.contracts.js';

describe('IELTS full mock contracts', () => {
  it('exposes owned playback and recording metadata without storage keys', () => {
    const lease = { id: crypto.randomUUID(), streamUrl: '/api/v1/me/owned-audio', expiresAt: '2026-10-15T12:01:00.000Z', remainingSeconds: 12 };
    expect(playbackLeaseSchema.parse(lease)).toEqual(lease);
    expect(playbackLeaseSchema.safeParse({ ...lease, remainingSeconds: -1 }).success).toBe(false);
    expect(ieltsMockRecordingSchema.safeParse({ id: crypto.randomUUID(), part: 1, durationSeconds: 12, createdAt: '2026-10-15T12:00:00.000Z', storageKey: 'private/key' }).success).toBe(false);
  });
  it('limits new modes while preserving legacy content', () => {
    expect(newIeltsMockModeSchema.safeParse('LEARNING').success).toBe(false);
    expect(newIeltsMockModeSchema.safeParse('PRACTICE').success).toBe(true);
    expect(ieltsMockContentSchema.parse(INITIAL_IELTS_ACADEMIC_MOCK).schemaVersion).toBe(1);
  });
  it('requires reviewed qualification evidence before declaring strict v2 content', () => {
    const base = { ...INITIAL_IELTS_ACADEMIC_MOCK, schemaVersion: 2, allowedModes: ['PRACTICE', 'EXAM_SIMULATION'] };
    expect(ieltsMockContentSchema.safeParse(base).success).toBe(false);
    const qualification = { reviewedBy: 'Content administrator', reviewedAt: '2026-10-15T00:00:00.000Z', evidenceRevision: 'academic-02-reviewed', qualifiedModes: ['PRACTICE'] };
    expect(ieltsMockContentSchema.safeParse({ ...base, qualification }).success).toBe(false);
    expect(ieltsMockContentSchema.safeParse({ ...base, qualification: { ...qualification, qualifiedModes: ['PRACTICE', 'EXAM_SIMULATION'] } }).success).toBe(true);
  });
  it('defines one complete Academic structure and keeps the result explicitly non-official', () => {
    const content = ieltsMockContentSchema.parse(INITIAL_IELTS_ACADEMIC_MOCK);
    expect(content.variant).toBe('ACADEMIC');
    expect(content.listening.parts).toHaveLength(4);
    expect(content.listening.parts.flatMap((part) => part.questions)).toHaveLength(40);
    expect(content.reading.passages).toHaveLength(3);
    expect(content.reading.passages.flatMap((passage) => passage.questions)).toHaveLength(40);
    expect(content.writing.tasks.map((task) => task.weight)).toEqual([1, 2]);
    expect(content.speaking.parts.map((part) => part.part)).toEqual([1, 2, 3]);
    expect(content.listening.conversion).toHaveLength(41);
    expect(content.reading.conversion).toHaveLength(41);
  });

  it('rejects incomplete sections and raw-score conversion gaps', () => {
    const missingQuestion = {
      ...INITIAL_IELTS_ACADEMIC_MOCK,
      listening: {
        ...INITIAL_IELTS_ACADEMIC_MOCK.listening,
        parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) =>
          index === 0 ? { ...part, questions: part.questions.slice(1) } : part,
        ),
      },
    };
    expect(ieltsMockContentSchema.safeParse(missingQuestion).success).toBe(false);
    expect(ieltsMockContentSchema.safeParse({
      ...INITIAL_IELTS_ACADEMIC_MOCK,
      reading: { ...INITIAL_IELTS_ACADEMIC_MOCK.reading, conversion: INITIAL_IELTS_ACADEMIC_MOCK.reading.conversion.slice(1) },
    }).success).toBe(false);
  });

  it('does not allow pending productive skills to masquerade as a completed mock estimate', () => {
    const report = {
      attemptId: crypto.randomUUID(), status: 'EVALUATION_PENDING', scoringPolicyVersion: 1, disclosure: 'Mock estimate — not an official IELTS result.',
      skills: {
        listening: { status: 'SCORED', rawScore: 30, mockBand: 7 },
        reading: { status: 'SCORED', rawScore: 30, mockBand: 7 },
        writing: { status: 'PENDING_EVALUATION', rawScore: null, mockBand: null },
        speaking: { status: 'ESTIMATED_FEEDBACK', rawScore: null, mockBand: null },
      },
      overallMockBand: null, strengths: [], gaps: [], nextActions: [], completedAt: null,
    };
    expect(ieltsMockReportSchema.parse(report).overallMockBand).toBeNull();
    expect(ieltsMockReportSchema.safeParse({ ...report, overallMockBand: 7 }).success).toBe(false);
  });
});
