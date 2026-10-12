export class CurriculumReorderPolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CurriculumReorderPolicyError';
  }
}

export interface OrderedSibling {
  id: string;
  order: number;
}

export interface ValidateCompleteOrderInput {
  orderedIds: readonly string[];
  existingSiblings: readonly { id: string; status?: string }[];
}

export function validateCompleteOrder(input: ValidateCompleteOrderInput): OrderedSibling[] {
  const { existingSiblings, orderedIds } = input;

  if (orderedIds.length === 0) {
    throw new CurriculumReorderPolicyError(
      'INVALID_CURRICULUM_RELATIONSHIP',
      'Reorder payload must not be empty',
    );
  }

  const uniqueIds = new Set(orderedIds);
  if (uniqueIds.size !== orderedIds.length) {
    throw new CurriculumReorderPolicyError(
      'INVALID_CURRICULUM_RELATIONSHIP',
      'Reorder payload contains duplicate IDs',
    );
  }

  const activeSiblings = existingSiblings.filter((s) => s.status !== 'ARCHIVED');
  const existingIdSet = new Set(existingSiblings.map((s) => s.id));

  for (const id of orderedIds) {
    if (!existingIdSet.has(id)) {
      throw new CurriculumReorderPolicyError(
        'INVALID_CURRICULUM_RELATIONSHIP',
        `Foreign ID ${id} is not part of this sibling set`,
      );
    }
  }

  for (const activeSibling of activeSiblings) {
    if (!uniqueIds.has(activeSibling.id)) {
      throw new CurriculumReorderPolicyError(
        'INVALID_CURRICULUM_RELATIONSHIP',
        `Reorder payload omits active sibling ${activeSibling.id}`,
      );
    }
  }

  return orderedIds.map((id, index) => ({
    id,
    order: index + 1,
  }));
}
