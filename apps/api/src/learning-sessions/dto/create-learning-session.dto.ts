import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateLearningSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientSessionId!: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  @Max(150)
  durationMinutes!: number;
}
