import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ maxLength: 128, minLength: 12, writeOnly: true })
  @IsString()
  @MaxLength(128)
  @MinLength(12)
  password!: string;
}
