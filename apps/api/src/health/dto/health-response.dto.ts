import { ApiProperty } from '@nestjs/swagger';

class HealthCheckDto {
  @ApiProperty({ enum: ['up'], example: 'up' })
  status!: 'up';
}

class HealthChecksDto {
  @ApiProperty({ type: HealthCheckDto })
  database!: HealthCheckDto;

  @ApiProperty({ type: HealthCheckDto })
  storage!: HealthCheckDto;
}

export class HealthResponseDto {
  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;

  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';
}
