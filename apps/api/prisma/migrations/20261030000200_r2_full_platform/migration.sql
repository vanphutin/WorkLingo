-- CreateEnum
CREATE TYPE "ProgramVersionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProgramVersionSource" AS ENUM ('AUTHORED', 'LEGACY_PIN_BACKFILL');

-- CreateEnum
CREATE TYPE "ProgramEnrollmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'COMPLETED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "LearnerProgramEnrollment" ADD COLUMN     "programVersionId" UUID,
ADD COLUMN     "status" "ProgramEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "ProgramVersion" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "ProgramVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "ProgramVersionSource" NOT NULL DEFAULT 'AUTHORED',
    "snapshot" JSONB NOT NULL,
    "policy" JSONB NOT NULL,
    "curriculumRevisionIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramVersionCurriculum" (
    "programVersionId" UUID NOT NULL,
    "curriculumRevisionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProgramVersionCurriculum_pkey" PRIMARY KEY ("programVersionId","curriculumRevisionId")
);

-- CreateTable
CREATE TABLE "EnrollmentEvent" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "actorId" UUID,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "previousState" JSONB,
    "nextState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionSnapshot" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "projection" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramReview" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "curriculumRevisionId" UUID NOT NULL,
    "lessonVersionId" UUID NOT NULL,
    "scheduleVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramReviewEvent" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "learningSessionId" UUID,
    "revision" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "previousState" JSONB,
    "nextState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramVersion_programId_status_version_idx" ON "ProgramVersion"("programId", "status", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersion_programId_version_key" ON "ProgramVersion"("programId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersion_id_programId_key" ON "ProgramVersion"("id", "programId");

-- CreateIndex
CREATE INDEX "ProgramVersionCurriculum_curriculumRevisionId_idx" ON "ProgramVersionCurriculum"("curriculumRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersionCurriculum_programVersionId_order_key" ON "ProgramVersionCurriculum"("programVersionId", "order");

-- CreateIndex
CREATE INDEX "EnrollmentEvent_enrollmentId_createdAt_idx" ON "EnrollmentEvent"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "EnrollmentEvent_actorId_idx" ON "EnrollmentEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentEvent_enrollmentId_revision_key" ON "EnrollmentEvent"("enrollmentId", "revision");

-- CreateIndex
CREATE INDEX "ProgressionSnapshot_enrollmentId_createdAt_idx" ON "ProgressionSnapshot"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressionSnapshot_programVersionId_createdAt_idx" ON "ProgressionSnapshot"("programVersionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionSnapshot_enrollmentId_revision_key" ON "ProgressionSnapshot"("enrollmentId", "revision");

-- CreateIndex
CREATE INDEX "ProgramReview_enrollmentId_dueAt_idx" ON "ProgramReview"("enrollmentId", "dueAt");

-- CreateIndex
CREATE INDEX "ProgramReview_curriculumRevisionId_lessonVersionId_idx" ON "ProgramReview"("curriculumRevisionId", "lessonVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramReview_enrollmentId_curriculumRevisionId_lessonVersi_key" ON "ProgramReview"("enrollmentId", "curriculumRevisionId", "lessonVersionId");

-- CreateIndex
CREATE INDEX "ProgramReviewEvent_learningSessionId_idx" ON "ProgramReviewEvent"("learningSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramReviewEvent_reviewId_revision_key" ON "ProgramReviewEvent"("reviewId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramReviewEvent_reviewId_learningSessionId_key" ON "ProgramReviewEvent"("reviewId", "learningSessionId");

-- CreateIndex
CREATE INDEX "LearnerProgramEnrollment_programVersionId_programId_idx" ON "LearnerProgramEnrollment"("programVersionId", "programId");

-- CreateIndex
CREATE INDEX "LearnerProgramEnrollment_programId_status_idx" ON "LearnerProgramEnrollment"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProgramEnrollment_id_programVersionId_key" ON "LearnerProgramEnrollment"("id", "programVersionId");

-- AddForeignKey
ALTER TABLE "LearnerProgramEnrollment" ADD CONSTRAINT "LearnerProgramEnrollment_programVersionId_programId_fkey" FOREIGN KEY ("programVersionId", "programId") REFERENCES "ProgramVersion"("id", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LearningProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersionCurriculum" ADD CONSTRAINT "ProgramVersionCurriculum_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersionCurriculum" ADD CONSTRAINT "ProgramVersionCurriculum_curriculumRevisionId_fkey" FOREIGN KEY ("curriculumRevisionId") REFERENCES "CurriculumRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentEvent" ADD CONSTRAINT "EnrollmentEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearnerProgramEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentEvent" ADD CONSTRAINT "EnrollmentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionSnapshot" ADD CONSTRAINT "ProgressionSnapshot_enrollmentId_programVersionId_fkey" FOREIGN KEY ("enrollmentId", "programVersionId") REFERENCES "LearnerProgramEnrollment"("id", "programVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionSnapshot" ADD CONSTRAINT "ProgressionSnapshot_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReview" ADD CONSTRAINT "ProgramReview_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearnerProgramEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReview" ADD CONSTRAINT "ProgramReview_curriculumRevisionId_lessonVersionId_fkey" FOREIGN KEY ("curriculumRevisionId", "lessonVersionId") REFERENCES "CurriculumRevisionLesson"("curriculumRevisionId", "lessonVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReviewEvent" ADD CONSTRAINT "ProgramReviewEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ProgramReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramReviewEvent" ADD CONSTRAINT "ProgramReviewEvent_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "LearningSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Available metadata is captured now. This does not reconstruct historical program copy.
DO $$
DECLARE pins RECORD; release_id UUID; ordinal INTEGER; policy_json JSONB; captured TIMESTAMP(3) := CURRENT_TIMESTAMP;
BEGIN
  FOR pins IN
    SELECT p."id" AS program_id, p."curriculumRevisionIds" AS ids
      FROM "LearningProgram" p WHERE p."slug" NOT IN ('beginner','intermediate','ielts','toeic') AND cardinality(p."curriculumRevisionIds") > 0
    UNION
    SELECT e."programId", e."curriculumRevisionIds" FROM "LearnerProgramEnrollment" e JOIN "LearningProgram" p ON p."id" = e."programId"
      WHERE p."slug" NOT IN ('beginner','intermediate','ielts','toeic') AND cardinality(e."curriculumRevisionIds") > 0
    ORDER BY 1, 2
  LOOP
    IF cardinality(pins.ids) <> (SELECT count(DISTINCT x) FROM unnest(pins.ids) x)
      OR EXISTS (SELECT 1 FROM unnest(pins.ids) x LEFT JOIN "CurriculumRevision" cr ON cr."id" = x LEFT JOIN "Mission" m ON m."id" = cr."missionId" LEFT JOIN "Level" l ON l."id" = m."levelId" LEFT JOIN "LearningPath" p ON p."id" = l."pathId" WHERE cr."id" IS NULL OR p."programId" IS DISTINCT FROM pins.program_id)
    THEN RAISE EXCEPTION 'Cannot backfill unresolved or duplicate legacy curriculum pins for program %', pins.program_id; END IF;
    release_id := gen_random_uuid();
    SELECT coalesce(max("version"),0) + 1 INTO ordinal FROM "ProgramVersion" WHERE "programId" = pins.program_id;
    SELECT jsonb_build_object('version',1,'sequential',jsonb_build_object('stages',false,'units',false,'lessons',false),
      'completion',jsonb_build_object('requiredActivityRatio',1),
      'mastery',jsonb_build_object('required',p."progressionPolicy" = 'MASTERY','threshold',0.8,'minimumQualifiedAttempts',1),
      'retry',jsonb_build_object('maxAttempts',100,'cooldownMinutes',0),'remediation',jsonb_build_object('enabled',false,'afterAttempts',1),
      'review',jsonb_build_object('scheduleVersion','legacy-capture-v1','intervalsDays',jsonb_build_array(1,3,7),'requiredForReadiness',false))
      INTO policy_json FROM "LearningProgram" p WHERE p."id" = pins.program_id;
    INSERT INTO "ProgramVersion" ("id","programId","version","status","source","snapshot","policy","curriculumRevisionIds","capturedAt","publishedAt","retiredAt","updatedAt")
      SELECT release_id,p."id",ordinal,CASE WHEN p."curriculumRevisionIds"=pins.ids THEN 'PUBLISHED'::"ProgramVersionStatus" ELSE 'RETIRED'::"ProgramVersionStatus" END,'LEGACY_PIN_BACKFILL',
        jsonb_build_object('title',p."name",'description',p."description",'objectives',jsonb_build_array(p."learningGoal"),
          'proficiencyLabel',p."proficiencyLabel",'supportedLanguages',jsonb_build_array('en'),'audiences',jsonb_build_array('adult'),
          'source','LEGACY_PIN_BACKFILL','capturedAt',captured,'metadataFidelity','AVAILABLE_AT_CAPTURE_NOT_HISTORICAL',
          'availableProgramMetadata',to_jsonb(p),'curriculumRevisionIds',to_jsonb(pins.ids),
          'availableCurriculumMetadata',(SELECT jsonb_agg(jsonb_build_object('curriculumRevisionId',cr."id",'pathId',lp."id",'levelId',l."id",'missionId',m."id",'order',x.ord,'title',m."title",'snapshot',cr."snapshot",'lessons',(SELECT coalesce(jsonb_agg(jsonb_build_object('lessonVersionId',cl."lessonVersionId",'order',cl."order",'title',lv."title") ORDER BY cl."order"),'[]'::jsonb) FROM "CurriculumRevisionLesson" cl JOIN "LessonVersion" lv ON lv."id" = cl."lessonVersionId" WHERE cl."curriculumRevisionId"=cr."id")) ORDER BY x.ord)
            FROM unnest(pins.ids) WITH ORDINALITY x(id,ord) JOIN "CurriculumRevision" cr ON cr."id"=x.id JOIN "Mission" m ON m."id"=cr."missionId" JOIN "Level" l ON l."id"=m."levelId" JOIN "LearningPath" lp ON lp."id"=l."pathId")),
        policy_json,pins.ids,captured,captured,CASE WHEN p."curriculumRevisionIds"=pins.ids THEN NULL ELSE captured END,captured FROM "LearningProgram" p WHERE p."id"=pins.program_id;
    INSERT INTO "ProgramVersionCurriculum" ("programVersionId","curriculumRevisionId","order") SELECT release_id,id,ord FROM unnest(pins.ids) WITH ORDINALITY x(id,ord);
    UPDATE "LearnerProgramEnrollment" SET "programVersionId"=release_id WHERE "programId"=pins.program_id AND "curriculumRevisionIds"=pins.ids;
  END LOOP;
END $$;

ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_positive_identity" CHECK ("version" > 0 AND "revision" > 0);
ALTER TABLE "ProgramVersionCurriculum" ADD CONSTRAINT "ProgramVersionCurriculum_positive_order" CHECK ("order" > 0);
ALTER TABLE "EnrollmentEvent" ADD CONSTRAINT "EnrollmentEvent_positive_revision" CHECK ("revision" > 0);
ALTER TABLE "ProgressionSnapshot" ADD CONSTRAINT "ProgressionSnapshot_positive_revision" CHECK ("revision" > 0);
ALTER TABLE "ProgramReview" ADD CONSTRAINT "ProgramReview_positive_state" CHECK ("revision" > 0 AND "iteration" >= 0);
ALTER TABLE "ProgramReviewEvent" ADD CONSTRAINT "ProgramReviewEvent_positive_revision" CHECK ("revision" > 0);

CREATE FUNCTION r2_immutable_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" IN ('PUBLISHED','RETIRED') THEN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published program releases are immutable'; END IF;
    IF (to_jsonb(NEW) - 'status' - 'retiredAt' - 'updatedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'retiredAt' - 'updatedAt')
      OR NOT (NEW."status" = OLD."status" OR (OLD."status"='PUBLISHED' AND NEW."status"='RETIRED'))
      OR (NEW."status"=OLD."status" AND NEW."retiredAt" IS DISTINCT FROM OLD."retiredAt")
      OR (NEW."status"='RETIRED' AND NEW."retiredAt" IS NULL)
    THEN RAISE EXCEPTION 'Published program release snapshots are immutable'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ProgramVersion_immutable" BEFORE UPDATE OR DELETE ON "ProgramVersion" FOR EACH ROW EXECUTE FUNCTION r2_immutable_release();

CREATE FUNCTION r2_immutable_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ProgramVersion" WHERE "id" = CASE WHEN TG_OP='DELETE' THEN OLD."programVersionId" ELSE NEW."programVersionId" END AND "status" IN ('PUBLISHED','RETIRED'))
    OR (TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM "ProgramVersion" WHERE "id"=OLD."programVersionId" AND "status" IN ('PUBLISHED','RETIRED')))
  THEN RAISE EXCEPTION 'Published program release bindings are immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER "ProgramVersionCurriculum_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "ProgramVersionCurriculum" FOR EACH ROW EXECUTE FUNCTION r2_immutable_binding();

CREATE FUNCTION r2_append_only_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'R2 history is append-only'; END $$;
CREATE TRIGGER "EnrollmentEvent_append_only" BEFORE UPDATE OR DELETE ON "EnrollmentEvent" FOR EACH ROW EXECUTE FUNCTION r2_append_only_history();
CREATE TRIGGER "ProgressionSnapshot_append_only" BEFORE UPDATE OR DELETE ON "ProgressionSnapshot" FOR EACH ROW EXECUTE FUNCTION r2_append_only_history();
CREATE TRIGGER "ProgramReviewEvent_append_only" BEFORE UPDATE OR DELETE ON "ProgramReviewEvent" FOR EACH ROW EXECUTE FUNCTION r2_append_only_history();

CREATE FUNCTION r2_review_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."type" = 'COMPLETED' AND NEW."learningSessionId" IS NULL THEN RAISE EXCEPTION 'Review completion requires a completed learning session'; END IF;
  IF NEW."learningSessionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProgramReview" r JOIN "LearnerProgramEnrollment" e ON e."id"=r."enrollmentId"
      JOIN "LearningSession" s ON s."id"=NEW."learningSessionId"
      JOIN "ProgramVersionCurriculum" b ON b."programVersionId"=e."programVersionId" AND b."curriculumRevisionId"=r."curriculumRevisionId"
    WHERE r."id"=NEW."reviewId" AND s."learnerId"=e."learnerId" AND s."curriculumRevisionId"=r."curriculumRevisionId"
      AND s."lessonVersionId"=r."lessonVersionId" AND s."status"='COMPLETED' AND s."completedAt" IS NOT NULL
  ) THEN RAISE EXCEPTION 'Review evidence must match a completed enrolled learning session'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ProgramReviewEvent_provenance" BEFORE INSERT ON "ProgramReviewEvent" FOR EACH ROW EXECUTE FUNCTION r2_review_provenance();
