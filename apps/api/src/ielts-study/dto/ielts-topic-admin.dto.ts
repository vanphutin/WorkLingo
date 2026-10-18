import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsUUID, Min, ValidateIf } from 'class-validator';
export class SaveIeltsTopicDraftDto {
  @ApiProperty({ minimum: 1, nullable: true }) @ValidateIf((_object, value) => value !== null) @IsInt() @Min(1) expectedRevision!: number | null;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>;
}
export class IeltsTopicRevisionDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
}
export class IeltsTopicCommandDto extends IeltsTopicRevisionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
}
