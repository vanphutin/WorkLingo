import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class StartIeltsBandPathwayDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientJourneyId!: string;
  @ApiProperty({ minimum: 3, maximum: 9 }) @IsInt() @Min(3) @Max(9) targetBand!: number;
}
export class UpdateIeltsBandTargetDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ minimum: 3, maximum: 9 }) @IsInt() @Min(3) @Max(9) targetBand!: number;
}
export class EvaluateIeltsBandPathwayDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
}
