import { z } from 'zod';

export const vocabularyCefrSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const vocabularyPosSchema = z.enum(['NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'DETERMINER', 'INTERJECTION', 'NUMBER', 'PHRASE', 'UNKNOWN']);
export const vocabularyRightsStatusSchema = z.enum(['PENDING', 'APPROVED', 'REVOKED']);
export const vocabularyBatchStatusSchema = z.enum(['REGISTERED', 'BLOCKED_BY_RIGHTS', 'EXTRACTED', 'VALIDATED', 'REVIEW_REQUIRED', 'REVIEWED', 'STAGED', 'PUBLISHED', 'FAILED', 'ROLLED_BACK']);
export const vocabularyUseSchema = z.enum(['EXTRACT', 'STORE', 'MODIFY', 'TRANSLATE', 'REDISTRIBUTE', 'COMMERCIAL']);
export const vocabularyFieldSchema = z.enum(['FORM', 'DEFINITION', 'PRONUNCIATION']);
export const vocabularyDialectSchema = z.enum(['en-US', 'en-GB', 'und']);
const text = z.string().trim().min(1).max(500);
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const revision = z.number().int().positive();
export const vocabularySourceInputSchema = z.object({ providerName: text, title: text, sourceUrl: z.url().max(2000), languageCode: z.string().regex(/^[a-z]{2,3}$/u).default('en'), pronunciationDialect: vocabularyDialectSchema.default('und'), attributionRequirements: z.string().max(2000).default('') }).strict();
export const vocabularyRightsInputSchema = z.object({ revision, rightsStatus: vocabularyRightsStatusSchema, permissionReference: z.string().trim().max(500).nullable(), allowedUses: z.array(vocabularyUseSchema).max(6), allowedFields: z.array(vocabularyFieldSchema).max(3) }).strict().superRefine((value, ctx) => {
  if (value.rightsStatus === 'APPROVED' && (!value.permissionReference || !value.allowedUses.includes('EXTRACT') || !value.allowedUses.includes('STORE') || !value.allowedFields.includes('FORM'))) ctx.addIssue({ code: 'custom', message: 'Approval needs authorization evidence, EXTRACT/STORE scope and FORM permission' });
});
export const vocabularyDocumentInputSchema = z.object({ sourceId: z.uuid(), cefrLevel: vocabularyCefrSchema, originalFilename: text, sha256: hash, pageCount: z.number().int().min(1).max(2000), edition: z.string().max(200).default(''), sourceUrl: z.url().max(2000).optional() }).strict();
export const vocabularyLocationSchema = z.object({ pageIndex: z.number().int().nonnegative(), bbox: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative(), z.number().finite().nonnegative(), z.number().finite().nonnegative()]) }).strict().refine(value => value.bbox[2] > value.bbox[0] && value.bbox[3] > value.bbox[1], 'Bounding box must have positive area');
export const vocabularyExceptionSchema = z.object({ code: text, message: z.string().max(1000), location: vocabularyLocationSchema.optional() }).strict();
export const vocabularyInventorySchema = z.object({ pages: z.array(z.object({ pageIndex: z.number().int().nonnegative(), detectedKeys: z.array(text).max(1000), exceptions: z.array(vocabularyExceptionSchema).max(1000) }).strict()).min(1).max(2000) }).strict();
export const vocabularySourceRowSchema = z.object({
  sourceEntryKey: text, topicInstanceKey: text, originalTopic: text, topicSequence: z.number().int().positive(), rowOrdinal: z.number().int().positive(), pageIndex: z.number().int().nonnegative(), printedPageNumber: z.string().max(40).nullable().default(null),
  locations: z.array(vocabularyLocationSchema).min(1).max(50), rawWord: z.string().min(1).max(500), parsedWord: text, rawPos: z.string().max(100), normalizedPos: vocabularyPosSchema, cefrLevel: vocabularyCefrSchema,
  pronunciation: z.string().max(500).nullable().default(null), permittedDefinition: z.string().max(10000).nullable().default(null), extractionConfidence: z.number().min(0).max(1).default(1), warnings: z.array(z.string().max(500)).max(50).default([]),
}).strict();
export const vocabularyManifestSchema = z.object({ documentSha256: hash, pageCount: z.number().int().min(1).max(2000), cefrLevel: vocabularyCefrSchema, parserVersion: text, inventory: vocabularyInventorySchema, rows: z.array(vocabularySourceRowSchema).max(100000) }).strict();
export const vocabularyBatchInputSchema = z.object({ documentId: z.uuid(), parserVersion: text, inventory: vocabularyInventorySchema }).strict();
export const vocabularyStageSchema = z.object({ revision, rows: z.array(vocabularySourceRowSchema).min(1).max(250) }).strict();
export const vocabularyReviewSchema = z.object({ revision, sourceEntryId: z.uuid(), decision: z.enum(['NEW_ENTRY', 'NEW_SENSE', 'REUSE_SENSE', 'REJECT']), lexicalEntryId: z.uuid().optional(), senseId: z.uuid().optional(), rejectionReason: z.string().trim().min(10).max(2000).optional(), entryType: z.enum(['WORD', 'MULTIWORD_EXPRESSION', 'PHRASAL_VERB', 'IDIOM']).default('WORD'), topicGroupIds: z.array(z.uuid()).max(20).default([]), correction: z.object({ parsedWord: text, normalizedPos: vocabularyPosSchema.exclude(['UNKNOWN']), sourceContentHash: hash, reason: z.string().trim().min(10).max(2000) }).strict().optional() }).strict().superRefine((value, ctx) => {
  if (value.decision === 'REUSE_SENSE' && !value.senseId || value.decision === 'NEW_SENSE' && !value.lexicalEntryId || value.decision === 'REJECT' && !value.rejectionReason) ctx.addIssue({ code: 'custom', message: 'Review decision is missing its required target or reason' });
});
export const vocabularyPublishSchema = z.object({ revision, collectionName: text, collectionId: z.uuid().optional() }).strict();
export const vocabularyRollbackSchema = z.object({ revision, reason: z.string().trim().min(10).max(2000) }).strict();
export const vocabularyQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(200).optional(), cefr: vocabularyCefrSchema.optional(), pos: vocabularyPosSchema.optional(), topicId: z.uuid().optional(), programId: z.uuid().optional(), sourceId: z.uuid().optional(), reviewStatus: z.enum(['DRAFT', 'REVIEWED']).optional() }).strict();
export const vocabularyCollectionInputSchema = z.object({ name: text, type: z.enum(['CEFR', 'TOPIC', 'PROGRAM', 'EXAM', 'LESSON', 'PERSONAL']), ownerReference: text }).strict();
export const vocabularyCollectionMembersSchema = z.object({ senseIds: z.array(z.uuid()).min(1).max(500) }).strict().refine(value => new Set(value.senseIds).size === value.senseIds.length, 'Duplicate sense membership');
export const vocabularyProgramInputSchema = z.object({ memberId: z.uuid(), programId: z.uuid(), targetLevel: z.string().max(100).optional(), priority: z.number().int().min(0).max(100).default(0), learningGoal: z.enum(['RECEPTIVE', 'PRODUCTIVE', 'BOTH']), skills: z.array(z.enum(['READING', 'LISTENING', 'SPEAKING', 'WRITING'])).min(1).max(4), inclusionReason: z.string().trim().min(10).max(2000) }).strict();
export const vocabularyBindingInputSchema = z.object({ programId: z.uuid().optional(), pathId: z.uuid().optional(), levelId: z.uuid().optional(), missionId: z.uuid().optional(), lessonVersionId: z.uuid().optional(), wordBankVersionId: z.uuid().optional() }).strict().refine(value => Object.values(value).filter(Boolean).length === 1, 'Exactly one curriculum target is required');
export const vocabularyLegacyInputSchema = z.object({ senseId: z.uuid(), languageBlockId: z.uuid() }).strict();
export type VocabularySourceRow = z.infer<typeof vocabularySourceRowSchema>;
export type VocabularyInventory = z.infer<typeof vocabularyInventorySchema>;
export type VocabularyManifest = z.infer<typeof vocabularyManifestSchema>;
export type VocabularyQuery = z.infer<typeof vocabularyQuerySchema>;
export type VocabularySourceInput = z.input<typeof vocabularySourceInputSchema>;
export type VocabularyRightsInput = z.infer<typeof vocabularyRightsInputSchema>;
export type VocabularyDocumentInput = z.infer<typeof vocabularyDocumentInputSchema>;
export type VocabularyBatchInput = z.infer<typeof vocabularyBatchInputSchema>;
export type VocabularyStageInput = z.infer<typeof vocabularyStageSchema>;
export type VocabularyReviewInput = z.infer<typeof vocabularyReviewSchema>;
export type VocabularyPublishInput = z.infer<typeof vocabularyPublishSchema>;
export type VocabularyProgramInput = z.infer<typeof vocabularyProgramInputSchema>;
