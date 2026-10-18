import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class IntroductionQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() versionId?: string;
}
export class VisitIeltsIntroductionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() orientationVersionId!: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) slideIndex!: number;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) expectedRevision!: number;
}
