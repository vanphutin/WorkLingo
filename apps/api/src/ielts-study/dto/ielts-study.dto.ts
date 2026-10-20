import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
export class StartIeltsTopicSessionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientSessionId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() topicVersionId!: string;
  @ApiProperty() @IsString() @MaxLength(120) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u) packSlug!: string;
  @ApiProperty({ enum: [90, 120, 150] }) @IsIn([90, 120, 150]) durationMinutes!: 90 | 120 | 150;
}
