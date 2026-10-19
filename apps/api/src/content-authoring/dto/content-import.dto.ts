import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';

export class CreateContentImportDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_object, value: unknown) => value !== undefined) @IsUUID() topicGroupId?: string;

  @ApiProperty({ description: 'Raw lesson format source text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500_000)
  rawSource!: string;
}

export class UpdateContentSourceDto {
  @ApiProperty({ description: 'Updated raw lesson format source text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500_000)
  rawSource!: string;

  @ApiProperty({ description: 'Expected draft revision for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  expectedDraftRevision!: number;
}

export class ValidateContentImportDto {
  @ApiProperty({ description: 'Expected draft revision for optimistic concurrency control' })
  @IsInt()
  @Min(1)
  expectedDraftRevision!: number;
}

export class PublishContentImportDto {
  @ApiProperty({ description: 'Expected draft revision' })
  @IsInt()
  @Min(1)
  expectedDraftRevision!: number;

  @ApiProperty({ description: 'Expected source hash' })
  @IsString()
  @IsNotEmpty()
  expectedSourceHash!: string;

  @ApiProperty({ description: 'Idempotency key' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({
    description: 'READY audio artifact selected for each required script slug',
    type: 'object',
    additionalProperties: { type: 'string', format: 'uuid' },
  })
  @IsObject()
  selectedAudioArtifacts!: Record<string, string>;
}
