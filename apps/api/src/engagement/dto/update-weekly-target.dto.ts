import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateWeeklyTargetDto {
  @ApiProperty({
    description: 'Weekly learning target days between 2 and 5',
    example: 3,
    maximum: 5,
    minimum: 2,
  })
  @IsInt()
  @Min(2)
  @Max(5)
  targetDays!: number;
}
