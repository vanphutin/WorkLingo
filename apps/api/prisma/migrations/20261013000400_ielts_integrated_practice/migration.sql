BEGIN;

CREATE TABLE "IeltsIntegratedProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "durationMinutes" INTEGER NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "draftRevision" INTEGER NOT NULL DEFAULT 1 CHECK ("draftRevision" > 0),
  "draftContent" JSONB NOT NULL, "currentPublishedVersionId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IeltsIntegratedProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsIntegratedProfile_duration_check" CHECK ("durationMinutes" IN (60,90,120,150))
);
CREATE TABLE "IeltsIntegratedProfileVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "profileId" UUID NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
  "durationMinutes" INTEGER NOT NULL CHECK ("durationMinutes" IN (60,90,120,150)), "sourceHash" TEXT NOT NULL,
  "content" JSONB NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED' CHECK ("status" IN ('PUBLISHED','ARCHIVED')),
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "archivedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsIntegratedProfileVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsIntegratedProfileVersion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "IeltsIntegratedProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "IeltsIntegratedSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "learnerId" UUID NOT NULL, "clientSessionId" UUID NOT NULL,
  "profileVersionId" UUID NOT NULL, "durationMinutes" INTEGER NOT NULL CHECK ("durationMinutes" IN (60,90,120,150)),
  "difficulty" TEXT NOT NULL CHECK ("difficulty" IN ('foundation','developing','competent','advanced')),
  "planSnapshot" JSONB NOT NULL, "currentBlockIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("currentBlockIndex" BETWEEN 0 AND 3),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0), "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IeltsIntegratedSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsIntegratedSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IeltsIntegratedSession_profileVersionId_fkey" FOREIGN KEY ("profileVersionId") REFERENCES "IeltsIntegratedProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "IeltsIntegratedSessionBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sessionId" UUID NOT NULL, "moduleVersionId" UUID NOT NULL,
  "order" INTEGER NOT NULL CHECK ("order" BETWEEN 1 AND 4), "skill" TEXT NOT NULL CHECK ("skill" IN ('listening','reading','writing','speaking')),
  "targetMinutes" INTEGER NOT NULL CHECK ("targetMinutes" > 0), "questionType" TEXT NOT NULL,
  "mode" TEXT NOT NULL CHECK ("mode" IN ('review','new_practice')), "result" JSONB, "completedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsIntegratedSessionBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsIntegratedSessionBlock_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IeltsIntegratedSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IeltsIntegratedSessionBlock_moduleVersionId_fkey" FOREIGN KEY ("moduleVersionId") REFERENCES "IeltsBridgeModuleVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IeltsIntegratedProfile_durationMinutes_key" ON "IeltsIntegratedProfile"("durationMinutes");
CREATE UNIQUE INDEX "IeltsIntegratedProfile_currentPublishedVersionId_key" ON "IeltsIntegratedProfile"("currentPublishedVersionId");
CREATE UNIQUE INDEX "IeltsIntegratedProfileVersion_profileId_version_key" ON "IeltsIntegratedProfileVersion"("profileId","version");
CREATE UNIQUE INDEX "IeltsIntegratedProfileVersion_id_profileId_key" ON "IeltsIntegratedProfileVersion"("id","profileId");
CREATE INDEX "IeltsIntegratedProfileVersion_durationMinutes_status_idx" ON "IeltsIntegratedProfileVersion"("durationMinutes","status");
CREATE UNIQUE INDEX "IeltsIntegratedSession_learnerId_clientSessionId_key" ON "IeltsIntegratedSession"("learnerId","clientSessionId");
CREATE INDEX "IeltsIntegratedSession_learnerId_completedAt_idx" ON "IeltsIntegratedSession"("learnerId","completedAt");
CREATE INDEX "IeltsIntegratedSession_profileVersionId_idx" ON "IeltsIntegratedSession"("profileVersionId");
CREATE UNIQUE INDEX "IeltsIntegratedSessionBlock_sessionId_order_key" ON "IeltsIntegratedSessionBlock"("sessionId","order");
CREATE INDEX "IeltsIntegratedSessionBlock_moduleVersionId_idx" ON "IeltsIntegratedSessionBlock"("moduleVersionId");
ALTER TABLE "IeltsIntegratedProfile" ADD CONSTRAINT "IeltsIntegratedProfile_currentPublishedVersionId_fkey"
  FOREIGN KEY ("currentPublishedVersionId","id") REFERENCES "IeltsIntegratedProfileVersion"("id","profileId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_ielts_integrated_profile_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published IELTS integrated profile cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."profileId" IS DISTINCT FROM OLD."profileId"
    OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."durationMinutes" IS DISTINCT FROM OLD."durationMinutes"
    OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash" OR NEW."content" IS DISTINCT FROM OLD."content"
    OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
    RAISE EXCEPTION 'Published IELTS integrated profile is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "IeltsIntegratedProfileVersion_immutable" BEFORE UPDATE OR DELETE ON "IeltsIntegratedProfileVersion"
FOR EACH ROW EXECUTE FUNCTION protect_ielts_integrated_profile_version();

COMMIT;
