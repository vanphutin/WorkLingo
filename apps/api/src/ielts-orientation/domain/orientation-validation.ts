import {
  orientationContentSchema,
  type OrientationContent,
  type OrientationValidationResult,
} from '@worklingo/contracts';

export type OrientationValidationIssue = OrientationValidationResult['issues'][number];

export function validateOrientationContent(
  content: unknown,
  ownedAssetIds: ReadonlySet<string>,
): OrientationValidationIssue[] {
  const parsed = orientationContentSchema.safeParse(content);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: 'INVALID_CONTENT',
      path: issue.path.join('.') || 'content',
      message: issue.message,
    }));
  }

  const issues: OrientationValidationIssue[] = [];
  for (const [index, slide] of parsed.data.slides.entries()) {
    for (const field of ['imageAssetId', 'audioAssetId'] as const) {
      const assetId = slide[field];
      if (assetId !== null && !ownedAssetIds.has(assetId)) {
        issues.push({
          code: 'MEDIA_NOT_OWNED',
          path: `slides.${index}.${field}`,
          message: 'Referenced media must belong to this IELTS orientation.',
        });
      }
    }
  }
  return issues;
}

export function requireOrientationContent(content: unknown): OrientationContent {
  return orientationContentSchema.parse(content);
}
