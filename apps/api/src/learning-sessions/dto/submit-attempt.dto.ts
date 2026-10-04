import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';

export class SubmitAttemptDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientAttemptId!: string;

  @ApiProperty({ additionalProperties: true, type: 'object' })
  @IsObject()
  response!: Record<string, unknown>;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;
}
