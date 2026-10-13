BEGIN;

CREATE TABLE "IeltsBridgeModule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "draftRevision" INTEGER NOT NULL DEFAULT 1 CHECK ("draftRevision" > 0),
  "draftContent" JSONB NOT NULL,
  "currentPublishedVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IeltsBridgeModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IeltsBridgeModuleVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "moduleId" UUID NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "title" TEXT NOT NULL,
  "skill" TEXT NOT NULL CHECK ("skill" IN ('LISTENING', 'READING', 'WRITING', 'SPEAKING')),
  "questionType" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT FALSE,
  "sourceHash" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED' CHECK ("status" IN ('PUBLISHED', 'ARCHIVED')),
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsBridgeModuleVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsBridgeModuleVersion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "IeltsBridgeModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "IeltsBridgeProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "moduleId" UUID NOT NULL,
  "moduleVersionId" UUID NOT NULL,
  "currentStageIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("currentStageIndex" BETWEEN 0 AND 9),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "stageResults" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "timedStageStartedAt" TIMESTAMP(3),
  "timedStageDeadlineAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IeltsBridgeProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsBridgeProgress_timer_check" CHECK (
    ("timedStageStartedAt" IS NULL AND "timedStageDeadlineAt" IS NULL)
    OR ("timedStageStartedAt" IS NOT NULL AND "timedStageDeadlineAt" > "timedStageStartedAt")
  ),
  CONSTRAINT "IeltsBridgeProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IeltsBridgeModule_slug_key" ON "IeltsBridgeModule"("slug");
CREATE UNIQUE INDEX "IeltsBridgeModule_currentPublishedVersionId_key" ON "IeltsBridgeModule"("currentPublishedVersionId");
CREATE UNIQUE INDEX "IeltsBridgeModuleVersion_moduleId_version_key" ON "IeltsBridgeModuleVersion"("moduleId", "version");
CREATE UNIQUE INDEX "IeltsBridgeModuleVersion_id_moduleId_key" ON "IeltsBridgeModuleVersion"("id", "moduleId");
CREATE INDEX "IeltsBridgeModuleVersion_moduleId_status_idx" ON "IeltsBridgeModuleVersion"("moduleId", "status");
CREATE INDEX "IeltsBridgeModuleVersion_skill_questionType_status_idx" ON "IeltsBridgeModuleVersion"("skill", "questionType", "status");
CREATE UNIQUE INDEX "IeltsBridgeProgress_learnerId_moduleId_key" ON "IeltsBridgeProgress"("learnerId", "moduleId");
CREATE INDEX "IeltsBridgeProgress_moduleVersionId_moduleId_idx" ON "IeltsBridgeProgress"("moduleVersionId", "moduleId");
CREATE INDEX "IeltsBridgeProgress_learnerId_completedAt_idx" ON "IeltsBridgeProgress"("learnerId", "completedAt");
CREATE INDEX "IeltsBridgeProgress_moduleId_completedAt_idx" ON "IeltsBridgeProgress"("moduleId", "completedAt");

ALTER TABLE "IeltsBridgeModule"
  ADD CONSTRAINT "IeltsBridgeModule_currentPublishedVersionId_fkey"
  FOREIGN KEY ("currentPublishedVersionId", "id") REFERENCES "IeltsBridgeModuleVersion"("id", "moduleId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IeltsBridgeProgress"
  ADD CONSTRAINT "IeltsBridgeProgress_moduleVersionId_moduleId_fkey"
  FOREIGN KEY ("moduleVersionId", "moduleId") REFERENCES "IeltsBridgeModuleVersion"("id", "moduleId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_ielts_bridge_module_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Published IELTS bridge snapshot cannot be deleted';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."moduleId" IS DISTINCT FROM OLD."moduleId"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."skill" IS DISTINCT FROM OLD."skill"
    OR NEW."questionType" IS DISTINCT FROM OLD."questionType"
    OR NEW."required" IS DISTINCT FROM OLD."required"
    OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash"
    OR NEW."content" IS DISTINCT FROM OLD."content"
    OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
    RAISE EXCEPTION 'Published IELTS bridge snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "IeltsBridgeModuleVersion_immutable"
BEFORE UPDATE OR DELETE ON "IeltsBridgeModuleVersion"
FOR EACH ROW EXECUTE FUNCTION protect_ielts_bridge_module_version();

COMMIT;
