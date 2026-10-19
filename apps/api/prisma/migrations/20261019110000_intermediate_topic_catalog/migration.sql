ALTER TABLE "IntermediateTopicGroup"
  ADD COLUMN "nameEn" TEXT,
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "catalogKey" TEXT;

CREATE UNIQUE INDEX "IntermediateTopicGroup_catalogKey_key" ON "IntermediateTopicGroup"("catalogKey");

CREATE TABLE "IntermediateTopicGroupName" (
  "normalizedName" TEXT NOT NULL,
  "groupId" UUID NOT NULL,
  CONSTRAINT "IntermediateTopicGroupName_pkey" PRIMARY KEY ("normalizedName"),
  CONSTRAINT "IntermediateTopicGroupName_groupId_fkey" FOREIGN KEY ("groupId")
    REFERENCES "IntermediateTopicGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IntermediateTopicGroupName_groupId_idx" ON "IntermediateTopicGroupName"("groupId");

-- Existing names were already NFKC/case/whitespace normalized by the API.
-- Backfill the stored canonical value; a collision must fail rather than merge IDs.
INSERT INTO "IntermediateTopicGroupName" ("normalizedName", "groupId")
SELECT "normalizedName", "id" FROM "IntermediateTopicGroup";
