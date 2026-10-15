BEGIN;

CREATE TABLE "IeltsMockTest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "draftRevision" INTEGER NOT NULL DEFAULT 1, "draftContent" JSONB NOT NULL, "currentPublishedVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IeltsMockTest_pkey" PRIMARY KEY ("id"), CONSTRAINT "IeltsMockTest_revision_check" CHECK ("draftRevision" > 0)
);
CREATE TABLE "IeltsMockTestVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "mockTestId" UUID NOT NULL, "version" INTEGER NOT NULL, "sourceHash" TEXT NOT NULL,
  "content" JSONB NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED', "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "archivedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsMockTestVersion_pkey" PRIMARY KEY ("id"), CONSTRAINT "IeltsMockTestVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "IeltsMockTestVersion_status_check" CHECK ("status" IN ('PUBLISHED','ARCHIVED'))
);
CREATE TABLE "IeltsMockAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "learnerId" UUID NOT NULL, "clientAttemptId" UUID NOT NULL, "mockTestVersionId" UUID NOT NULL,
  "mode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS', "currentSection" TEXT NOT NULL DEFAULT 'LISTENING', "revision" INTEGER NOT NULL DEFAULT 1,
  "responses" JSONB NOT NULL DEFAULT '{}', "submittedSections" JSONB NOT NULL DEFAULT '[]', "objectiveScore" JSONB, "productiveEvaluation" JSONB, "reportSnapshot" JSONB,
  "sectionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sectionDeadlineAt" TIMESTAMP(3) NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IeltsMockAttempt_pkey" PRIMARY KEY ("id"), CONSTRAINT "IeltsMockAttempt_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "IeltsMockAttempt_mode_check" CHECK ("mode" IN ('LEARNING','PRACTICE','EXAM_SIMULATION')),
  CONSTRAINT "IeltsMockAttempt_status_check" CHECK ("status" IN ('IN_PROGRESS','SUBMITTED','EVALUATION_PENDING','COMPLETED')),
  CONSTRAINT "IeltsMockAttempt_section_check" CHECK ("currentSection" IN ('LISTENING','READING','WRITING','SPEAKING','COMPLETE'))
);
CREATE TABLE "IeltsMockReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "attemptId" UUID NOT NULL, "reviewerId" UUID NOT NULL, "attemptRevision" INTEGER NOT NULL,
  "evaluation" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IeltsMockReview_pkey" PRIMARY KEY ("id"), CONSTRAINT "IeltsMockReview_revision_check" CHECK ("attemptRevision" > 0)
);

CREATE UNIQUE INDEX "IeltsMockTest_slug_key" ON "IeltsMockTest"("slug");
CREATE UNIQUE INDEX "IeltsMockTest_currentPublishedVersionId_key" ON "IeltsMockTest"("currentPublishedVersionId");
CREATE UNIQUE INDEX "IeltsMockTestVersion_mockTestId_version_key" ON "IeltsMockTestVersion"("mockTestId","version");
CREATE UNIQUE INDEX "IeltsMockTestVersion_id_mockTestId_key" ON "IeltsMockTestVersion"("id","mockTestId");
CREATE INDEX "IeltsMockTestVersion_status_publishedAt_idx" ON "IeltsMockTestVersion"("status","publishedAt");
CREATE UNIQUE INDEX "IeltsMockAttempt_learnerId_clientAttemptId_key" ON "IeltsMockAttempt"("learnerId","clientAttemptId");
CREATE INDEX "IeltsMockAttempt_learnerId_status_updatedAt_idx" ON "IeltsMockAttempt"("learnerId","status","updatedAt");
CREATE INDEX "IeltsMockAttempt_mockTestVersionId_idx" ON "IeltsMockAttempt"("mockTestVersionId");
CREATE UNIQUE INDEX "IeltsMockReview_attemptId_attemptRevision_key" ON "IeltsMockReview"("attemptId","attemptRevision");
CREATE INDEX "IeltsMockReview_reviewerId_createdAt_idx" ON "IeltsMockReview"("reviewerId","createdAt");

ALTER TABLE "IeltsMockTestVersion" ADD CONSTRAINT "IeltsMockTestVersion_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "IeltsMockTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsMockTest" ADD CONSTRAINT "IeltsMockTest_currentPublishedVersionId_id_fkey" FOREIGN KEY ("currentPublishedVersionId","id") REFERENCES "IeltsMockTestVersion"("id","mockTestId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsMockAttempt" ADD CONSTRAINT "IeltsMockAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IeltsMockAttempt" ADD CONSTRAINT "IeltsMockAttempt_mockTestVersionId_fkey" FOREIGN KEY ("mockTestVersionId") REFERENCES "IeltsMockTestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsMockReview" ADD CONSTRAINT "IeltsMockReview_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "IeltsMockAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsMockReview" ADD CONSTRAINT "IeltsMockReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_ielts_mock_test_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published IELTS mock cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."mockTestId" IS DISTINCT FROM OLD."mockTestId" OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash" OR NEW."content" IS DISTINCT FROM OLD."content" OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
    RAISE EXCEPTION 'Published IELTS mock is immutable'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "IeltsMockTestVersion_immutable" BEFORE UPDATE OR DELETE ON "IeltsMockTestVersion" FOR EACH ROW EXECUTE FUNCTION protect_ielts_mock_test_version();

COMMIT;
