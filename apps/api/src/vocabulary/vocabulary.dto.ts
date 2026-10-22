import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import * as contracts from '@worklingo/contracts';

// Shared strict Zod DTOs are the boundary authority. Keeping a second decorator
// model would allow the API and admin client to drift on nested import rows.
export const sourceDto = contracts.vocabularySourceInputSchema;
export const rightsDto = contracts.vocabularyRightsInputSchema;
export const documentDto = contracts.vocabularyDocumentInputSchema;
export const batchDto = contracts.vocabularyBatchInputSchema;
export const stageDto = contracts.vocabularyStageSchema;
export const reviewDto = contracts.vocabularyReviewSchema;
export const publishDto = contracts.vocabularyPublishSchema;
export const rollbackDto = contracts.vocabularyRollbackSchema;
export const queryDto = contracts.vocabularyQuerySchema;
export const pageDto = queryDto.pick({ page: true, limit: true });
export const optionsDto = queryDto.pick({ page: true, limit: true, search: true });
export const collectionDto = contracts.vocabularyCollectionInputSchema;
export const membersDto = contracts.vocabularyCollectionMembersSchema;
export const programDto = contracts.vocabularyProgramInputSchema;
export const bindingDto = contracts.vocabularyBindingInputSchema;
export const legacyDto = contracts.vocabularyLegacyInputSchema;
export const emptyDto = z.object({}).strict();

export type SourceDto = z.infer<typeof sourceDto>;
export type RightsDto = z.infer<typeof rightsDto>;
export type DocumentDto = z.infer<typeof documentDto>;
export type BatchDto = z.infer<typeof batchDto>;
export type StageDto = z.infer<typeof stageDto>;
export type ReviewDto = z.infer<typeof reviewDto>;
export type PublishDto = z.infer<typeof publishDto>;
export type RollbackDto = z.infer<typeof rollbackDto>;
export type QueryDto = z.infer<typeof queryDto>;
export type PageDto = z.infer<typeof pageDto>;
export type OptionsDto = z.infer<typeof optionsDto>;
export type CollectionDto = z.infer<typeof collectionDto>;
export type MembersDto = z.infer<typeof membersDto>;
export type ProgramDto = z.infer<typeof programDto>;
export type BindingDto = z.infer<typeof bindingDto>;
export type LegacyDto = z.infer<typeof legacyDto>;

export class VocabularyInputPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}
  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) throw new BadRequestException({ code: 'VOCABULARY_INPUT_INVALID', message: 'Invalid vocabulary request', details: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
    return parsed.data;
  }
}
