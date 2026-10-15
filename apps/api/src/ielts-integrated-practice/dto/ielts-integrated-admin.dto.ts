import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsUUID, Min } from 'class-validator';

export class SaveIeltsIntegratedDraftDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>;
}
export class IeltsIntegratedCommandDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
}
