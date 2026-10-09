import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelfPlacementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientConfirmationId!: string;

  @ApiProperty({ example: 'FOUNDATION_1', maxLength: 80 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(80)
  @Matches(/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/u)
  selectedLevelCode!: string;
}
