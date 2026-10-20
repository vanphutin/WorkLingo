import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNumber, IsObject, IsString, IsUUID, Max, Min } from 'class-validator';
export class CreateIeltsMockDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>;
}
export class SaveIeltsMockDraftDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number; @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string; @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() content!: Record<string, unknown>; }
export class IeltsMockCommandDto { @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number; @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string; }
export class ReviewIeltsMockAttemptDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
  @ApiProperty({ type: [Number], minItems: 4, maxItems: 4 }) @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4) @IsNumber({}, { each: true }) @Min(0, { each: true }) @Max(9, { each: true }) writingTask1!: [number, number, number, number];
  @ApiProperty({ type: [Number], minItems: 4, maxItems: 4 }) @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4) @IsNumber({}, { each: true }) @Min(0, { each: true }) @Max(9, { each: true }) writingTask2!: [number, number, number, number];
  @ApiProperty({ type: [Number], minItems: 4, maxItems: 4 }) @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4) @IsNumber({}, { each: true }) @Min(0, { each: true }) @Max(9, { each: true }) speaking!: [number, number, number, number];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) strengths!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) gaps!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @IsString({ each: true }) nextActions!: string[];
}
