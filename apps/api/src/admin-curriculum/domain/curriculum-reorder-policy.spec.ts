import { describe, expect, it } from 'vitest';
import {
  CurriculumReorderPolicyError,
  validateCompleteOrder,
} from './curriculum-reorder-policy.js';

describe('CurriculumReorderPolicy', () => {
  const sibling1 = { id: '11111111-1111-4111-8111-111111111111', status: 'PUBLISHED' };
  const sibling2 = { id: '22222222-2222-4222-8222-222222222222', status: 'PUBLISHED' };
  const sibling3 = { id: '33333333-3333-4333-8333-333333333333', status: 'DRAFT' };
  const existingSiblings = [sibling1, sibling2, sibling3];

  it('validates and assigns contiguous 1-based order for complete sibling set', () => {
    const result = validateCompleteOrder({
      existingSiblings,
      orderedIds: [sibling3.id, sibling1.id, sibling2.id],
    });

    expect(result).toEqual([
      { id: sibling3.id, order: 1 },
      { id: sibling1.id, order: 2 },
      { id: sibling2.id, order: 3 },
    ]);
  });

  it('rejects empty ordered IDs payload', () => {
    expect(() =>
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [],
      }),
    ).toThrowError(CurriculumReorderPolicyError);

    try {
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [],
      });
    } catch (error) {
      expect((error as CurriculumReorderPolicyError).code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
    }
  });

  it('rejects duplicate IDs in reorder payload', () => {
    expect(() =>
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling1.id, sibling2.id],
      }),
    ).toThrowError(CurriculumReorderPolicyError);

    try {
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling1.id, sibling2.id],
      });
    } catch (error) {
      expect((error as CurriculumReorderPolicyError).code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
    }
  });

  it('rejects foreign ID not present in existing sibling set', () => {
    const foreignId = '99999999-9999-4999-8999-999999999999';

    expect(() =>
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling2.id, foreignId],
      }),
    ).toThrowError(CurriculumReorderPolicyError);

    try {
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling2.id, foreignId],
      });
    } catch (error) {
      expect((error as CurriculumReorderPolicyError).code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
    }
  });

  it('rejects payload that omits any active sibling', () => {
    expect(() =>
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling2.id], // missing sibling3
      }),
    ).toThrowError(CurriculumReorderPolicyError);

    try {
      validateCompleteOrder({
        existingSiblings,
        orderedIds: [sibling1.id, sibling2.id],
      });
    } catch (error) {
      expect((error as CurriculumReorderPolicyError).code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
    }
  });

  it('ignores archived siblings if they are not in the active ordering scope', () => {
    const archivedSibling = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'ARCHIVED' };
    const siblingsWithArchived = [...existingSiblings, archivedSibling];

    const result = validateCompleteOrder({
      existingSiblings: siblingsWithArchived,
      orderedIds: [sibling2.id, sibling1.id, sibling3.id],
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: sibling2.id, order: 1 });
    expect(result[1]).toEqual({ id: sibling1.id, order: 2 });
    expect(result[2]).toEqual({ id: sibling3.id, order: 3 });
  });
});
