import { IsDefined, IsInt, IsObject, IsUUID, Min, ValidateIf } from 'class-validator';
import type { CurriculumDefinitionInput } from '@worklingo/contracts';

export class FoundationCommandDto {
  @IsInt() @Min(1)
  expectedRevision!: number;
  @IsUUID()
  idempotencyKey!: string;
}
export class SaveFoundationDraftDto {
  @IsDefined() @IsObject()
  definition!: CurriculumDefinitionInput;
  @ValidateIf((_object, value) => value !== null) @IsDefined() @IsInt() @Min(1)
  expectedRevision!: number | null;
  @IsUUID()
  idempotencyKey!: string;
}
