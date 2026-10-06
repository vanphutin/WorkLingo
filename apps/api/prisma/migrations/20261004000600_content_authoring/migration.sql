-- CreateEnum
CREATE TYPE "AudioArtifactStatus" AS ENUM ('MISSING', 'GENERATING', 'READY', 'FAILED', 'STALE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable Lesson
ALTER TABLE "Lesson" ADD COLUMN "currentPublishedVersionId" UUID;

-- CreateTable WordBankVersion
CREATE TABLE "WordBankVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wordBankId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordBankVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable LanguageBlockVersion
CREATE TABLE "LanguageBlockVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wordBankVersionId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalForm" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "collocations" TEXT[],
    "grammarPattern" TEXT NOT NULL,
    "examples" TEXT[],
    "commonErrors" TEXT[],
    "cefrLevel" TEXT NOT NULL,
    "transferContexts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageBlockVersion_pkey" PRIMARY KEY ("id")
);

-- AlterTable LessonVersionWordBank: add wordBankVersionId
ALTER TABLE "LessonVersionWordBank" ADD COLUMN "wordBankVersionId" UUID;

-- Backfill WordBankVersion for existing WordBank records
INSERT INTO "WordBankVersion" ("id", "wordBankId", "name", "sourceHash", "version", "createdAt")
SELECT gen_random_uuid(), "id", "name", md5("slug"), 1, CURRENT_TIMESTAMP
FROM "WordBank"
ON CONFLICT DO NOTHING;

-- Backfill LanguageBlockVersion for existing LanguageBlock records
INSERT INTO "LanguageBlockVersion" (
    "id", "wordBankVersionId", "slug", "canonicalForm", "meaning", "pronunciation",
    "collocations", "grammarPattern", "examples", "commonErrors", "cefrLevel",
    "transferContexts", "createdAt"
)
SELECT
    gen_random_uuid(), wbv."id", lb."slug", lb."canonicalForm", lb."meaning", lb."pronunciation",
    lb."collocations", lb."grammarPattern", lb."examples", lb."commonErrors", lb."cefrLevel",
    lb."transferContexts", lb."createdAt"
FROM "LanguageBlock" lb
JOIN "WordBankVersion" wbv ON wbv."wordBankId" = lb."wordBankId"
ON CONFLICT DO NOTHING;

-- Backfill wordBankVersionId in LessonVersionWordBank
ALTER TABLE "LessonVersionWordBank" DISABLE TRIGGER lesson_word_bank_immutable;

UPDATE "LessonVersionWordBank" lvwb
SET "wordBankVersionId" = wbv."id"
FROM "WordBankVersion" wbv
WHERE wbv."wordBankId" = lvwb."wordBankId"
  AND lvwb."wordBankVersionId" IS NULL;

ALTER TABLE "LessonVersionWordBank" ENABLE TRIGGER lesson_word_bank_immutable;

-- Create trigger to resolve wordBankVersionId automatically if not provided
CREATE OR REPLACE FUNCTION resolve_lesson_word_bank_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."wordBankVersionId" IS NULL AND NEW."wordBankId" IS NOT NULL THEN
    SELECT "id" INTO NEW."wordBankVersionId"
    FROM "WordBankVersion"
    WHERE "wordBankId" = NEW."wordBankId"
    ORDER BY "version" DESC LIMIT 1;
  END IF;

  IF NEW."wordBankId" IS NULL AND NEW."wordBankVersionId" IS NOT NULL THEN
    SELECT "wordBankId" INTO NEW."wordBankId"
    FROM "WordBankVersion"
    WHERE "id" = NEW."wordBankVersionId";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_word_bank_resolve_version
BEFORE INSERT OR UPDATE ON "LessonVersionWordBank"
FOR EACH ROW EXECUTE FUNCTION resolve_lesson_word_bank_version();

CREATE INDEX "LessonVersionWordBank_wordBankVersionId_idx" ON "LessonVersionWordBank"("wordBankVersionId");

-- Update Lesson.currentPublishedVersionId for existing published lessons
UPDATE "Lesson" l
SET "currentPublishedVersionId" = (
    SELECT lv."id" FROM "LessonVersion" lv
    WHERE lv."lessonId" = l."id" AND lv."status" = 'PUBLISHED'
    ORDER BY lv."version" DESC LIMIT 1
);

