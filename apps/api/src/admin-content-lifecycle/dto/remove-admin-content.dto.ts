import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsUUID, Min } from 'class-validator';

export const adminContentKinds = ['topic', 'bridge', 'mock', 'lesson'] as const;
export type AdminContentKind = typeof adminContentKinds[number];

export class RemoveAdminContentDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedRevision!: number;
  @ApiProperty({ enum: ['deleted', 'archived'] }) @IsIn(['deleted', 'archived']) expectedAction!: 'deleted' | 'archived';
  @ApiProperty({ format: 'uuid' }) @IsUUID() idempotencyKey!: string;
}

export class RemoveAdminContentParamsDto {
  @ApiProperty({ enum: adminContentKinds }) @IsIn(adminContentKinds) kind!: AdminContentKind;
  @ApiProperty({ format: 'uuid' }) @IsUUID() id!: string;
}

export class RemoveAdminContentResultDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['deleted', 'archived'] }) action!: 'deleted' | 'archived';
}
