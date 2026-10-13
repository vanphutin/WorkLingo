import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsUUID, Min } from 'class-validator';

export class UpdateOrientationDraftDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedRevision!: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  content!: Record<string, unknown>;
}

export class ValidateOrientationDraftDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedRevision!: number;
}

export class PublishOrientationDto extends ValidateOrientationDraftDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idempotencyKey!: string;
}

export class UploadOrientationMediaDto {
  @ApiProperty({ enum: ['AUDIO', 'IMAGE'] })
  @IsIn(['AUDIO', 'IMAGE'])
  kind!: 'AUDIO' | 'IMAGE';
}
