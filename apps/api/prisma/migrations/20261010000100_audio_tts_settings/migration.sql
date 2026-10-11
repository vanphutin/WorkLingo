-- Learner playback preferences use extensible string identifiers. Existing and
-- new profiles resolve to the safe system-default behavior.
ALTER TABLE "LearnerProfile"
  ADD COLUMN "audioSourceId" TEXT NOT NULL DEFAULT 'system-default',
  ADD COLUMN "browserVoiceId" TEXT;

-- Only non-secret provider defaults are persisted. The check makes this a
-- true singleton table instead of relying on application convention.
CREATE TABLE "AudioSystemSetting" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "providerId" TEXT NOT NULL,
  "defaultVoiceId" TEXT,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AudioSystemSetting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AudioSystemSetting_singleton_check" CHECK ("id" = 'default')
);

CREATE INDEX "AudioSystemSetting_updatedById_idx"
  ON "AudioSystemSetting"("updatedById");

ALTER TABLE "AudioSystemSetting"
  ADD CONSTRAINT "AudioSystemSetting_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill deterministic identities before making the candidate fields
-- required. Existing lesson-version references continue pointing at the same
-- artifact IDs and storage objects.
ALTER TABLE "AudioArtifact"
  ADD COLUMN "variantKey" TEXT,
  ADD COLUMN "generationKey" TEXT;

UPDATE "AudioArtifact"
SET
  "variantKey" = 'legacy:' || "adapterName",
  "generationKey" = 'legacy:' || "id"::TEXT;

ALTER TABLE "AudioArtifact"
  ALTER COLUMN "variantKey" SET DEFAULT 'legacy:unclassified',
  ALTER COLUMN "variantKey" SET NOT NULL,
  ALTER COLUMN "generationKey" SET DEFAULT (gen_random_uuid()::TEXT),
  ALTER COLUMN "generationKey" SET NOT NULL;

DROP INDEX "AudioArtifact_contentImportId_audioScriptSlug_scriptHash_key";

CREATE UNIQUE INDEX "AudioArtifact_generationKey_key"
  ON "AudioArtifact"("generationKey");
CREATE INDEX "AudioArtifact_contentImportId_audioScriptSlug_scriptHash_idx"
  ON "AudioArtifact"("contentImportId", "audioScriptSlug", "scriptHash");
