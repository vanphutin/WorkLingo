import { describe, expect, it } from 'vitest';
import { scoreObjectiveAnswer } from '../ielts-mock/domain/ielts-mock-scoring.js';
import { buildMock, validateOriginalMock } from './content.js';

const variants = [
  ['listening', 6, 'a notebook'], ['listening', 8, 'library stop'], ['listening', 9, 'an adult'],
  ['listening', 11, 'east gate'], ['listening', 20, 'at reception'], ['listening', 21, 'the cafeteria'],
  ['listening', 27, 'a spreadsheet'], ['listening', 34, 'dark asphalt'], ['listening', 36, 'underground cables'], ['listening', 39, 'the night'],
  ['reading', 6, 'refundable deposit'], ['reading', 7, 'a waiver'], ['reading', 15, 'regional laboratory'],
  ['reading', 22, 'duplicate'], ['reading', 24, 'a woodland'], ['reading', 27, 'bulletin'], ['reading', 28, 'central repository'],
  ['reading', 30, 'a glossary'], ['reading', 31, 'an owner'], ['reading', 33, 'an archive'], ['reading', 35, 'checklist'], ['reading', 38, 'clinics'],
] as const;

describe('bounded review of all 80 objective keys', () => {
  const mock = buildMock();
  it.each(variants)('accepts reviewed %s Q%i variant %s with the real scorer', (section, order, answer) => {
    const questions = section === 'listening' ? mock.listening.parts.flatMap((part) => part.questions) : mock.reading.passages.flatMap((part) => part.questions);
    const item = questions.find((question) => question.order === order)!;
    expect(scoreObjectiveAnswer(answer, item.answerPolicy)).toBe(true);
    expect(scoreObjectiveAnswer('incorrect response', item.answerPolicy)).toBe(false);
    expect(scoreObjectiveAnswer(`extra words ${answer}`, item.answerPolicy)).toBe(false);
    expect(() => validateOriginalMock(mock)).not.toThrow();
  });
  it('does not globally erase meaningful modifiers or articles', () => {
    const questions = mock.listening.parts.flatMap((part) => part.questions);
    expect(scoreObjectiveAnswer('room', questions.find((item) => item.order === 4)!.answerPolicy)).toBe(false);
    expect(scoreObjectiveAnswer('gate', questions.find((item) => item.order === 11)!.answerPolicy)).toBe(false);
    expect(scoreObjectiveAnswer('cables underground', questions.find((item) => item.order === 36)!.answerPolicy)).toBe(false);
  });
});
