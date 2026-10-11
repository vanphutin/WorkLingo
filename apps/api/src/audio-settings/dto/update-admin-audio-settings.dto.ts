import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminAudioSettingsDto {
  @ApiProperty({ enum: ['azure-speech', 'fake-tts'] })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(80)
  providerId!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  defaultVoiceId?: string | null;
}
