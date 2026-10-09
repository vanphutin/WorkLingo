-- System-seeded lessons are not authored through a ContentImport, but their
-- immutable LessonVersion still needs a normal READY audio artifact.
ALTER TABLE "AudioArtifact"
  DROP CONSTRAINT "AudioArtifact_contentImportId_fkey";

ALTER TABLE "AudioArtifact"
  ALTER COLUMN "contentImportId" DROP NOT NULL;

ALTER TABLE "AudioArtifact"
  ADD CONSTRAINT "AudioArtifact_contentImportId_fkey"
  FOREIGN KEY ("contentImportId") REFERENCES "ContentImport"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
