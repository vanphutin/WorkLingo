BEGIN;

CREATE TABLE "IeltsBandCurriculum" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL DEFAULT 'ielts-band-pathway',
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "draftContent" JSONB NOT NULL,
  "currentPublishedVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IeltsBandCurriculum_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsBandCurriculum_draftRevision_check" CHECK ("draftRevision" > 0)
);

CREATE TABLE "IeltsBandCurriculumVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "curriculumId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsBandCurriculumVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsBandCurriculumVersion_version_check" CHECK ("version" > 0),
  CONSTRAINT "IeltsBandCurriculumVersion_status_check" CHECK ("status" IN ('PUBLISHED', 'ARCHIVED'))
);

CREATE TABLE "IeltsBandJourney" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "clientJourneyId" UUID NOT NULL,
  "curriculumVersionId" UUID NOT NULL,
  "currentStageCode" TEXT NOT NULL,
  "targetBand" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "evidenceSnapshot" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IeltsBandJourney_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsBandJourney_targetBand_check" CHECK ("targetBand" BETWEEN 3 AND 9),
  CONSTRAINT "IeltsBandJourney_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "IeltsBandJourney_stage_check" CHECK ("currentStageCode" IN ('foundation_to_3','band_3_to_4','band_4_to_5','band_5_to_6','band_6_to_7','band_7_to_8','band_8_to_9'))
);

CREATE UNIQUE INDEX "IeltsBandCurriculum_slug_key" ON "IeltsBandCurriculum"("slug");
CREATE UNIQUE INDEX "IeltsBandCurriculum_currentPublishedVersionId_key" ON "IeltsBandCurriculum"("currentPublishedVersionId");
CREATE UNIQUE INDEX "IeltsBandCurriculumVersion_curriculumId_version_key" ON "IeltsBandCurriculumVersion"("curriculumId", "version");
CREATE UNIQUE INDEX "IeltsBandCurriculumVersion_id_curriculumId_key" ON "IeltsBandCurriculumVersion"("id", "curriculumId");
CREATE INDEX "IeltsBandCurriculumVersion_status_publishedAt_idx" ON "IeltsBandCurriculumVersion"("status", "publishedAt");
CREATE UNIQUE INDEX "IeltsBandJourney_learnerId_key" ON "IeltsBandJourney"("learnerId");
CREATE UNIQUE INDEX "IeltsBandJourney_learnerId_clientJourneyId_key" ON "IeltsBandJourney"("learnerId", "clientJourneyId");
CREATE INDEX "IeltsBandJourney_curriculumVersionId_idx" ON "IeltsBandJourney"("curriculumVersionId");
CREATE INDEX "IeltsBandJourney_currentStageCode_completedAt_idx" ON "IeltsBandJourney"("currentStageCode", "completedAt");

ALTER TABLE "IeltsBandCurriculumVersion" ADD CONSTRAINT "IeltsBandCurriculumVersion_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "IeltsBandCurriculum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsBandCurriculum" ADD CONSTRAINT "IeltsBandCurriculum_currentPublishedVersionId_id_fkey" FOREIGN KEY ("currentPublishedVersionId", "id") REFERENCES "IeltsBandCurriculumVersion"("id", "curriculumId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsBandJourney" ADD CONSTRAINT "IeltsBandJourney_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IeltsBandJourney" ADD CONSTRAINT "IeltsBandJourney_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "IeltsBandCurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_ielts_band_curriculum_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published IELTS band curriculum cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."curriculumId" IS DISTINCT FROM OLD."curriculumId"
    OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash"
    OR NEW."content" IS DISTINCT FROM OLD."content" OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
    RAISE EXCEPTION 'Published IELTS band curriculum is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "IeltsBandCurriculumVersion_immutable" BEFORE UPDATE OR DELETE ON "IeltsBandCurriculumVersion"
FOR EACH ROW EXECUTE FUNCTION protect_ielts_band_curriculum_version();

COMMIT;
