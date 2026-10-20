CREATE TABLE "IntermediateTopicGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntermediateTopicGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntermediateTopicGroup_normalizedName_key" ON "IntermediateTopicGroup"("normalizedName");

ALTER TABLE "ContentImport" ADD COLUMN "topicGroupId" UUID,
    ADD COLUMN "topicGroupRevision" INTEGER NOT NULL DEFAULT 0 CHECK ("topicGroupRevision" >= 0);
ALTER TABLE "Lesson" ADD COLUMN "topicGroupId" UUID;
CREATE INDEX "ContentImport_topicGroupId_idx" ON "ContentImport"("topicGroupId");
CREATE INDEX "Lesson_topicGroupId_idx" ON "Lesson"("topicGroupId");
ALTER TABLE "ContentImport" ADD CONSTRAINT "ContentImport_topicGroupId_fkey"
    FOREIGN KEY ("topicGroupId") REFERENCES "IntermediateTopicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicGroupId_fkey"
    FOREIGN KEY ("topicGroupId") REFERENCES "IntermediateTopicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
