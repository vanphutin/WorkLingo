-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Level" ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- Preserve the historical publication boundary: only levels beneath an
-- already-published path inherit PUBLISHED during this additive migration.
UPDATE "Level" AS level
SET "status" = 'PUBLISHED'
FROM "LearningPath" AS path
WHERE level."pathId" = path."id"
  AND level."status" = 'DRAFT'
  AND path."status" = 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Level_pathId_order_idx" ON "Level"("pathId", "order");

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Mission_levelId_order_idx" ON "Mission"("levelId", "order");

-- AlterTable
ALTER TABLE "MissionLesson" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_id_idx" ON "AuditLog"("createdAt", "id");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_createdAt_idx" ON "AuditLog"("resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
