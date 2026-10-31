-- Cohort range and release-session batches remain scoped before aggregation.
CREATE INDEX "LearnerProgramEnrollment_programId_createdAt_idx"
ON "LearnerProgramEnrollment" ("programId", "createdAt");