-- CreateTable ContentImport
CREATE TABLE "ContentImport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonId" UUID,
    "lessonVersionId" UUID,
    "rawSource" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "draftRevision" INTEGER NOT NULL DEFAULT 1,
    "parserVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "parsedAst" JSONB,
    "normalizedPreview" JSONB,
    "validationReport" JSONB,
    "validationHash" TEXT,
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable AudioArtifact
CREATE TABLE "AudioArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contentImportId" UUID NOT NULL,
    "audioScriptSlug" TEXT NOT NULL,
    "scriptHash" TEXT NOT NULL,
    "adapterName" TEXT NOT NULL,
    "voiceConfig" JSONB NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "AudioArtifactStatus" NOT NULL DEFAULT 'MISSING',
    "failureSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable LessonVersionAudioArtifact
CREATE TABLE "LessonVersionAudioArtifact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lessonVersionId" UUID NOT NULL,
    "audioArtifactId" UUID NOT NULL,
    "audioScriptSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonVersionAudioArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable Job
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "contentImportId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable MutationReceipt
CREATE TABLE "MutationReceipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "oldState" JSONB,
    "newState" JSONB,
    "metadata" JSONB,
    "contentImportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE UNIQUE INDEX "WordBankVersion_wordBankId_version_key" ON "WordBankVersion"("wordBankId", "version");
CREATE UNIQUE INDEX "WordBankVersion_wordBankId_sourceHash_key" ON "WordBankVersion"("wordBankId", "sourceHash");
CREATE INDEX "WordBankVersion_wordBankId_idx" ON "WordBankVersion"("wordBankId");

CREATE UNIQUE INDEX "LanguageBlockVersion_wordBankVersionId_slug_key" ON "LanguageBlockVersion"("wordBankVersionId", "slug");
CREATE INDEX "LanguageBlockVersion_wordBankVersionId_idx" ON "LanguageBlockVersion"("wordBankVersionId");

CREATE INDEX "ContentImport_lessonId_idx" ON "ContentImport"("lessonId");
CREATE INDEX "ContentImport_status_idx" ON "ContentImport"("status");

CREATE UNIQUE INDEX "AudioArtifact_contentImportId_audioScriptSlug_scriptHash_key" ON "AudioArtifact"("contentImportId", "audioScriptSlug", "scriptHash");
CREATE INDEX "AudioArtifact_contentImportId_idx" ON "AudioArtifact"("contentImportId");
CREATE INDEX "AudioArtifact_status_idx" ON "AudioArtifact"("status");

CREATE UNIQUE INDEX "LessonVersionAudioArtifact_lessonVersionId_audioScriptSlug_key" ON "LessonVersionAudioArtifact"("lessonVersionId", "audioScriptSlug");
CREATE INDEX "LessonVersionAudioArtifact_lessonVersionId_idx" ON "LessonVersionAudioArtifact"("lessonVersionId");
CREATE INDEX "LessonVersionAudioArtifact_audioArtifactId_idx" ON "LessonVersionAudioArtifact"("audioArtifactId");

CREATE INDEX "Job_contentImportId_idx" ON "Job"("contentImportId");
CREATE INDEX "Job_status_idx" ON "Job"("status");

CREATE UNIQUE INDEX "MutationReceipt_actorId_operation_idempotencyKey_key" ON "MutationReceipt"("actorId", "operation", "idempotencyKey");
CREATE INDEX "MutationReceipt_actorId_idx" ON "MutationReceipt"("actorId");

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- Partial Unique Index: only one published LessonVersion per lessonId
CREATE UNIQUE INDEX "LessonVersion_one_published_per_lesson_idx" ON "LessonVersion"("lessonId") WHERE ("status" = 'PUBLISHED');

