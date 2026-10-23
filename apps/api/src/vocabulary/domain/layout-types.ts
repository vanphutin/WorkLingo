import type { VocabularyManifest } from '@worklingo/contracts';

export interface LayoutWord {
  text: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

export type LayoutColumns = Record<'number' | 'word' | 'pos' | 'ipa' | 'definition', readonly [number, number]>;

export interface LayoutPage {
  pageIndex: number;
  width: number;
  height: number;
  words: readonly LayoutWord[];
  horizontalRules?: readonly { x0: number; x1: number; y: number }[];
}

/**
 * Coordinates are PDF points, page indices are zero-based, and column ranges
 * are ordered, non-overlapping fractions of page width. Raw text is untouched.
 * Only synthetic A1–C1 configurations are verified; native/OCR exceptions must
 * be resolved before an import can claim completeness.
 */
export interface LayoutDocument {
  documentSha256: string;
  pageCount: number;
  cefrLevel: VocabularyManifest['cefrLevel'];
  pages: readonly LayoutPage[];
  columns?: LayoutColumns;
  lineTolerance?: number;
}
