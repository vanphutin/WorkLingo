import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsUUID, Min } from 'class-validator';
export class SaveIeltsMockDraftDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number; @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string; @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>; }
export class IeltsMockCommandDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number; @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string; }
