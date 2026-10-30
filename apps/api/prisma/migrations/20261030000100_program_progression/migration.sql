CREATE TYPE "ProgramProgressionPolicy" AS ENUM ('MASTERY', 'ACTIVITY_COMPLETION');
ALTER TABLE "LearningProgram" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "progressionPolicy" "ProgramProgressionPolicy" NOT NULL DEFAULT 'MASTERY',
 ADD COLUMN "curriculumRevisionIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
ALTER TABLE "LearnerProgramEnrollment" ADD COLUMN "curriculumRevisionIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
