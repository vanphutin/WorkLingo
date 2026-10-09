import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class SaveActivityDraftDto {
  @ApiProperty({ description: 'Last server revision seen by the editor; use 0 to create.' })
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  expectedRevision!: number;

  @ApiProperty({ maxLength: 20_000 })
  @IsString()
  @MaxLength(20_000)
  text!: string;
}
