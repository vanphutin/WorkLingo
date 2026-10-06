import { ApiProperty } from '@nestjs/swagger';

export class SkillMemoryHealthDto {
  @ApiProperty({ nullable: true, example: 85 })
  health!: number | null;

  @ApiProperty({ example: 2 })
  evaluatedBlocksCount!: number;

  @ApiProperty({ example: 0 })
  dueCount!: number;

  @ApiProperty({ example: 0 })
  needsAttentionCount!: number;
}

export class MemoryHealthResponseDto {
  @ApiProperty({ type: SkillMemoryHealthDto })
  reading!: SkillMemoryHealthDto;

  @ApiProperty({ type: SkillMemoryHealthDto })
  listening!: SkillMemoryHealthDto;

  @ApiProperty({ type: SkillMemoryHealthDto })
  speaking!: SkillMemoryHealthDto;

  @ApiProperty({ type: SkillMemoryHealthDto })
  writing!: SkillMemoryHealthDto;

  @ApiProperty({ type: SkillMemoryHealthDto })
  overall!: SkillMemoryHealthDto;
}