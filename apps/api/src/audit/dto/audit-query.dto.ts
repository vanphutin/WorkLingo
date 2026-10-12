import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import type { AdminAuditFilterInput } from '@worklingo/contracts';

export class AdminAuditFilterDto implements AdminAuditFilterInput {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsUUID('4', { message: 'actorId must be a valid UUID' })
  actorId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
