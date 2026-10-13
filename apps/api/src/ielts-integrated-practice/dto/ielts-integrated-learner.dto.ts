import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class StartIeltsIntegratedSessionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientSessionId!: string;
  @ApiProperty({ enum: [60, 90, 120, 150] }) @IsInt() @IsIn([60, 90, 120, 150]) durationMinutes!: 60 | 90 | 120 | 150;
  @ApiProperty({ enum: ['foundation', 'developing', 'competent', 'advanced'] }) @IsIn(['foundation', 'developing', 'competent', 'advanced']) difficulty!: 'foundation' | 'developing' | 'competent' | 'advanced';
}
export class UpdateIeltsIntegratedProgressDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ minimum: 0, maximum: 3 }) @IsInt() @Min(0) @Max(3) blockIndex!: number;
  @ApiPropertyOptional() @IsOptional() @Allow() answer?: unknown;
}
