-- CreateEnum
CREATE TYPE "MasteryState" AS ENUM ('NEW', 'LEARNING', 'REVIEW_DUE', 'STABLE', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "MasteryEventType" AS ENUM ('CORRECT_RECALL', 'ASSISTED_RECALL', 'INCORRECT_ATTEMPT', 'SUBMISSION_RECORDED');

-- CreateTable
CREATE TABLE "MasteryRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "languageBlockId" UUID NOT NULL,
    "skill" "ActivityType" NOT NULL,
    "state" "MasteryState" NOT NULL DEFAULT 'NEW',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "lastEvidenceAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "lastLessonVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasteryRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MasteryRecord_score_check" CHECK ("score" >= 0 AND "score" <= 1),
    CONSTRAINT "MasteryRecord_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1),
    CONSTRAINT "MasteryRecord_interval_check" CHECK ("intervalDays" > 0)
);

-- CreateTable
CREATE TABLE "MasteryEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "languageBlockId" UUID NOT NULL,
    "skill" "ActivityType" NOT NULL,
    "lessonVersionId" UUID NOT NULL,
    "masteryRecordId" UUID,
    "eventType" "MasteryEventType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasteryEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MasteryEvent_score_check" CHECK ("score" >= 0 AND "score" <= 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "MasteryRecord_learnerId_languageBlockId_skill_key" ON "MasteryRecord"("learnerId", "languageBlockId", "skill");

-- CreateIndex
CREATE INDEX "MasteryRecord_learnerId_state_nextReviewAt_idx" ON "MasteryRecord"("learnerId", "state", "nextReviewAt");

-- CreateIndex
CREATE INDEX "MasteryRecord_learnerId_skill_idx" ON "MasteryRecord"("learnerId", "skill");

-- CreateIndex
CREATE INDEX "MasteryRecord_languageBlockId_idx" ON "MasteryRecord"("languageBlockId");

-- CreateIndex
CREATE INDEX "MasteryRecord_nextReviewAt_idx" ON "MasteryRecord"("nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasteryEvent_attemptId_languageBlockId_skill_key" ON "MasteryEvent"("attemptId", "languageBlockId", "skill");

-- CreateIndex
CREATE INDEX "MasteryEvent_learnerId_createdAt_idx" ON "MasteryEvent"("learnerId", "createdAt");

-- CreateIndex
CREATE INDEX "MasteryEvent_languageBlockId_skill_idx" ON "MasteryEvent"("languageBlockId", "skill");

-- CreateIndex
CREATE INDEX "MasteryEvent_lessonVersionId_idx" ON "MasteryEvent"("lessonVersionId");

-- CreateIndex
CREATE INDEX "MasteryEvent_masteryRecordId_idx" ON "MasteryEvent"("masteryRecordId");

-- AddForeignKey
ALTER TABLE "MasteryRecord" ADD CONSTRAINT "MasteryRecord_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryRecord" ADD CONSTRAINT "MasteryRecord_languageBlockId_fkey" FOREIGN KEY ("languageBlockId") REFERENCES "LanguageBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryRecord" ADD CONSTRAINT "MasteryRecord_lastLessonVersionId_fkey" FOREIGN KEY ("lastLessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ActivityAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_languageBlockId_fkey" FOREIGN KEY ("languageBlockId") REFERENCES "LanguageBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_masteryRecordId_fkey" FOREIGN KEY ("masteryRecordId") REFERENCES "MasteryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
