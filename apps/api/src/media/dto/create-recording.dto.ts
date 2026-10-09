import { Transform } from 'class-transformer';
import { IsBoolean, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRecordingDto {
  @IsUUID()
  sessionId!: string;

  @IsUUID()
  clientAttemptId!: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  consentAccepted!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  consentPolicyVersion!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  consentScope!: string;
}
