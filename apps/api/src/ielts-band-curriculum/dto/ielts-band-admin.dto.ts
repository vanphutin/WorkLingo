import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsUUID, Min } from 'class-validator';

export class SaveIeltsBandCurriculumDraftDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>;
}
export class IeltsBandCurriculumCommandDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
}
