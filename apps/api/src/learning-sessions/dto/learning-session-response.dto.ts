import { ApiProperty } from '@nestjs/swagger';

export class LearningSessionResponseDto {
  @ApiProperty({ items: { additionalProperties: true, type: 'object' }, type: 'array' }) attempts!: object[];
  @ApiProperty({ items: { additionalProperties: true, type: 'object' }, type: 'array' }) blocks!: object[];
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) clientSessionId!: string;
  @ApiProperty() currentCheckpoint!: number;
  @ApiProperty({ example: 60 }) durationMinutes!: number;
  @ApiProperty({ format: 'uuid' }) lessonVersionId!: string;
  @ApiProperty({ additionalProperties: true, type: 'object' }) mission!: { id: string; title: string };
  @ApiProperty({ additionalProperties: true, type: 'object' }) plan!: object;
  @ApiProperty({ enum: ['planned', 'in_progress', 'paused', 'completed', 'abandoned'] }) status!: string;
}

export class ActivityAttemptResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) activityId!: string;
  @ApiProperty({ format: 'uuid' }) clientAttemptId!: string;
  @ApiProperty({ enum: ['submitted', 'evaluated'] }) evaluationStatus!: string;
  @ApiProperty({ nullable: true }) score!: number | null;
  @ApiProperty({ nullable: true }) feedback!: string | null;
  @ApiProperty({ format: 'uuid' }) learnerId!: string;
  @ApiProperty({ additionalProperties: true, type: 'object' }) normalizedResponse!: object | null;
  @ApiProperty({ additionalProperties: true, type: 'object' }) rawResponse!: object;
  @ApiProperty({ format: 'uuid' }) sessionId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class LearnerActivityResponseDto {
  @ApiProperty({ enum: ['reading', 'listening', 'speaking', 'writing'] }) activityType!: string;
  @ApiProperty({ items: { additionalProperties: true, type: 'object' }, type: 'array' }) content!: object[];
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ items: { additionalProperties: true, type: 'object' }, type: 'array' }) languageBlocks!: object[];
  @ApiProperty({ enum: ['activate', 'readDecode', 'listenReason', 'respond'] }) learningBlock!: string;
  @ApiProperty({ additionalProperties: true, type: 'object' }) payload!: object;
  @ApiProperty({ isArray: true, type: String }) skills!: string[];
  @ApiProperty() slug!: string;
}

export class SessionAvailabilityResponseDto {
  @ApiProperty({ additionalProperties: true, type: 'object' }) mission!: { id: string; title: string };
  @ApiProperty({ format: 'uuid' }) lessonVersionId!: string;
  @ApiProperty({ example: [45, 60, 90, 120, 150], isArray: true, type: Number }) supportedDurations!: number[];
  @ApiProperty({ example: [45, 60], isArray: true, type: Number }) availableDurations!: number[];
  @ApiProperty({ example: 60 }) defaultDurationMinutes!: number;
}
