import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePlacementAttemptDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientAttemptId!: string;
}
