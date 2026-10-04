import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'An Nguyen' })
  displayName!: string;

  @ApiProperty({ example: 'learner@example.com' })
  email!: string;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: ['LEARNER', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'],
    isArray: true,
  })
  roles!: Array<'LEARNER' | 'CONTENT_ADMIN' | 'SYSTEM_ADMIN'>;
}
