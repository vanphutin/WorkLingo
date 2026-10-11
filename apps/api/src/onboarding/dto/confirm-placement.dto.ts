import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmPlacementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientConfirmationId!: string;
}
