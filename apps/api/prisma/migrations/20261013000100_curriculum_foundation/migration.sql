BEGIN;
CREATE TABLE "CurriculumDefinition" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "missionId" UUID NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
 "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "content" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 PRIMARY KEY ("id"), FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CurriculumDefinition_missionId_key" ON "CurriculumDefinition"("missionId");
CREATE TABLE "CurriculumRevision" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "missionId" UUID NOT NULL,
 "revision" INTEGER NOT NULL CHECK ("revision">0), "snapshot" JSONB NOT NULL,
 "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED' CHECK ("status" IN ('PUBLISHED','ARCHIVED')),
 "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "archivedAt" TIMESTAMP(3),
 PRIMARY KEY ("id"), FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CurriculumRevision_missionId_revision_key" ON "CurriculumRevision"("missionId","revision");
CREATE INDEX "CurriculumRevision_missionId_status_idx" ON "CurriculumRevision"("missionId","status");
CREATE TABLE "CurriculumRevisionLesson" (
 "curriculumRevisionId" UUID NOT NULL, "lessonVersionId" UUID NOT NULL, "order" INTEGER NOT NULL CHECK ("order">0),
 PRIMARY KEY ("curriculumRevisionId","lessonVersionId"),
 FOREIGN KEY ("curriculumRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CurriculumRevisionLesson_curriculumRevisionId_order_key" ON "CurriculumRevisionLesson"("curriculumRevisionId","order");
CREATE INDEX "CurriculumRevisionLesson_lessonVersionId_idx" ON "CurriculumRevisionLesson"("lessonVersionId");
CREATE TABLE "CurriculumPrerequisite" (
 "curriculumRevisionId" UUID NOT NULL, "prerequisiteRevisionId" UUID NOT NULL,
 PRIMARY KEY ("curriculumRevisionId","prerequisiteRevisionId"), CHECK ("curriculumRevisionId"<>"prerequisiteRevisionId"),
 FOREIGN KEY ("curriculumRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("prerequisiteRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CurriculumPrerequisite_prerequisiteRevisionId_idx" ON "CurriculumPrerequisite"("prerequisiteRevisionId");
CREATE TABLE "CurriculumCompletion" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "enrollmentId" UUID NOT NULL, "curriculumRevisionId" UUID NOT NULL,
 "policyVersion" TEXT NOT NULL, "evidenceSnapshot" JSONB NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("id"),
 FOREIGN KEY ("enrollmentId") REFERENCES "LearnerProgramEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("curriculumRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CurriculumCompletion_enrollmentId_curriculumRevisionId_key" ON "CurriculumCompletion"("enrollmentId","curriculumRevisionId");
CREATE INDEX "CurriculumCompletion_curriculumRevisionId_idx" ON "CurriculumCompletion"("curriculumRevisionId");
ALTER TABLE "LearningSession" ADD COLUMN "curriculumRevisionId" UUID;
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_curriculumRevisionId_fkey" FOREIGN KEY ("curriculumRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LearningSession_curriculumRevisionId_idx" ON "LearningSession"("curriculumRevisionId");

CREATE FUNCTION protect_curriculum_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."missionId" IS DISTINCT FROM OLD."missionId"
 OR NEW."revision" IS DISTINCT FROM OLD."revision" OR NEW."snapshot" IS DISTINCT FROM OLD."snapshot"
 OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
  RAISE EXCEPTION 'Published curriculum snapshot is immutable';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "CurriculumRevision_immutable" BEFORE UPDATE ON "CurriculumRevision" FOR EACH ROW EXECUTE FUNCTION protect_curriculum_revision();
COMMIT;
