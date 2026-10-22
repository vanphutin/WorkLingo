-- CreateTable
CREATE TABLE "VocabularySource" (
    "id" UUID NOT NULL,
    "providerName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "rightsStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "permissionReference" TEXT,
    "allowedUses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attributionRequirements" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyDocument" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "edition" TEXT NOT NULL DEFAULT '',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyBatch" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "inventory" JSONB NOT NULL,
    "inventoryHash" TEXT NOT NULL,
    "detectedRows" INTEGER NOT NULL,
    "checkpoint" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "rollbackReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularySourceEntry" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "sourceEntryKey" TEXT NOT NULL,
    "topicInstanceKey" TEXT NOT NULL,
    "originalTopic" TEXT NOT NULL,
    "topicSequence" INTEGER NOT NULL,
    "rowOrdinal" INTEGER NOT NULL,
    "pageIndex" INTEGER NOT NULL,
    "printedPageNumber" TEXT,
    "locations" JSONB NOT NULL,
    "rawWord" TEXT NOT NULL,
    "parsedWord" TEXT NOT NULL,
    "rawPos" TEXT NOT NULL,
    "normalizedPos" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "pronunciation" TEXT,
    "permittedDefinition" TEXT,
    "extractionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceContentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularySourceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyBatchRow" (
    "batchId" UUID NOT NULL,
    "sourceEntryId" UUID NOT NULL,
    "validationState" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "rejectionReason" TEXT,

    CONSTRAINT "VocabularyBatchRow_pkey" PRIMARY KEY ("batchId","sourceEntryId")
);

-- CreateTable
CREATE TABLE "LexicalEntry" (
    "id" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "canonicalForm" TEXT NOT NULL,
    "normalizedForm" TEXT NOT NULL,
    "lemma" TEXT,
    "entryType" TEXT NOT NULL DEFAULT 'WORD',
    "partOfSpeech" TEXT NOT NULL,
    "editorialStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LexicalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexicalSense" (
    "id" UUID NOT NULL,
    "lexicalEntryId" UUID NOT NULL,
    "senseKey" TEXT NOT NULL,
    "definition" TEXT,
    "definitionLanguage" TEXT NOT NULL DEFAULT 'en',
    "translation" TEXT,
    "usageDomain" TEXT,
    "register" TEXT,
    "rightsBasis" TEXT NOT NULL,
    "sourceId" UUID,
    "editorialStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexicalSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyEntryResolution" (
    "sourceEntryId" UUID NOT NULL,
    "lexicalEntryId" UUID NOT NULL,
    "senseId" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyEntryResolution_pkey" PRIMARY KEY ("sourceEntryId")
);

-- CreateTable
CREATE TABLE "LexicalPronunciation" (
    "id" UUID NOT NULL,
    "lexicalEntryId" UUID NOT NULL,
    "dialect" TEXT NOT NULL,
    "ipa" TEXT NOT NULL,
    "sourceId" UUID,
    "rightsBasis" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "audioAssetReference" TEXT,

    CONSTRAINT "LexicalPronunciation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexicalCefrAssociation" (
    "id" UUID NOT NULL,
    "lexicalEntryId" UUID NOT NULL,
    "senseId" UUID,
    "sourceEntryId" UUID NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "reviewStatus" TEXT NOT NULL DEFAULT 'REVIEWED',

    CONSTRAINT "LexicalCefrAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexicalEntryTopic" (
    "lexicalEntryId" UUID NOT NULL,
    "topicGroupId" UUID NOT NULL,

    CONSTRAINT "LexicalEntryTopic_pkey" PRIMARY KEY ("lexicalEntryId","topicGroupId")
);

-- CreateTable
CREATE TABLE "VocabularyTopicMapping" (
    "documentId" UUID NOT NULL,
    "topicInstanceKey" TEXT NOT NULL,
    "originalTopic" TEXT NOT NULL,
    "topicGroupId" UUID,

    CONSTRAINT "VocabularyTopicMapping_pkey" PRIMARY KEY ("documentId","topicInstanceKey")
);

-- CreateTable
CREATE TABLE "VocabularyCollection" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyCollectionVersion" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "batchId" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyCollectionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyCollectionMember" (
    "id" UUID NOT NULL,
    "collectionVersionId" UUID NOT NULL,
    "lexicalEntryId" UUID NOT NULL,
    "senseId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "VocabularyCollectionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyProgramAssignment" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "targetLevel" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "learningGoal" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inclusionReason" TEXT NOT NULL,
    "curationStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "approvedBy" TEXT,

    CONSTRAINT "VocabularyProgramAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyCurriculumBinding" (
    "id" UUID NOT NULL,
    "collectionVersionId" UUID NOT NULL,
    "programId" UUID,
    "pathId" UUID,
    "levelId" UUID,
    "missionId" UUID,
    "lessonVersionId" UUID,
    "wordBankVersionId" UUID,

    CONSTRAINT "VocabularyCurriculumBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyLegacyLink" (
    "id" UUID NOT NULL,
    "senseId" UUID NOT NULL,
    "languageBlockId" UUID NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyLegacyLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySource_providerName_sourceUrl_key" ON "VocabularySource"("providerName", "sourceUrl");

-- CreateIndex
CREATE INDEX "VocabularyDocument_sourceId_idx" ON "VocabularyDocument"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyDocument_sourceId_sha256_cefrLevel_key" ON "VocabularyDocument"("sourceId", "sha256", "cefrLevel");

-- CreateIndex
CREATE INDEX "VocabularyBatch_status_createdAt_idx" ON "VocabularyBatch"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyBatch_documentId_parserVersion_key" ON "VocabularyBatch"("documentId", "parserVersion");

-- CreateIndex
CREATE INDEX "VocabularySourceEntry_documentId_pageIndex_idx" ON "VocabularySourceEntry"("documentId", "pageIndex");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularySourceEntry_documentId_sourceEntryKey_key" ON "VocabularySourceEntry"("documentId", "sourceEntryKey");

-- CreateIndex
CREATE INDEX "VocabularyBatchRow_sourceEntryId_idx" ON "VocabularyBatchRow"("sourceEntryId");

-- CreateIndex
CREATE INDEX "LexicalEntry_language_normalizedForm_partOfSpeech_idx" ON "LexicalEntry"("language", "normalizedForm", "partOfSpeech");

-- CreateIndex
CREATE INDEX "LexicalEntry_editorialStatus_id_idx" ON "LexicalEntry"("editorialStatus", "id");

-- CreateIndex
CREATE INDEX "LexicalSense_sourceId_idx" ON "LexicalSense"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "LexicalSense_lexicalEntryId_senseKey_key" ON "LexicalSense"("lexicalEntryId", "senseKey");

-- CreateIndex
CREATE UNIQUE INDEX "LexicalSense_id_lexicalEntryId_key" ON "LexicalSense"("id", "lexicalEntryId");

-- CreateIndex
CREATE INDEX "VocabularyEntryResolution_lexicalEntryId_idx" ON "VocabularyEntryResolution"("lexicalEntryId");

-- CreateIndex
CREATE INDEX "VocabularyEntryResolution_senseId_lexicalEntryId_idx" ON "VocabularyEntryResolution"("senseId", "lexicalEntryId");

-- CreateIndex
CREATE INDEX "LexicalPronunciation_lexicalEntryId_idx" ON "LexicalPronunciation"("lexicalEntryId");

-- CreateIndex
CREATE INDEX "LexicalPronunciation_sourceId_idx" ON "LexicalPronunciation"("sourceId");

-- CreateIndex
CREATE INDEX "LexicalCefrAssociation_lexicalEntryId_cefrLevel_idx" ON "LexicalCefrAssociation"("lexicalEntryId", "cefrLevel");

-- CreateIndex
CREATE INDEX "LexicalCefrAssociation_senseId_lexicalEntryId_idx" ON "LexicalCefrAssociation"("senseId", "lexicalEntryId");

-- CreateIndex
CREATE INDEX "LexicalCefrAssociation_cefrLevel_idx" ON "LexicalCefrAssociation"("cefrLevel");

-- CreateIndex
CREATE UNIQUE INDEX "LexicalCefrAssociation_sourceEntryId_cefrLevel_key" ON "LexicalCefrAssociation"("sourceEntryId", "cefrLevel");

-- CreateIndex
CREATE INDEX "LexicalEntryTopic_topicGroupId_idx" ON "LexicalEntryTopic"("topicGroupId");

-- CreateIndex
CREATE INDEX "VocabularyTopicMapping_topicGroupId_idx" ON "VocabularyTopicMapping"("topicGroupId");

-- CreateIndex
CREATE INDEX "VocabularyCollectionVersion_status_id_idx" ON "VocabularyCollectionVersion"("status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCollectionVersion_collectionId_version_key" ON "VocabularyCollectionVersion"("collectionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCollectionVersion_batchId_key" ON "VocabularyCollectionVersion"("batchId");

-- CreateIndex
CREATE INDEX "VocabularyCollectionMember_lexicalEntryId_idx" ON "VocabularyCollectionMember"("lexicalEntryId");

-- CreateIndex
CREATE INDEX "VocabularyCollectionMember_senseId_lexicalEntryId_idx" ON "VocabularyCollectionMember"("senseId", "lexicalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCollectionMember_collectionVersionId_position_key" ON "VocabularyCollectionMember"("collectionVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCollectionMember_collectionVersionId_senseId_key" ON "VocabularyCollectionMember"("collectionVersionId", "senseId");

-- CreateIndex
CREATE INDEX "VocabularyProgramAssignment_programId_idx" ON "VocabularyProgramAssignment"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyProgramAssignment_memberId_programId_key" ON "VocabularyProgramAssignment"("memberId", "programId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_collectionVersionId_idx" ON "VocabularyCurriculumBinding"("collectionVersionId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_programId_idx" ON "VocabularyCurriculumBinding"("programId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_pathId_idx" ON "VocabularyCurriculumBinding"("pathId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_levelId_idx" ON "VocabularyCurriculumBinding"("levelId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_missionId_idx" ON "VocabularyCurriculumBinding"("missionId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_lessonVersionId_idx" ON "VocabularyCurriculumBinding"("lessonVersionId");

-- CreateIndex
CREATE INDEX "VocabularyCurriculumBinding_wordBankVersionId_idx" ON "VocabularyCurriculumBinding"("wordBankVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyLegacyLink_languageBlockId_key" ON "VocabularyLegacyLink"("languageBlockId");

-- CreateIndex
CREATE INDEX "VocabularyLegacyLink_senseId_idx" ON "VocabularyLegacyLink"("senseId");

-- AddForeignKey
ALTER TABLE "VocabularyDocument" ADD CONSTRAINT "VocabularyDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VocabularySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyBatch" ADD CONSTRAINT "VocabularyBatch_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VocabularyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularySourceEntry" ADD CONSTRAINT "VocabularySourceEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VocabularyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyBatchRow" ADD CONSTRAINT "VocabularyBatchRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "VocabularyBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyBatchRow" ADD CONSTRAINT "VocabularyBatchRow_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "VocabularySourceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalSense" ADD CONSTRAINT "LexicalSense_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalSense" ADD CONSTRAINT "LexicalSense_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VocabularySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntryResolution" ADD CONSTRAINT "VocabularyEntryResolution_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "VocabularySourceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntryResolution" ADD CONSTRAINT "VocabularyEntryResolution_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntryResolution" ADD CONSTRAINT "VocabularyEntryResolution_senseId_lexicalEntryId_fkey" FOREIGN KEY ("senseId", "lexicalEntryId") REFERENCES "LexicalSense"("id", "lexicalEntryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalPronunciation" ADD CONSTRAINT "LexicalPronunciation_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalPronunciation" ADD CONSTRAINT "LexicalPronunciation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VocabularySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalCefrAssociation" ADD CONSTRAINT "LexicalCefrAssociation_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalCefrAssociation" ADD CONSTRAINT "LexicalCefrAssociation_senseId_lexicalEntryId_fkey" FOREIGN KEY ("senseId", "lexicalEntryId") REFERENCES "LexicalSense"("id", "lexicalEntryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalCefrAssociation" ADD CONSTRAINT "LexicalCefrAssociation_sourceEntryId_fkey" FOREIGN KEY ("sourceEntryId") REFERENCES "VocabularySourceEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalEntryTopic" ADD CONSTRAINT "LexicalEntryTopic_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexicalEntryTopic" ADD CONSTRAINT "LexicalEntryTopic_topicGroupId_fkey" FOREIGN KEY ("topicGroupId") REFERENCES "IntermediateTopicGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTopicMapping" ADD CONSTRAINT "VocabularyTopicMapping_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VocabularyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTopicMapping" ADD CONSTRAINT "VocabularyTopicMapping_topicGroupId_fkey" FOREIGN KEY ("topicGroupId") REFERENCES "IntermediateTopicGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollectionVersion" ADD CONSTRAINT "VocabularyCollectionVersion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VocabularyCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollectionVersion" ADD CONSTRAINT "VocabularyCollectionVersion_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "VocabularyBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollectionMember" ADD CONSTRAINT "VocabularyCollectionMember_collectionVersionId_fkey" FOREIGN KEY ("collectionVersionId") REFERENCES "VocabularyCollectionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollectionMember" ADD CONSTRAINT "VocabularyCollectionMember_lexicalEntryId_fkey" FOREIGN KEY ("lexicalEntryId") REFERENCES "LexicalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCollectionMember" ADD CONSTRAINT "VocabularyCollectionMember_senseId_lexicalEntryId_fkey" FOREIGN KEY ("senseId", "lexicalEntryId") REFERENCES "LexicalSense"("id", "lexicalEntryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgramAssignment" ADD CONSTRAINT "VocabularyProgramAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "VocabularyCollectionMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgramAssignment" ADD CONSTRAINT "VocabularyProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LearningProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_collectionVersionId_fkey" FOREIGN KEY ("collectionVersionId") REFERENCES "VocabularyCollectionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LearningProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "VocabularyCurriculumBinding_wordBankVersionId_fkey" FOREIGN KEY ("wordBankVersionId") REFERENCES "WordBankVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyLegacyLink" ADD CONSTRAINT "VocabularyLegacyLink_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "LexicalSense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyLegacyLink" ADD CONSTRAINT "VocabularyLegacyLink_languageBlockId_fkey" FOREIGN KEY ("languageBlockId") REFERENCES "LanguageBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Constraints reinforce application validation for direct imports.
ALTER TABLE "VocabularySource" ADD CONSTRAINT "vocabulary_rights_status" CHECK ("rightsStatus" IN ('PENDING','APPROVED','REVOKED'));
ALTER TABLE "VocabularySource" ADD CONSTRAINT "vocabulary_permission_evidence" CHECK ("rightsStatus" <> 'APPROVED' OR (length(btrim("permissionReference")) > 0 AND "permissionReference" IS NOT NULL AND "allowedUses" @> ARRAY['EXTRACT','STORE'] AND "allowedFields" @> ARRAY['FORM']));
ALTER TABLE "VocabularyDocument" ADD CONSTRAINT "vocabulary_document_identity" CHECK (sha256 ~ '^[a-f0-9]{64}$' AND "pageCount" > 0 AND "cefrLevel" IN ('A1','A2','B1','B2','C1','C2'));
ALTER TABLE "VocabularyBatch" ADD CONSTRAINT "vocabulary_batch_state" CHECK (status IN ('REGISTERED','BLOCKED_BY_RIGHTS','EXTRACTED','VALIDATED','REVIEW_REQUIRED','REVIEWED','STAGED','PUBLISHED','FAILED','ROLLED_BACK') AND "detectedRows" >= 0 AND checkpoint >= 0);
ALTER TABLE "VocabularyBatchRow" ADD CONSTRAINT "vocabulary_row_state" CHECK ("validationState" IN ('REVIEW_REQUIRED','VALIDATED','REJECTED') AND ("validationState" <> 'REJECTED' OR length(btrim("rejectionReason")) > 0 AND "rejectionReason" IS NOT NULL));
ALTER TABLE "VocabularySourceEntry" ADD CONSTRAINT "vocabulary_source_location" CHECK ("pageIndex" >= 0 AND "topicSequence" > 0 AND "rowOrdinal" > 0 AND "extractionConfidence" BETWEEN 0 AND 1);
ALTER TABLE "VocabularyCurriculumBinding" ADD CONSTRAINT "vocabulary_one_binding_target" CHECK (num_nonnulls("programId","pathId","levelId","missionId","lessonVersionId","wordBankVersionId") = 1);
ALTER TABLE "VocabularyCollectionVersion" ADD CONSTRAINT "vocabulary_collection_status" CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED'));
ALTER TABLE "VocabularyCollectionMember" ADD CONSTRAINT "vocabulary_member_position" CHECK (position >= 0);

CREATE FUNCTION vocabulary_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Vocabulary provenance is immutable; register a new document version'; END $$;
CREATE TRIGGER vocabulary_source_entry_immutable BEFORE UPDATE OR DELETE ON "VocabularySourceEntry" FOR EACH ROW EXECUTE FUNCTION vocabulary_immutable_record();
CREATE TRIGGER vocabulary_document_immutable BEFORE UPDATE OR DELETE ON "VocabularyDocument" FOR EACH ROW EXECUTE FUNCTION vocabulary_immutable_record();

CREATE FUNCTION vocabulary_source_rights_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source "VocabularySource"; BEGIN
  SELECT s.* INTO source FROM "VocabularySource" s JOIN "VocabularyDocument" d ON d."sourceId"=s.id WHERE d.id=NEW."documentId" FOR SHARE OF s;
  IF source."rightsStatus" IS DISTINCT FROM 'APPROVED' OR NOT source."allowedUses" @> ARRAY['EXTRACT','STORE'] OR NOT source."allowedFields" @> ARRAY['FORM'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS'; END IF;
  IF NEW."permittedDefinition" IS NOT NULL AND NOT source."allowedFields" @> ARRAY['DEFINITION'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: definition'; END IF;
  IF NEW.pronunciation IS NOT NULL AND NOT source."allowedFields" @> ARRAY['PRONUNCIATION'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: pronunciation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_source_entry_rights BEFORE INSERT ON "VocabularySourceEntry" FOR EACH ROW EXECUTE FUNCTION vocabulary_source_rights_gate();

CREATE FUNCTION vocabulary_collection_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED','ARCHIVED') AND (TG_OP='DELETE' OR (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') OR NEW.status NOT IN ('PUBLISHED','ARCHIVED')) THEN RAISE EXCEPTION 'Published vocabulary snapshot is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_collection_version_immutable BEFORE UPDATE OR DELETE ON "VocabularyCollectionVersion" FOR EACH ROW EXECUTE FUNCTION vocabulary_collection_immutable();
CREATE FUNCTION vocabulary_member_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE version_id uuid; version_status text; BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO version_status FROM "VocabularyCollectionVersion" WHERE id=OLD."collectionVersionId" FOR SHARE;
    IF version_status IN ('PUBLISHED','ARCHIVED') THEN RAISE EXCEPTION 'Published vocabulary members are immutable'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    version_id := NEW."collectionVersionId";
    SELECT status INTO version_status FROM "VocabularyCollectionVersion" WHERE id=version_id FOR SHARE;
    IF version_status IN ('PUBLISHED','ARCHIVED') THEN RAISE EXCEPTION 'Published vocabulary members are immutable'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER vocabulary_member_immutable BEFORE INSERT OR UPDATE OR DELETE ON "VocabularyCollectionMember" FOR EACH ROW EXECUTE FUNCTION vocabulary_member_immutable();
