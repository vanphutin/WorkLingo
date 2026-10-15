import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UiLocale } from '@worklingo/contracts';

export class RegisterDto {
  @ApiProperty({ example: 'An Nguyen', maxLength: 80, minLength: 2 })
  @IsString()
  @MaxLength(80)
  @MinLength(2)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  displayName!: string;

  @ApiProperty({ example: 'learner@example.com' })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  // IsOptional skips null; an explicit null is invalid rather than omitted.
  @Transform(({ value }: { value: unknown }) => value === null ? '' : value)
  locale?: UiLocale;

  @ApiProperty({ maxLength: 128, minLength: 12, writeOnly: true })
  @IsString()
  @MaxLength(128)
  @MinLength(12)
  password!: string;
}
