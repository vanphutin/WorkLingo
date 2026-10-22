import { z } from 'zod';
import { vocabularyQuerySchema, vocabularySourceInputSchema, vocabularyRightsInputSchema, vocabularyManifestSchema, vocabularyDocumentInputSchema, vocabularyBatchInputSchema, vocabularyStageSchema, vocabularyReviewSchema, vocabularyPublishSchema, vocabularyRollbackSchema, vocabularyCollectionInputSchema, vocabularyCollectionMembersSchema, vocabularyProgramInputSchema, vocabularyBindingInputSchema } from '@worklingo/contracts';
import { ieltsRequest } from './ielts-request';
import { ApiError } from './api-client';
import { vocabularyExceptionRowResolver } from '@worklingo/contracts';
import { sourceSchema, entrySchema, entryDetailSchema, provenanceSchema, batchSchema, batchListSchema, batchDetailSchema, collectionSchema, versionSchema, versionSummarySchema, memberSchema, assignmentSchema, bindingSchema, paginated, optionsSchema } from '../../features/admin-vocabulary/response-schemas';

const root = '/admin/vocabulary';
const identity = z.object({ id: z.uuid() });
const pathId = (id: string) => z.uuid().parse(id);
function query(input: unknown = {}) {
  const parsed = vocabularyQuerySchema.parse(input);
  return new URLSearchParams(Object.entries(parsed).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)])).toString();
}
function blocked(): never { throw new ApiError({ code: 'BLOCKED_BY_RIGHTS', message: 'BLOCKED_BY_RIGHTS', status: 422 }); }

/** Local preflight only: no content is sent or persisted. Server rechecks rights at every write. */
export function dryRunManifest(raw: unknown, rawSource: unknown) {
  const source = sourceSchema.parse(rawSource);
  if (source.rightsStatus !== 'APPROVED' || !source.permissionReference?.trim() || !['EXTRACT', 'STORE'].every(use => source.allowedUses.includes(use)) || !source.allowedFields.includes('FORM')) blocked();
  const manifest = vocabularyManifestSchema.parse(raw);
  const pages = manifest.inventory.pages;
  const keys = pages.flatMap(page => page.detectedKeys);
  const exceptionRowKey = vocabularyExceptionRowResolver(manifest.rows);
  if (!manifest.rows.length || pages.length !== manifest.pageCount || new Set(pages.map(page => page.pageIndex)).size !== pages.length || pages.some(page => page.pageIndex >= manifest.pageCount || page.exceptions.some(exception => !exceptionRowKey(exception))) || new Set(keys).size !== keys.length || keys.length !== manifest.rows.length || new Set(manifest.rows.map(row => row.sourceEntryKey)).size !== keys.length) throw new Error('VOCABULARY_INCOMPLETE');
  const expected = new Set(keys);
  for (const row of manifest.rows) {
    if (row.sourceEntryKey !== `${row.topicInstanceKey}:${row.rowOrdinal}` || !expected.has(row.sourceEntryKey) || !pages.find(page => page.pageIndex === row.pageIndex)?.detectedKeys.includes(row.sourceEntryKey) || row.cefrLevel !== manifest.cefrLevel || !row.locations.some(location => location.pageIndex === row.pageIndex) || row.locations.some(location => location.pageIndex >= manifest.pageCount)) throw new Error('VOCABULARY_INCOMPLETE');
    if (row.permittedDefinition !== null && !source.allowedFields.includes('DEFINITION') || row.pronunciation !== null && !source.allowedFields.includes('PRONUNCIATION')) blocked();
  }
  return { manifest, rowCount: manifest.rows.length, pageCount: manifest.pageCount, reviewRequired: manifest.rows.filter(row => row.warnings.length || row.normalizedPos === 'UNKNOWN' || row.extractionConfidence < 1).length };
}