-- Add Foreign Keys
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WordBankVersion" ADD CONSTRAINT "WordBankVersion_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LanguageBlockVersion" ADD CONSTRAINT "LanguageBlockVersion_wordBankVersionId_fkey" FOREIGN KEY ("wordBankVersionId") REFERENCES "WordBankVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonVersionWordBank" ADD CONSTRAINT "LessonVersionWordBank_wordBankVersionId_fkey" FOREIGN KEY ("wordBankVersionId") REFERENCES "WordBankVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContentImport" ADD CONSTRAINT "ContentImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentImport" ADD CONSTRAINT "ContentImport_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentImport" ADD CONSTRAINT "ContentImport_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentImport" ADD CONSTRAINT "ContentImport_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AudioArtifact" ADD CONSTRAINT "AudioArtifact_contentImportId_fkey" FOREIGN KEY ("contentImportId") REFERENCES "ContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonVersionAudioArtifact" ADD CONSTRAINT "LessonVersionAudioArtifact_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonVersionAudioArtifact" ADD CONSTRAINT "LessonVersionAudioArtifact_audioArtifactId_fkey" FOREIGN KEY ("audioArtifactId") REFERENCES "AudioArtifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_contentImportId_fkey" FOREIGN KEY ("contentImportId") REFERENCES "ContentImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MutationReceipt" ADD CONSTRAINT "MutationReceipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_contentImportId_fkey" FOREIGN KEY ("contentImportId") REFERENCES "ContentImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update protect_published_lesson_version: Allow PUBLISHED -> ARCHIVED transition; prevent modifications to ARCHIVED
CREATE OR REPLACE FUNCTION protect_published_lesson_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Archived lesson versions are immutable' USING ERRCODE = '55000';
  END IF;

  IF OLD."status" = 'PUBLISHED' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Published lesson versions cannot be deleted' USING ERRCODE = '55000';
    END IF;

    -- Allow legal transition PUBLISHED -> ARCHIVED
    IF NEW."status" = 'ARCHIVED' THEN
      -- Only status and updatedAt may change; immutable fields must not change
      IF NEW."lessonId" <> OLD."lessonId" OR
         NEW."version" <> OLD."version" OR
         NEW."title" <> OLD."title" OR
         NEW."sourceHash" <> OLD."sourceHash" OR
         NEW."parsedContent"::text <> OLD."parsedContent"::text THEN
        RAISE EXCEPTION 'Published lesson versions are immutable: content cannot change during archiving' USING ERRCODE = '55000';
      END IF;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Published lesson versions are immutable' USING ERRCODE = '55000';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Update protect_published_lesson_child to also protect ARCHIVED parent
CREATE OR REPLACE FUNCTION protect_published_lesson_child() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_ids uuid[] := ARRAY[]::uuid[];
  parent_status text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    parent_ids := array_append(parent_ids, OLD."lessonVersionId");
  END IF;
  IF TG_OP <> 'DELETE' THEN
    parent_ids := array_append(parent_ids, NEW."lessonVersionId");
  END IF;
  FOR parent_status IN EXECUTE format(
    'SELECT "status"::text FROM %I."LessonVersion" WHERE "id" = ANY($1) ORDER BY "id" FOR UPDATE',
    TG_TABLE_SCHEMA
  ) USING parent_ids LOOP
    IF parent_status = 'PUBLISHED' OR parent_status = 'ARCHIVED' THEN
      RAISE EXCEPTION 'Published lesson content is immutable' USING ERRCODE = '55000';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Add immutable child trigger for LessonVersionAudioArtifact
CREATE TRIGGER lesson_audio_artifact_immutable
BEFORE INSERT OR UPDATE OR DELETE ON "LessonVersionAudioArtifact"
FOR EACH ROW EXECUTE FUNCTION protect_published_lesson_child();

-- Protect WordBankVersion and LanguageBlockVersion immutability
CREATE OR REPLACE FUNCTION protect_immutable_word_bank_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Word Bank versions are immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER word_bank_version_immutable
BEFORE UPDATE OR DELETE ON "WordBankVersion"
FOR EACH ROW EXECUTE FUNCTION protect_immutable_word_bank_version();

CREATE TRIGGER language_block_version_immutable
BEFORE UPDATE OR DELETE ON "LanguageBlockVersion"
FOR EACH ROW EXECUTE FUNCTION protect_immutable_word_bank_version();
