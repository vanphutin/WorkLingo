BEGIN;

CREATE TYPE "OrientationMediaKind" AS ENUM ('AUDIO', 'IMAGE');

CREATE TABLE "IeltsOrientation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "draftRevision" INTEGER NOT NULL DEFAULT 1 CHECK ("draftRevision" > 0),
  "draftContent" JSONB NOT NULL,
  "currentPublishedVersionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IeltsOrientation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IeltsOrientationVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orientationId" UUID NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "title" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED' CHECK ("status" IN ('PUBLISHED', 'ARCHIVED')),
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "IeltsOrientationVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IeltsOrientationVersion_orientationId_fkey" FOREIGN KEY ("orientationId") REFERENCES "IeltsOrientation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrientationMediaAsset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orientationId" UUID NOT NULL,
  "kind" "OrientationMediaKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL CHECK ("byteSize" > 0),
  "checksum" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrientationMediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrientationMediaAsset_orientationId_fkey" FOREIGN KEY ("orientationId") REFERENCES "IeltsOrientation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrientationMediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrientationProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "learnerId" UUID NOT NULL,
  "orientationVersionId" UUID NOT NULL,
  "currentSlideIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("currentSlideIndex" >= 0),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "answers" JSONB NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrientationProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrientationProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrientationProgress_orientationVersionId_fkey" FOREIGN KEY ("orientationVersionId") REFERENCES "IeltsOrientationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IeltsOrientation_slug_key" ON "IeltsOrientation"("slug");
CREATE UNIQUE INDEX "IeltsOrientation_currentPublishedVersionId_key" ON "IeltsOrientation"("currentPublishedVersionId");
CREATE UNIQUE INDEX "IeltsOrientationVersion_orientationId_version_key" ON "IeltsOrientationVersion"("orientationId", "version");
CREATE INDEX "IeltsOrientationVersion_orientationId_status_idx" ON "IeltsOrientationVersion"("orientationId", "status");
CREATE UNIQUE INDEX "OrientationMediaAsset_storageKey_key" ON "OrientationMediaAsset"("storageKey");
CREATE INDEX "OrientationMediaAsset_orientationId_kind_idx" ON "OrientationMediaAsset"("orientationId", "kind");
CREATE INDEX "OrientationMediaAsset_createdById_idx" ON "OrientationMediaAsset"("createdById");
CREATE UNIQUE INDEX "OrientationProgress_learnerId_orientationVersionId_key" ON "OrientationProgress"("learnerId", "orientationVersionId");
CREATE INDEX "OrientationProgress_orientationVersionId_idx" ON "OrientationProgress"("orientationVersionId");
CREATE INDEX "OrientationProgress_learnerId_completedAt_idx" ON "OrientationProgress"("learnerId", "completedAt");

ALTER TABLE "IeltsOrientation"
  ADD CONSTRAINT "IeltsOrientation_currentPublishedVersionId_fkey"
  FOREIGN KEY ("currentPublishedVersionId") REFERENCES "IeltsOrientationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_ielts_orientation_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."orientationId" IS DISTINCT FROM OLD."orientationId"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash"
    OR NEW."content" IS DISTINCT FROM OLD."content"
    OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
    RAISE EXCEPTION 'Published IELTS orientation snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "IeltsOrientationVersion_immutable"
BEFORE UPDATE ON "IeltsOrientationVersion"
FOR EACH ROW EXECUTE FUNCTION protect_ielts_orientation_version();

COMMIT;