export class VocabularyLibraryClient {
  async entries(input: unknown = {}) { return ieltsRequest(`${root}/entries?${query(input)}`, paginated(entrySchema)); }
  entry(id: string) { return ieltsRequest(`${root}/entries/${pathId(id)}`, entryDetailSchema); }
  async provenance(id: string, input: unknown = {}) { return ieltsRequest(`${root}/entries/${pathId(id)}/provenance?${query(input)}`, paginated(provenanceSchema)); }
  sources(input: unknown = {}) { return ieltsRequest(`${root}/sources?${query(input)}`, paginated(sourceSchema)); }
  batches(input: unknown = {}) { return ieltsRequest(`${root}/batches?${query(input)}`, paginated(batchListSchema)); }
  batch(id: string, input: unknown = {}) { return ieltsRequest(`${root}/batches/${pathId(id)}?${query(input)}`, batchDetailSchema); }
  collections(input: unknown = {}) { return ieltsRequest(`${root}/collections?${query(input)}`, paginated(collectionSchema)); }
  versions(id: string, input: unknown = {}) { return ieltsRequest(`${root}/collections/${pathId(id)}/versions?${query(input)}`, paginated(versionSummarySchema)); }
  async members(id: string, input: unknown = {}) { return ieltsRequest(`${root}/versions/${pathId(id)}/members?${query(input)}`, paginated(memberSchema)); }
  async assignments(id: string, input: unknown = {}) { return ieltsRequest(`${root}/versions/${pathId(id)}/assignments?${query(input)}`, paginated(assignmentSchema)); }
  async bindings(id: string, input: unknown = {}) { return ieltsRequest(`${root}/versions/${pathId(id)}/bindings?${query(input)}`, paginated(bindingSchema)); }
  options(input: unknown = {}) { return ieltsRequest(`${root}/options?${query(input)}`, optionsSchema); }
  private post<T>(path: string, schema: z.ZodType<T>, body: unknown) { return ieltsRequest(`${root}${path}`, schema, { method: 'POST', body: JSON.stringify(body) }); }
  registerSource(input: unknown) { return this.post('/sources', sourceSchema, vocabularySourceInputSchema.parse(input)); }
  rights(id: string, input: unknown) { return ieltsRequest(`${root}/sources/${pathId(id)}/rights`, sourceSchema, { method: 'PATCH', body: JSON.stringify(vocabularyRightsInputSchema.parse(input)) }); }
  async review(id: string, input: unknown) { return this.post(`/batches/${pathId(id)}/review`, batchSchema, vocabularyReviewSchema.parse(input)); }
  publishBatch(id: string, input: unknown) { return this.post(`/batches/${pathId(id)}/publish`, versionSummarySchema, vocabularyPublishSchema.parse(input)); }
  rollback(id: string, input: unknown) { return this.post(`/batches/${pathId(id)}/rollback`, batchSchema, vocabularyRollbackSchema.parse(input)); }
  createCollection(input: unknown) { return this.post('/collections', collectionSchema, vocabularyCollectionInputSchema.parse(input)); }
  createVersion(id: string, input: unknown) { return this.post(`/collections/${pathId(id)}/versions`, versionSchema, vocabularyCollectionMembersSchema.parse(input)); }
  publishVersion(id: string) { return this.post(`/versions/${pathId(id)}/publish`, versionSummarySchema, {}); }
  assign(input: unknown) { return this.post('/assignments', identity, vocabularyProgramInputSchema.parse(input)); }
  bind(id: string, input: unknown) { return this.post(`/versions/${pathId(id)}/bindings`, identity, vocabularyBindingInputSchema.parse(input)); }
  async importManifest(rawSource: unknown, filename: string, raw: unknown, onProgress?: (batch: z.infer<typeof batchSchema>) => void) {
    const { manifest } = dryRunManifest(raw, rawSource);
    const source = sourceSchema.parse(rawSource);
    const document = await this.post('/documents', identity, vocabularyDocumentInputSchema.parse({ sourceId: source.id, originalFilename: filename, sha256: manifest.documentSha256, cefrLevel: manifest.cefrLevel, pageCount: manifest.pageCount }));
    let batch = await this.post('/batches', batchSchema, vocabularyBatchInputSchema.parse({ documentId: document.id, parserVersion: manifest.parserVersion, inventory: manifest.inventory }));
    onProgress?.(batch);
    if (batch.status === 'BLOCKED_BY_RIGHTS') blocked();
    for (let offset = 0; offset < manifest.rows.length; offset += 250) {
      batch = await this.post(`/batches/${batch.id}/stage`, batchSchema, vocabularyStageSchema.parse({ revision: batch.revision, rows: manifest.rows.slice(offset, offset + 250) }));
      onProgress?.(batch);
    }
    return batch;
  }
}
export const vocabularyLibraryClient = new VocabularyLibraryClient();
