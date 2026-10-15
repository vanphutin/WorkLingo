import { describe, expect, it } from 'vitest';
import {
  INITIAL_IELTS_ACADEMIC_MOCK,
  ieltsMockContentSchema,
  ieltsMockReportSchema,
} from './ielts-mock.contracts.js';

describe('IELTS full mock contracts', () => {
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
