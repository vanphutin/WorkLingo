import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsUUID, Min } from 'class-validator';

export class StartIeltsMockAttemptDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientAttemptId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() mockTestId!: string;
  @ApiProperty({ enum: ['LEARNING', 'PRACTICE', 'EXAM_SIMULATION'] }) @IsEnum(['LEARNING', 'PRACTICE', 'EXAM_SIMULATION']) mode!: 'LEARNING' | 'PRACTICE' | 'EXAM_SIMULATION';
}

export class SaveIeltsMockResponsesDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) @IsObject() responses!: Record<string, string>;
}

export class SubmitIeltsMockSectionDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] }) @IsEnum(['LISTENING', 'READING', 'WRITING', 'SPEAKING']) section!: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
}
