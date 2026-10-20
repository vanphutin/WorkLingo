import { describe, expect, it } from 'vitest';
import { INITIAL_IELTS_ACADEMIC_MOCK, ieltsMockContentSchema } from '@worklingo/contracts';
import { buildMock, listening, reading, validateOriginalMock } from './content.js';

describe('original local Beta content', () => {
  it('rejects the schema-valid synthetic fixture with unsupported answer keys', () => {
    expect(() => validateOriginalMock(INITIAL_IELTS_ACADEMIC_MOCK)).toThrow();
  });
  it('has forty evidenced keys in each objective section and an actual Task 1 dataset', () => {
    const mock = buildMock();
    expect(() => ieltsMockContentSchema.parse(mock)).not.toThrow();
    expect(() => validateOriginalMock(mock)).not.toThrow();
    expect(mock.reading.passages.flatMap((part) => part.questions)).toHaveLength(40);
    expect(mock.listening.parts.flatMap((part) => part.questions)).toHaveLength(40);
    expect(mock.writing.tasks[0]?.prompt).toContain('2018');
    expect(mock.writing.tasks[0]?.prompt).toContain('2024');
    expect(mock.allowedModes).not.toContain('EXAM_SIMULATION');
  });
  it('provides full original passages rather than repeated short fixture text', () => {
    expect(reading.reduce((sum, item) => sum + item.text.split(/\s+/u).length, 0)).toBeGreaterThanOrEqual(2150);
    for (const part of listening) expect(part.turns.map((turn) => turn.text).join(' ').split(/\s+/u).length).toBeGreaterThan(350);
  });
  it('rejects a key unsupported by its passage, duplicate questions, and erased beta disclosure', () => {
    const mock = structuredClone(buildMock());
    mock.reading.passages[0]!.questions[0]!.answerPolicy.acceptedAnswers = ['unsupported'];
    expect(() => validateOriginalMock(mock)).toThrow();
    const duplicate = structuredClone(buildMock());
    duplicate.listening.parts[0]!.questions[1] = { ...duplicate.listening.parts[0]!.questions[1]!, prompt: duplicate.listening.parts[0]!.questions[0]!.prompt };
    expect(() => validateOriginalMock(duplicate)).toThrow();
    expect(() => validateOriginalMock({ ...buildMock(), disclosure: 'This is an official verified result.' })).toThrow();
  });
});
