import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { UiLocale } from '@worklingo/contracts';

export class UserPreferencesDto {
  @ApiProperty({ enum: ['vi', 'en'] })
  @IsIn(['vi', 'en'])
  locale!: UiLocale;
}
