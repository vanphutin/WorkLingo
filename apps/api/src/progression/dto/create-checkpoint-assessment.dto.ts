import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateCheckpointAssessmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ format: 'uuid', description: 'A new UUID for each assessment; replay returns the original snapshot' })
  @IsUUID()
  clientAssessmentId!: string;
}
