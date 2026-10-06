import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateAudioDto {
  @ApiPropertyOptional({ description: 'Audio script slug to generate' })
  @IsString()
  @IsOptional()
  audioScriptSlug?: string;

  @ApiProperty({ description: 'Idempotency key for deduplication' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Voice configuration object' })
  @IsObject()
  @IsOptional()
  voiceConfig?: Record<string, unknown>;
}
