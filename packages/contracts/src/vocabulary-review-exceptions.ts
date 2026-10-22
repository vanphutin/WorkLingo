import { z } from 'zod';
import { vocabularyExceptionSchema, vocabularyLocationSchema } from './vocabulary-library.contracts.ts';

// Persisted Prisma locations are JSON; validate that boundary before interpreting geometry.
type ExceptionRow = { sourceEntryKey: string; normalizedPos: string; warnings: readonly string[]; locations: unknown };

export const vocabularyExceptionResolutionSchema = vocabularyExceptionSchema.extend({
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/u),
  reason: z.string().trim().min(10).max(2000),
}).strict();

/** Only a located, uniquely identified POS interpretation can be resolved by row review. */
export function reviewableVocabularyExceptionKey(
  exception: z.infer<typeof vocabularyExceptionSchema>,
  rows: readonly ExceptionRow[],
): string | undefined {
  return vocabularyExceptionRowResolver(rows)(exception);
}

/** Index once for whole-manifest reconciliation rather than rescanning every row per exception. */
export function vocabularyExceptionRowResolver(rows: readonly ExceptionRow[]) {
  const locations = new Map<string, string | null>();
  for (const row of rows) {
    if (row.normalizedPos !== 'UNKNOWN' || !row.warnings.includes('UNKNOWN_POS')) continue;
    const parsed = vocabularyLocationSchema.array().min(1).max(50).safeParse(row.locations);
    if (!parsed.success) continue;
    for (const location of parsed.data) {
      const key = JSON.stringify([location.pageIndex, location.bbox]);
      if (!locations.has(key)) locations.set(key, row.sourceEntryKey);
      else if (locations.get(key) !== row.sourceEntryKey) locations.set(key, null);
    }
  }
  return (exception: z.infer<typeof vocabularyExceptionSchema>): string | undefined => exception.code === 'UNKNOWN_POS' && exception.location ? locations.get(JSON.stringify([exception.location.pageIndex, exception.location.bbox])) ?? undefined : undefined;
}
