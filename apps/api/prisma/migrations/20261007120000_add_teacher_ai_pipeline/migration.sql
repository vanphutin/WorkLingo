-- Expand learner-attempt and durable-job state machines without rewriting existing rows.
ALTER TYPE "AttemptEvaluationStatus" ADD VALUE IF NOT EXISTS 'QUEUED' BEFORE 'EVALUATED';
ALTER TYPE "AttemptEvaluationStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' BEFORE 'EVALUATED';
ALTER TYPE "AttemptEvaluationStatus" ADD VALUE IF NOT EXISTS 'EVALUATION_FAILED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'RETRY_WAIT' BEFORE 'COMPLETED';

CREATE TYPE "JobAttemptOutcome" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "Job"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "resourceType" TEXT,
  ADD COLUMN "resourceId" TEXT,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "retryable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "errorSummary" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

-- Existing Increment 2 jobs receive stable, deterministic identities before uniqueness is enforced.
UPDATE "Job"
SET "idempotencyKey" = 'legacy:' || "id"::text
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "Job"
  ALTER COLUMN "idempotencyKey" SET NOT NULL,
  ALTER COLUMN "idempotencyKey" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_attempt_bounds_check"
  CHECK ("attemptCount" >= 0 AND "maxAttempts" >= 1 AND "attemptCount" <= "maxAttempts");

CREATE TABLE "Recording" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "activityId" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "durationSeconds" DOUBLE PRECISION,
  "consentPolicyVersion" TEXT NOT NULL,
  "consentScope" TEXT NOT NULL,
  "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
  "transcript" TEXT,
  "speechMetrics" JSONB,
  "providerName" TEXT,
  "providerConfigVersion" TEXT,
  "retentionUntil" TIMESTAMP(3),
  "deletionRequestedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recording_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Recording_byte_size_check" CHECK ("byteSize" > 0),
  CONSTRAINT "Recording_duration_check" CHECK ("durationSeconds" IS NULL OR "durationSeconds" > 0)
);

CREATE TABLE "EvaluationResult" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "lessonVersionId" UUID NOT NULL,
  "rubricId" TEXT NOT NULL,
  "rubricVersion" TEXT NOT NULL,
  "inputHash" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "providerModel" TEXT,
  "providerConfigVersion" TEXT NOT NULL,
  "scores" JSONB NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "feedback" JSONB NOT NULL,
  "speechMetricsProvenance" JSONB,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EvaluationResult_score_check" CHECK ("score" >= 0 AND "score" <= 1)
);

CREATE TABLE "ActivityDraft" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "activityId" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivityDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ActivityDraft_revision_check" CHECK ("revision" >= 1)
);

CREATE TABLE "JobAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "outcome" "JobAttemptOutcome" NOT NULL DEFAULT 'RUNNING',
  "providerName" TEXT,
  "providerModel" TEXT,
  "configVersion" TEXT,
  "httpStatus" INTEGER,
  "errorCode" TEXT,
  "errorSummary" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "JobAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JobAttempt_number_check" CHECK ("attemptNumber" >= 1)
);

CREATE UNIQUE INDEX "Recording_attemptId_key" ON "Recording"("attemptId");
CREATE UNIQUE INDEX "Recording_storageKey_key" ON "Recording"("storageKey");
CREATE INDEX "Recording_learnerId_createdAt_idx" ON "Recording"("learnerId", "createdAt");
CREATE INDEX "Recording_sessionId_learnerId_idx" ON "Recording"("sessionId", "learnerId");
CREATE INDEX "Recording_activityId_idx" ON "Recording"("activityId");
CREATE INDEX "Recording_retentionUntil_deletedAt_idx" ON "Recording"("retentionUntil", "deletedAt");

CREATE UNIQUE INDEX "EvaluationResult_attemptId_rubricVersion_key" ON "EvaluationResult"("attemptId", "rubricVersion");
CREATE INDEX "EvaluationResult_attemptId_createdAt_idx" ON "EvaluationResult"("attemptId", "createdAt");
CREATE INDEX "EvaluationResult_lessonVersionId_idx" ON "EvaluationResult"("lessonVersionId");
CREATE INDEX "EvaluationResult_completedAt_idx" ON "EvaluationResult"("completedAt");

CREATE UNIQUE INDEX "ActivityDraft_learnerId_sessionId_activityId_key" ON "ActivityDraft"("learnerId", "sessionId", "activityId");
CREATE INDEX "ActivityDraft_sessionId_learnerId_idx" ON "ActivityDraft"("sessionId", "learnerId");
CREATE INDEX "ActivityDraft_activityId_idx" ON "ActivityDraft"("activityId");
CREATE INDEX "ActivityDraft_expiresAt_idx" ON "ActivityDraft"("expiresAt");

CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");
CREATE INDEX "Job_status_availableAt_leaseExpiresAt_idx" ON "Job"("status", "availableAt", "leaseExpiresAt");
CREATE INDEX "Job_resourceType_resourceId_idx" ON "Job"("resourceType", "resourceId");

CREATE UNIQUE INDEX "JobAttempt_jobId_attemptNumber_key" ON "JobAttempt"("jobId", "attemptNumber");
CREATE INDEX "JobAttempt_jobId_startedAt_idx" ON "JobAttempt"("jobId", "startedAt");

ALTER TABLE "Recording" ADD CONSTRAINT "Recording_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_sessionId_learnerId_fkey"
  FOREIGN KEY ("sessionId", "learnerId") REFERENCES "LearningSession"("id", "learnerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ActivityAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ActivityAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_lessonVersionId_fkey"
  FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivityDraft" ADD CONSTRAINT "ActivityDraft_learnerId_fkey"
  FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityDraft" ADD CONSTRAINT "ActivityDraft_sessionId_learnerId_fkey"
  FOREIGN KEY ("sessionId", "learnerId") REFERENCES "LearningSession"("id", "learnerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityDraft" ADD CONSTRAINT "ActivityDraft_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobAttempt" ADD CONSTRAINT "JobAttempt_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
