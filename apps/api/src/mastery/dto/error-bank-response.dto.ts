import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';

export class ErrorBankItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  languageBlockId!: string;

  @ApiProperty()
  languageBlockSlug!: string;

  @ApiProperty()
  canonicalForm!: string;

  @ApiProperty({ enum: ActivityType })
  skill!: ActivityType;

  @ApiProperty({ example: 'ACTIVITY_INCORRECT' })
  errorType!: string;

  @ApiProperty({ example: 'ACTIVITY' })
  evidenceGranularity!: string;

  @ApiProperty({ example: 'lesson-1:activity-slug' })
  contextKey!: string;

  @ApiProperty({ format: 'uuid' })
  activityId!: string;

  @ApiProperty()
  activitySlug!: string;

  @ApiProperty({ example: 1 })
  occurrenceCount!: number;

  @ApiProperty({ format: 'date-time' })
  firstOccurredAt!: Date;

  @ApiProperty({ format: 'date-time' })
  lastOccurredAt!: Date;

  @ApiProperty({ format: 'uuid' })
  lessonVersionId!: string;
}

export class ErrorBankResponseDto {
  @ApiProperty({ type: [ErrorBankItemDto] })
  items!: ErrorBankItemDto[];

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}