import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, IsUUID, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicGroupDto {
  @ApiPropertyOptional({ maxLength: 120, nullable: true, type: String })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ') : value)
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @IsString() @MinLength(1) @MaxLength(120) nameEn?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @Transform(({ value }: { value: unknown }) => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item.normalize('NFKC').trim().replace(/\s+/gu, ' ') : item) : value)
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(120, { each: true }) aliases?: string[];

  @ApiProperty({ maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ') : value)
  @IsString() @MinLength(1) @MaxLength(120) name!: string;

  @ApiProperty({ maxLength: 2000 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(2000) description!: string;
}
export class UpdateTopicGroupDto extends CreateTopicGroupDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
}
export class DeleteTopicGroupDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
}
export class AssignTopicGroupDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  @ValidateIf((_object, value: unknown) => value !== null) @IsUUID() groupId!: string | null;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
}
