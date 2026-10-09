import { ApiProperty } from '@nestjs/swagger';

export class EvaluationResponseDto {
  @ApiProperty({ format: 'uuid' }) attemptId!: string;
  @ApiProperty({ nullable: true }) completedAt!: string | null;
  @ApiProperty({ additionalProperties: true, nullable: true, type: 'object' }) feedback!: object | null;
  @ApiProperty({ additionalProperties: true, nullable: true, type: 'object' }) recording!: object | null;
  @ApiProperty() retryable!: boolean;
  @ApiProperty({ nullable: true }) score!: number | null;
  @ApiProperty({ additionalProperties: true, nullable: true, type: 'object' }) scores!: object | null;
  @ApiProperty({ enum: ['submitted', 'queued', 'processing', 'evaluated', 'evaluation_failed'] }) status!: string;
  @ApiProperty({ nullable: true }) transcript!: string | null;
}
