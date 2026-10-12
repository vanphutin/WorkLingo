import { Transform } from 'class-transformer';
import { IsDefined, IsInt, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateProgramDto {
  @ApiProperty({ example: 'intermediate', maxLength: 100 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  programSlug!: string;

  @ApiProperty({ nullable: true, type: Number, minimum: 1 })
  @ValidateIf((_object, value) => value !== null)
  @IsDefined()
  @IsInt()
  @Min(1)
  expectedRevision!: number | null;
}
