import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID, IsOptional } from 'class-validator';
import { supportedSessionDurations, type SessionDuration } from '@worklingo/contracts';
export class CreateCurriculumSessionDto {
 @ApiProperty({format:'uuid',required:false}) @IsOptional() @IsUUID() lessonVersionId?: string;
 @ApiProperty({format:'uuid'}) @IsUUID() missionId!: string;
 @ApiProperty({format:'uuid'}) @IsUUID() expectedCurriculumRevisionId!: string;
 @ApiProperty({format:'uuid'}) @IsUUID() clientSessionId!: string;
 @ApiProperty({enum:[...supportedSessionDurations]}) @IsIn([...supportedSessionDurations]) durationMinutes!: SessionDuration;
}
