BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "LearnerProfile" p
    JOIN "User" u ON u."id" = p."userId"
    LEFT JOIN "Level" l ON l."code" = p."currentLevelCode"
    LEFT JOIN "LearningPath" lp ON lp."id" = l."pathId"
    WHERE p."onboardingStatus" = 'COMPLETE' AND u."role" = 'LEARNER'
      AND (l."id" IS NULL OR lp."programId" <> '10000000-0000-4000-8000-000000000002'::uuid)
  ) THEN
    RAISE EXCEPTION 'Cannot migrate program enrollment: complete learner level is missing or outside Intermediate';
  END IF;
END $$;

ALTER TABLE "LearnerProfile" ADD COLUMN "activeProgramId" UUID;

CREATE TABLE "LearnerProgramEnrollment" (
  "id" UUID NOT NULL,
  "learnerId" UUID NOT NULL,
  "programId" UUID NOT NULL,
  "currentLevelId" UUID,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerProgramEnrollment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnerProgramEnrollment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LearnerProgramEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LearningProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearnerProgramEnrollment_currentLevelId_fkey" FOREIGN KEY ("currentLevelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LearnerProgramEnrollment_learnerId_programId_key" ON "LearnerProgramEnrollment"("learnerId", "programId");
CREATE INDEX "LearnerProgramEnrollment_programId_idx" ON "LearnerProgramEnrollment"("programId");
CREATE INDEX "LearnerProgramEnrollment_currentLevelId_idx" ON "LearnerProgramEnrollment"("currentLevelId");
CREATE INDEX "LearnerProfile_activeProgramId_idx" ON "LearnerProfile"("activeProgramId");
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_activeProgramId_fkey" FOREIGN KEY ("activeProgramId") REFERENCES "LearningProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "LearnerProgramEnrollment" ("id", "learnerId", "programId", "currentLevelId", "updatedAt")
SELECT gen_random_uuid(), p."userId", '10000000-0000-4000-8000-000000000002'::uuid, l."id", CURRENT_TIMESTAMP
FROM "LearnerProfile" p
JOIN "User" u ON u."id" = p."userId"
JOIN "Level" l ON l."code" = p."currentLevelCode"
WHERE p."onboardingStatus" = 'COMPLETE' AND u."role" = 'LEARNER';

UPDATE "LearnerProfile" p
SET "activeProgramId" = e."programId"
FROM "LearnerProgramEnrollment" e WHERE e."learnerId" = p."userId";

COMMIT;
