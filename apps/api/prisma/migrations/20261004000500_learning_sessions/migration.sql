CREATE TYPE "LearningSessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED');
CREATE TYPE "SessionBlockStatus" AS ENUM ('AVAILABLE', 'COMPLETED');
CREATE TYPE "AttemptEvaluationStatus" AS ENUM ('SUBMITTED', 'EVALUATED');

CREATE TABLE "LearningSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "clientSessionId" UUID NOT NULL,
  "missionId" UUID NOT NULL,
  "lessonVersionId" UUID NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "planSnapshot" JSONB NOT NULL,
  "status" "LearningSessionStatus" NOT NULL DEFAULT 'PLANNED',
  "currentCheckpoint" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningSession_duration_check" CHECK ("durationMinutes" = 60),
  CONSTRAINT "LearningSession_checkpoint_check" CHECK ("currentCheckpoint" >= 0)
);

CREATE TABLE "SessionBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "type" "LearningBlockType" NOT NULL,
  "order" INTEGER NOT NULL,
  "targetMinutes" INTEGER NOT NULL,
  "activityIds" UUID[] NOT NULL,
  "status" "SessionBlockStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessionBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionBlock_order_check" CHECK ("order" BETWEEN 1 AND 4),
  CONSTRAINT "SessionBlock_minutes_check" CHECK ("targetMinutes" = 15)
);

CREATE TABLE "ActivityAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "activityId" UUID NOT NULL,
  "clientAttemptId" UUID NOT NULL,
  "rawResponse" JSONB NOT NULL,
  "normalizedResponse" JSONB,
  "evaluationStatus" "AttemptEvaluationStatus" NOT NULL,
  "score" DOUBLE PRECISION,
  "feedback" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivityAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityAttempt_score_check" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 1))
);

CREATE UNIQUE INDEX "LearningSession_learnerId_clientSessionId_key" ON "LearningSession"("learnerId", "clientSessionId");
CREATE UNIQUE INDEX "LearningSession_id_learnerId_key" ON "LearningSession"("id", "learnerId");
CREATE INDEX "LearningSession_learnerId_status_createdAt_idx" ON "LearningSession"("learnerId", "status", "createdAt");
CREATE INDEX "LearningSession_missionId_idx" ON "LearningSession"("missionId");
CREATE INDEX "LearningSession_lessonVersionId_idx" ON "LearningSession"("lessonVersionId");
CREATE UNIQUE INDEX "SessionBlock_sessionId_order_key" ON "SessionBlock"("sessionId", "order");
CREATE UNIQUE INDEX "ActivityAttempt_learnerId_clientAttemptId_key" ON "ActivityAttempt"("learnerId", "clientAttemptId");
CREATE INDEX "ActivityAttempt_sessionId_idx" ON "ActivityAttempt"("sessionId");
CREATE INDEX "ActivityAttempt_activityId_idx" ON "ActivityAttempt"("activityId");
CREATE INDEX "ActivityAttempt_sessionId_activityId_idx" ON "ActivityAttempt"("sessionId", "activityId");

ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_lessonVersionId_fkey"
  FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_sessionId_learnerId_fkey"
  FOREIGN KEY ("sessionId", "learnerId") REFERENCES "LearningSession"("id", "learnerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
