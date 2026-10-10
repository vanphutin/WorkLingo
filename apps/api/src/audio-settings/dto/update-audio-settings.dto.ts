import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAudioSettingsDto {
  @ApiProperty({ enum: ['system-default', 'published-audio', 'browser-tts'] })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(80)
  sourceId!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  browserVoiceId?: string | null;
}
