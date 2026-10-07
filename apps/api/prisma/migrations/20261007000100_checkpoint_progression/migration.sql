ALTER TABLE "LearnerProfile" ADD COLUMN "currentLevelCode" TEXT NOT NULL DEFAULT 'FOUNDATION_1';

CREATE TABLE "CheckpointAssessment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "clientAssessmentId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "lessonVersionId" UUID NOT NULL,
  "levelCode" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('not_ready', 'pending_evaluation', 'reinforcement_required', 'passed')),
  "skills" JSONB NOT NULL,
  "reinforcement" JSONB NOT NULL,
  "evidenceSnapshot" JSONB NOT NULL,
  "canAdvance" BOOLEAN NOT NULL,
  "nextLevelCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckpointAssessment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CheckpointAssessment_sessionId_learnerId_fkey" FOREIGN KEY ("sessionId", "learnerId") REFERENCES "LearningSession"("id", "learnerId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CheckpointAssessment_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CheckpointAssessment_advance_check" CHECK (NOT "canAdvance" OR ("status" = 'passed' AND "nextLevelCode" IS NOT NULL))
);
CREATE UNIQUE INDEX "CheckpointAssessment_learnerId_clientAssessmentId_key" ON "CheckpointAssessment"("learnerId", "clientAssessmentId");
CREATE UNIQUE INDEX "CheckpointAssessment_id_learnerId_key" ON "CheckpointAssessment"("id", "learnerId");
CREATE INDEX "CheckpointAssessment_learnerId_levelCode_createdAt_idx" ON "CheckpointAssessment"("learnerId", "levelCode", "createdAt");
CREATE INDEX "CheckpointAssessment_sessionId_learnerId_idx" ON "CheckpointAssessment"("sessionId", "learnerId");
CREATE INDEX "CheckpointAssessment_lessonVersionId_idx" ON "CheckpointAssessment"("lessonVersionId");

CREATE TABLE "ProgressionConfirmation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "fromLevelCode" TEXT NOT NULL,
  "toLevelCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgressionConfirmation_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProgressionConfirmation_assessmentId_learnerId_fkey" FOREIGN KEY ("assessmentId", "learnerId") REFERENCES "CheckpointAssessment"("id", "learnerId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProgressionConfirmation_assessmentId_key" ON "ProgressionConfirmation"("assessmentId");
CREATE INDEX "ProgressionConfirmation_learnerId_idx" ON "ProgressionConfirmation"("learnerId");
CREATE UNIQUE INDEX "ProgressionConfirmation_assessmentId_learnerId_key" ON "ProgressionConfirmation"("assessmentId", "learnerId");

CREATE FUNCTION reject_checkpoint_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE learner_still_exists boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."User" WHERE "id" = $1)', TG_TABLE_SCHEMA)
      INTO learner_still_exists USING OLD."learnerId";
    IF NOT learner_still_exists THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'Checkpoint snapshots and confirmations are append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER checkpoint_assessment_append_only BEFORE UPDATE OR DELETE ON "CheckpointAssessment"
  FOR EACH ROW EXECUTE FUNCTION reject_checkpoint_snapshot_mutation();
CREATE TRIGGER progression_confirmation_append_only BEFORE UPDATE OR DELETE ON "ProgressionConfirmation"
  FOR EACH ROW EXECUTE FUNCTION reject_checkpoint_snapshot_mutation();
