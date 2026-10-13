import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';

class OrientationAnswerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  questionSlug!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  selectedIndex!: number;
}

export class UpdateOrientationProgressDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orientationVersionId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  targetSlideIndex!: number;

  @ApiPropertyOptional({ type: OrientationAnswerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrientationAnswerDto)
  answer?: OrientationAnswerDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  complete = false;
}
