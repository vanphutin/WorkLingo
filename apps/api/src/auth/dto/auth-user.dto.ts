import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UiLocale } from '@worklingo/contracts';

export class AuthUserDto {
  @ApiProperty({ example: 'An Nguyen' })
  displayName!: string;

  @ApiProperty({ example: 'learner@example.com' })
  email!: string;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  locale?: UiLocale | undefined;

  @ApiProperty({ enum: ['PENDING', 'COMPLETE'], nullable: true })
  onboardingStatus!: 'PENDING' | 'COMPLETE' | null;

  @ApiProperty({
    enum: ['LEARNER', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'],
    isArray: true,
  })
  roles!: Array<'LEARNER' | 'CONTENT_ADMIN' | 'SYSTEM_ADMIN'>;
}
