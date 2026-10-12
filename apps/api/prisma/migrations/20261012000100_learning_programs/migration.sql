-- CreateEnum
CREATE TYPE "ProgramAvailabilityStatus" AS ENUM (
  'AVAILABLE',
  'COMING_SOON',
  'IN_DEVELOPMENT',
  'BETA',
  'DISABLED'
);

-- CreateTable
CREATE TABLE "LearningProgram" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "learningGoal" TEXT NOT NULL,
  "proficiencyLabel" TEXT NOT NULL,
  "iconKey" TEXT NOT NULL,
  "availabilityStatus" "ProgramAvailabilityStatus" NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LearningProgram_pkey" PRIMARY KEY ("id")
);

-- Seed the durable catalog before adding the required path relation.
INSERT INTO "LearningProgram" (
  "id", "slug", "name", "description", "learningGoal",
  "proficiencyLabel", "iconKey", "availabilityStatus", "displayOrder", "updatedAt"
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'beginner',
    'Beginner',
    'Build essential English through guided four-skill practice.',
    'Understand and use practical English in familiar situations.',
    'Foundation / Pre-A1–A2',
    'beginner',
    'COMING_SOON',
    1,
    CURRENT_TIMESTAMP
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'intermediate',
    'Intermediate',
    'Use English confidently across everyday workplace situations.',
    'Communicate, understand and respond effectively at work.',
    'Intermediate / B1–B2',
    'intermediate',
    'AVAILABLE',
    2,
    CURRENT_TIMESTAMP
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'toeic',
    'TOEIC',
    'Prepare for TOEIC through practical workplace language evidence.',
    'Strengthen listening and reading while retaining four-skill transfer.',
    'TOEIC-oriented',
    'toeic',
    'COMING_SOON',
    3,
    CURRENT_TIMESTAMP
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'ielts',
    'IELTS',
    'Develop integrated English for a future band-oriented IELTS pathway.',
    'Build the language evidence required for guided IELTS preparation.',
    'IELTS band-oriented',
    'ielts',
    'IN_DEVELOPMENT',
    4,
    CURRENT_TIMESTAMP
  );

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgram_slug_key" ON "LearningProgram"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgram_displayOrder_key" ON "LearningProgram"("displayOrder");

-- Add the relation in nullable form so every historical row can be backfilled.
ALTER TABLE "LearningPath" ADD COLUMN "programId" UUID;

UPDATE "LearningPath"
SET "programId" = '10000000-0000-4000-8000-000000000002'
WHERE "programId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "LearningPath" WHERE "programId" IS NULL) THEN
    RAISE EXCEPTION 'LearningPath program backfill left unassigned rows';
  END IF;
END $$;

ALTER TABLE "LearningPath"
  ALTER COLUMN "programId" SET DEFAULT '10000000-0000-4000-8000-000000000002',
  ALTER COLUMN "programId" SET NOT NULL;

-- Index the foreign key and the catalog query shape used by learner/admin views.
CREATE INDEX "LearningPath_programId_status_idx" ON "LearningPath"("programId", "status");

ALTER TABLE "LearningPath"
  ADD CONSTRAINT "LearningPath_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "LearningProgram"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
