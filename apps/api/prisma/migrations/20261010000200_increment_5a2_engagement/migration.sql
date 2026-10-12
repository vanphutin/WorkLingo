-- AlterTable
ALTER TABLE "LearnerProfile" ADD COLUMN "weeklyTargetDays" INTEGER NOT NULL DEFAULT 3;

-- CreateEnum
CREATE TYPE "EngagementWeekStatus" AS ENUM ('ACTIVE', 'MET', 'MISSED');

-- CreateTable
CREATE TABLE "LearnerStudyDay" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "dateKey" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "completedSessionCount" INTEGER NOT NULL DEFAULT 0,
    "firstCompletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCompletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerStudyDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerStudySession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "studyDayId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerStudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerEngagementWeek" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "weekStartKey" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "targetDays" INTEGER NOT NULL,
    "status" "EngagementWeekStatus" NOT NULL DEFAULT 'ACTIVE',
    "metAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerEngagementWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearnerStudyDay_learnerId_dateKey_key" ON "LearnerStudyDay"("learnerId", "dateKey");

-- CreateIndex
CREATE INDEX "LearnerStudyDay_learnerId_dateKey_idx" ON "LearnerStudyDay"("learnerId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerStudySession_sessionId_key" ON "LearnerStudySession"("sessionId");

-- CreateIndex
CREATE INDEX "LearnerStudySession_learnerId_studyDayId_idx" ON "LearnerStudySession"("learnerId", "studyDayId");

-- CreateIndex
CREATE INDEX "LearnerStudySession_studyDayId_idx" ON "LearnerStudySession"("studyDayId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerEngagementWeek_learnerId_weekStartKey_key" ON "LearnerEngagementWeek"("learnerId", "weekStartKey");

-- CreateIndex
CREATE INDEX "LearnerEngagementWeek_learnerId_weekStartKey_idx" ON "LearnerEngagementWeek"("learnerId", "weekStartKey");

-- CreateIndex
CREATE INDEX "LearnerEngagementWeek_learnerId_status_idx" ON "LearnerEngagementWeek"("learnerId", "status");

-- AddForeignKey
ALTER TABLE "LearnerStudyDay" ADD CONSTRAINT "LearnerStudyDay_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerStudySession" ADD CONSTRAINT "LearnerStudySession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerStudySession" ADD CONSTRAINT "LearnerStudySession_studyDayId_fkey" FOREIGN KEY ("studyDayId") REFERENCES "LearnerStudyDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerStudySession" ADD CONSTRAINT "LearnerStudySession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerEngagementWeek" ADD CONSTRAINT "LearnerEngagementWeek_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
