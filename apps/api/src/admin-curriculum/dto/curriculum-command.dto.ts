import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import type {
  ArchiveLearningPathInput,
  ArchiveLevelInput,
  ArchiveMissionInput,
  CreateLearningPathInput,
  CreateLevelInput,
  CreateMissionInput,
  MissionPurposeDto,
  PublishLearningPathInput,
  PublishLevelInput,
  PublishMissionInput,
  ReorderCurriculumInput,
  ReplaceMissionLessonsInput,
  UpdateLearningPathInput,
  UpdateLevelInput,
  UpdateMissionInput,
} from '@worklingo/contracts';

export class CreateLearningPathDto implements CreateLearningPathInput {
  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsString()
  @IsNotEmpty({ message: 'Path name is required' })
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/u, {
    message: 'Slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;
}

export class UpdateLearningPathDto implements UpdateLearningPathInput {
  @IsInt()
  @IsPositive({ message: 'expectedRevision must be a positive integer' })
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Path name is required' })
  name?: string;
}

export class PublishLearningPathDto implements PublishLearningPathInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class ArchiveLearningPathDto implements ArchiveLearningPathInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class CreateLevelDto implements CreateLevelInput {
  @IsString()
  @IsNotEmpty({ message: 'CEFR reference is required' })
  cefrReference!: string;

  @IsString()
  @Matches(/^[A-Z0-9_]+$/u, {
    message: 'Code must contain uppercase letters, numbers and underscores',
  })
  code!: string;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsString()
  @IsNotEmpty({ message: 'Level name is required' })
  name!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  order?: number;

  @IsUUID('4', { message: 'pathId must be a valid UUID' })
  @IsNotEmpty()
  pathId!: string;
}

export class UpdateLevelDto implements UpdateLevelInput {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'CEFR reference is required' })
  cefrReference?: string;

  @IsInt()
  @IsPositive({ message: 'expectedRevision must be a positive integer' })
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Level name is required' })
  name?: string;
}

export class PublishLevelDto implements PublishLevelInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class ArchiveLevelDto implements ArchiveLevelInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class CreateMissionDto implements CreateMissionInput {
  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsUUID('4', { message: 'levelId must be a valid UUID' })
  @IsNotEmpty()
  levelId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Objective is required' })
  objective!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  order?: number;

  @IsOptional()
  @IsEnum(['LEARNING', 'PLACEMENT'], {
    message: 'purpose must be LEARNING or PLACEMENT',
  })
  purpose: MissionPurposeDto = 'LEARNING';

  @IsString()
  @Matches(/^[a-z0-9-]+$/u, {
    message: 'Slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;
}

export class UpdateMissionDto implements UpdateMissionInput {
  @IsInt()
  @IsPositive({ message: 'expectedRevision must be a positive integer' })
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Objective is required' })
  objective?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title?: string;
}

export class PublishMissionDto implements PublishMissionInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class ArchiveMissionDto implements ArchiveMissionInput {
  @IsInt()
  @IsPositive()
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;
}

export class ReorderCurriculumDto implements ReorderCurriculumInput {
  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsArray()
  @IsUUID('4', { each: true, message: 'Every ordered ID must be a UUID' })
  orderedIds!: string[];
}

export class ReplaceMissionLessonsDto implements ReplaceMissionLessonsInput {
  @IsInt()
  @IsPositive({ message: 'expectedRevision must be a positive integer' })
  expectedRevision!: number;

  @IsUUID('4', { message: 'idempotencyKey must be a valid UUID' })
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsArray()
  @IsUUID('4', { each: true, message: 'Every lesson ID must be a UUID' })
  lessonIds!: string[];
}
