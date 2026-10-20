import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { supportedSessionDurations, type SessionDuration, type TopicPlan } from '@worklingo/contracts';

export class TopicReviewRequestDto {
  @ApiProperty() @IsInt() @Min(1) expectedDraftRevision!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(256) expectedSourceHash!: string;
  @ApiProperty() @IsInt() @Min(0) expectedReviewRevision!: number;
}
export class ApproveTopicDto extends TopicReviewRequestDto {
  @ApiProperty({ type: 'object', additionalProperties: true }) @IsObject() plan!: TopicPlan;
}
export class CreateTopicSessionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientSessionId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() topicId?: string;
  @ApiPropertyOptional({ enum: supportedSessionDurations, description: 'Filter by the approved lesson duration; does not override it.' })
  @IsOptional() @IsIn(supportedSessionDurations) durationMinutes?: SessionDuration;
}
export class RepairTopicJsonDto {
  @ApiProperty({ maxLength: 200000 }) @IsString() @IsNotEmpty() @MaxLength(200000) source!: string;
}
