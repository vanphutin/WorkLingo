-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('ACTIVITY_INCORRECT');

-- CreateEnum
CREATE TYPE "EvidenceGranularity" AS ENUM ('ACTIVITY');

-- CreateTable
CREATE TABLE "ErrorBankEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "masteryEventId" UUID NOT NULL,
    "languageBlockId" UUID NOT NULL,
    "skill" "ActivityType" NOT NULL,
    "errorType" "ErrorType" NOT NULL DEFAULT 'ACTIVITY_INCORRECT',
    "evidenceGranularity" "EvidenceGranularity" NOT NULL DEFAULT 'ACTIVITY',
    "lessonVersionId" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "activitySlug" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorBankEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorBankEntry_masteryEventId_key" ON "ErrorBankEntry"("masteryEventId");

-- CreateIndex
CREATE INDEX "ErrorBankEntry_learnerId_skill_idx" ON "ErrorBankEntry"("learnerId", "skill");

-- CreateIndex
CREATE INDEX "ErrorBankEntry_learnerId_languageBlockId_idx" ON "ErrorBankEntry"("learnerId", "languageBlockId");

-- CreateIndex
CREATE INDEX "ErrorBankEntry_learnerId_contextKey_idx" ON "ErrorBankEntry"("learnerId", "contextKey");

-- CreateIndex
CREATE INDEX "ErrorBankEntry_occurredAt_idx" ON "ErrorBankEntry"("occurredAt");

-- AddForeignKey
ALTER TABLE "ErrorBankEntry" ADD CONSTRAINT "ErrorBankEntry_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorBankEntry" ADD CONSTRAINT "ErrorBankEntry_masteryEventId_fkey" FOREIGN KEY ("masteryEventId") REFERENCES "MasteryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorBankEntry" ADD CONSTRAINT "ErrorBankEntry_languageBlockId_fkey" FOREIGN KEY ("languageBlockId") REFERENCES "LanguageBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorBankEntry" ADD CONSTRAINT "ErrorBankEntry_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorBankEntry" ADD CONSTRAINT "ErrorBankEntry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing INCORRECT_ATTEMPT events
INSERT INTO "ErrorBankEntry" (
    "id",
    "learnerId",
    "masteryEventId",
    "languageBlockId",
    "skill",
    "errorType",
    "evidenceGranularity",
    "lessonVersionId",
    "activityId",
    "activitySlug",
    "contextKey",
    "occurredAt",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    me."learnerId",
    me."id",
    me."languageBlockId",
    me."skill",
    'ACTIVITY_INCORRECT'::"ErrorType",
    'ACTIVITY'::"EvidenceGranularity",
    me."lessonVersionId",
    aa."activityId",
    a."slug",
    CONCAT(lv."lessonId", ':', a."slug"),
    me."createdAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "MasteryEvent" me
JOIN "ActivityAttempt" aa ON aa."id" = me."attemptId"
JOIN "Activity" a ON a."id" = aa."activityId"
JOIN "LessonVersion" lv ON lv."id" = me."lessonVersionId"
WHERE me."eventType" = 'INCORRECT_ATTEMPT'
ON CONFLICT ("masteryEventId") DO NOTHING;