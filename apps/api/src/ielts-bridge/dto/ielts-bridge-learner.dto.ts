import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateIeltsBridgeProgressDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @ApiProperty({ minimum: 0, maximum: 9 })
  @IsInt()
  @Min(0)
  stageIndex!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  startTimer?: boolean;

  @ApiPropertyOptional({ description: 'Answer shape depends on the learner-safe task kind.' })
  @IsOptional()
  @Allow()
  answer?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completeStage?: boolean;
}
