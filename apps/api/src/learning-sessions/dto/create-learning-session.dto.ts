import { ApiProperty } from '@nestjs/swagger';
import { supportedSessionDurations } from '@worklingo/contracts';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateLearningSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientSessionId!: string;

  @ApiProperty({ default: 60, enum: [...supportedSessionDurations], example: 60, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  durationMinutes: number = 60;
}
