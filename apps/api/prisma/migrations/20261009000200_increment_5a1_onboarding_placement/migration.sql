CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETE');
CREATE TYPE "OnboardingMethod" AS ENUM ('SELF_SELECTED', 'PLACEMENT', 'MIGRATED');
CREATE TYPE "MissionPurpose" AS ENUM ('LEARNING', 'PLACEMENT');
CREATE TYPE "PlacementAttemptStatus" AS ENUM (
  'IN_PROGRESS',
  'PROCESSING',
  'ACTION_REQUIRED',
  'RECOMMENDED',
  'CONFIRMED'
);

-- Existing learners have already entered the product through the pre-5A flow.
-- Backfill them before installing the PENDING default for future profiles.
ALTER TABLE "LearnerProfile"
  ADD COLUMN "onboardingStatus" "OnboardingStatus",
  ADD COLUMN "onboardingMethod" "OnboardingMethod",
  ADD COLUMN "onboardedAt" TIMESTAMP(3);

UPDATE "LearnerProfile"
SET
  "onboardingStatus" = 'COMPLETE',
  "onboardingMethod" = 'MIGRATED',
  "onboardedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "LearnerProfile"
  ALTER COLUMN "onboardingStatus" SET DEFAULT 'PENDING',
  ALTER COLUMN "onboardingStatus" SET NOT NULL;

ALTER TABLE "Mission"
  ADD COLUMN "purpose" "MissionPurpose" NOT NULL DEFAULT 'LEARNING';

CREATE UNIQUE INDEX "LearningSession_id_learnerId_lessonVersionId_key"
  ON "LearningSession"("id", "learnerId", "lessonVersionId");

CREATE TABLE "PlacementAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "clientAttemptId" UUID NOT NULL,
  "learningSessionId" UUID NOT NULL,
  "lessonVersionId" UUID NOT NULL,
  "policyVersion" TEXT NOT NULL DEFAULT 'workplace-placement-v1',
  "status" "PlacementAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "skillResults" JSONB NOT NULL DEFAULT '{}',
  "recommendedLevelCode" TEXT,
  "explanation" JSONB,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlacementAttempt_skill_results_object_check"
    CHECK (jsonb_typeof("skillResults") = 'object'),
  CONSTRAINT "PlacementAttempt_explanation_object_check"
    CHECK ("explanation" IS NULL OR jsonb_typeof("explanation") = 'object')
);

CREATE UNIQUE INDEX "PlacementAttempt_learnerId_clientAttemptId_key"
  ON "PlacementAttempt"("learnerId", "clientAttemptId");
CREATE UNIQUE INDEX "PlacementAttempt_learningSessionId_key"
  ON "PlacementAttempt"("learningSessionId");
CREATE UNIQUE INDEX "PlacementAttempt_learningSessionId_learnerId_lessonVersionId_key"
  ON "PlacementAttempt"("learningSessionId", "learnerId", "lessonVersionId");
CREATE INDEX "PlacementAttempt_learnerId_status_updatedAt_idx"
  ON "PlacementAttempt"("learnerId", "status", "updatedAt");
CREATE INDEX "PlacementAttempt_lessonVersionId_idx"
  ON "PlacementAttempt"("lessonVersionId");

ALTER TABLE "PlacementAttempt"
  ADD CONSTRAINT "PlacementAttempt_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementAttempt"
  ADD CONSTRAINT "PlacementAttempt_learningSessionId_learnerId_lessonVersionId_fkey"
  FOREIGN KEY ("learningSessionId", "learnerId", "lessonVersionId")
  REFERENCES "LearningSession"("id", "learnerId", "lessonVersionId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlacementAttempt"
  ADD CONSTRAINT "PlacementAttempt_lessonVersionId_fkey"
  FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
