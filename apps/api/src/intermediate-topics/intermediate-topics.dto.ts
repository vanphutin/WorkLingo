import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import type { TopicPlan } from '@worklingo/contracts';

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
}
