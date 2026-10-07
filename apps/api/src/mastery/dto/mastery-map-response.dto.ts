import { ApiProperty } from '@nestjs/swagger';

export class MasteryMapSkillDto {
  @ApiProperty() state!: string;
  @ApiProperty() score!: number;
  @ApiProperty() confidence!: number;
  @ApiProperty({ nullable: true }) nextReviewAt!: string | null;
  @ApiProperty() lastEvidenceAt!: string;
}
export class MasteryMapItemDto {
  @ApiProperty() languageBlockId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() canonicalForm!: string;
  @ApiProperty() meaning!: string;
  @ApiProperty({ type: Object }) skills!: Record<'reading' | 'listening' | 'speaking' | 'writing', MasteryMapSkillDto | null>;
}
export class ReviewQueueItemDto {
  @ApiProperty() languageBlockId!: string;
  @ApiProperty() skill!: string;
  @ApiProperty() priorityReason!: string;
  @ApiProperty({ nullable: true }) nextReviewAt!: string | null;
}
export class MasteryMapResponseDto {
  @ApiProperty({ type: [MasteryMapItemDto] }) items!: MasteryMapItemDto[];
  @ApiProperty({ type: [ReviewQueueItemDto] }) reviewQueue!: ReviewQueueItemDto[];
}
