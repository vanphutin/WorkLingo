import { createHash } from 'node:crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import type { VocabularySource } from '@prisma/client';
import type { VocabularyInventory, VocabularySourceRow } from '@worklingo/contracts';

export function vocabularyError(code: string, message: string): never { throw new UnprocessableEntityException({ code, message }); }
export function normalizeLexicalForm(value: string) { return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en'); }
export function contentHash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function checkSourceRights(source: Pick<VocabularySource, 'rightsStatus' | 'permissionReference' | 'allowedUses' | 'allowedFields'>, fields: string[] = ['FORM']) {
  if (source.rightsStatus !== 'APPROVED' || !source.permissionReference?.trim() || !['EXTRACT', 'STORE'].every(use => source.allowedUses.includes(use)) || !fields.every(field => source.allowedFields.includes(field))) vocabularyError('BLOCKED_BY_RIGHTS', 'This source lacks the required reuse authorization or content-field scope.');
}
export function validateInventory(inventory: VocabularyInventory, pageCount: number) {
  const pages = [...inventory.pages].sort((a, b) => a.pageIndex - b.pageIndex);
  if (pages.length !== pageCount || pages.some((page, index) => page.pageIndex !== index)) vocabularyError('VOCABULARY_INVENTORY_INVALID', 'Every PDF page must be accounted for exactly once.');
  const keys = pages.flatMap(page => page.detectedKeys);
  if (!keys.length || new Set(keys).size !== keys.length) vocabularyError('VOCABULARY_INVENTORY_INVALID', 'Source row identifiers must be nonempty and globally unique within the document.');
  return keys;
}
export function validateSourceRow(row: VocabularySourceRow, inventory: VocabularyInventory, pageCount: number, cefrLevel: string) {
  if (row.cefrLevel !== cefrLevel || row.pageIndex >= pageCount || !row.locations.some(location => location.pageIndex === row.pageIndex) || row.locations.some(location => location.pageIndex >= pageCount) || !inventory.pages.find(page => page.pageIndex === row.pageIndex)?.detectedKeys.includes(row.sourceEntryKey)) vocabularyError('VOCABULARY_ROW_INVALID', 'Source level, location or row identifier does not match the independently enumerated inventory.');
  if (row.sourceEntryKey !== `${row.topicInstanceKey}:${row.rowOrdinal}`) vocabularyError('VOCABULARY_ROW_INVALID', 'Source identity must include its topic instance and row ordinal.');
}
