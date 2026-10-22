-- Additive safeguards: do not rewrite applied migration checksums or legacy content.
ALTER TABLE "IntermediateTopicGroup" ADD COLUMN "parentId" UUID;
ALTER TABLE "IntermediateTopicGroup" ADD CONSTRAINT "IntermediateTopicGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IntermediateTopicGroup"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntermediateTopicGroup" ADD CONSTRAINT "topic_not_own_parent" CHECK ("parentId" IS DISTINCT FROM id);
CREATE INDEX "IntermediateTopicGroup_parentId_idx" ON "IntermediateTopicGroup"("parentId");
ALTER TABLE "VocabularyBatchRow" ADD COLUMN "reviewedBy" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
-- Earlier staged decisions remain historical; never invent reviewer identities for them.
ALTER TABLE "VocabularyBatchRow" ADD CONSTRAINT "vocabulary_review_evidence" CHECK ("validationState" = 'REVIEW_REQUIRED' OR (length(btrim("reviewedBy")) > 0 AND "reviewedBy" IS NOT NULL AND "reviewedAt" IS NOT NULL)) NOT VALID;

CREATE FUNCTION vocabulary_derived_rights_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source "VocabularySource"; BEGIN
  SELECT * INTO source FROM "VocabularySource" WHERE id=NEW."sourceId" FOR SHARE;
  IF source."rightsStatus" IS DISTINCT FROM 'APPROVED' OR source."permissionReference" IS NULL OR length(btrim(source."permissionReference"))=0 OR NOT source."allowedUses" @> ARRAY['EXTRACT','STORE'] OR NOT source."allowedFields" @> ARRAY['FORM'] OR length(btrim(NEW."rightsBasis"))=0 THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS'; END IF;
  IF TG_TABLE_NAME='LexicalSense' THEN
    IF (to_jsonb(NEW)->>'definition') IS NOT NULL AND NOT source."allowedFields" @> ARRAY['DEFINITION'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: definition'; END IF;
    IF (to_jsonb(NEW)->>'translation') IS NOT NULL AND NOT source."allowedUses" @> ARRAY['TRANSLATE'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: translation'; END IF;
  ELSE
    IF NOT source."allowedFields" @> ARRAY['PRONUNCIATION'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: pronunciation'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_sense_rights BEFORE INSERT OR UPDATE ON "LexicalSense" FOR EACH ROW EXECUTE FUNCTION vocabulary_derived_rights_gate();
CREATE TRIGGER vocabulary_pronunciation_rights BEFORE INSERT OR UPDATE ON "LexicalPronunciation" FOR EACH ROW EXECUTE FUNCTION vocabulary_derived_rights_gate();

CREATE TRIGGER vocabulary_resolution_immutable BEFORE UPDATE OR DELETE ON "VocabularyEntryResolution" FOR EACH ROW EXECUTE FUNCTION vocabulary_immutable_record();
CREATE TRIGGER vocabulary_cefr_immutable BEFORE UPDATE OR DELETE ON "LexicalCefrAssociation" FOR EACH ROW EXECUTE FUNCTION vocabulary_immutable_record();

CREATE FUNCTION vocabulary_published_lexical_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "VocabularyCollectionMember" m JOIN "VocabularyCollectionVersion" v ON v.id=m."collectionVersionId" WHERE v.status IN ('PUBLISHED','ARCHIVED') AND ((TG_TABLE_NAME='LexicalSense' AND m."senseId"=OLD.id) OR (TG_TABLE_NAME='LexicalEntry' AND m."lexicalEntryId"=OLD.id))) THEN RAISE EXCEPTION 'Published vocabulary lexical snapshot is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_0_sense_immutable BEFORE UPDATE OR DELETE ON "LexicalSense" FOR EACH ROW EXECUTE FUNCTION vocabulary_published_lexical_immutable();
CREATE TRIGGER vocabulary_entry_immutable BEFORE UPDATE OR DELETE ON "LexicalEntry" FOR EACH ROW EXECUTE FUNCTION vocabulary_published_lexical_immutable();

CREATE FUNCTION vocabulary_publication_rights_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE member RECORD; source "VocabularySource"; BEGIN
  IF NEW.status <> 'PUBLISHED' OR (TG_OP='UPDATE' AND OLD.status='PUBLISHED') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM "VocabularyCollectionMember" WHERE "collectionVersionId"=NEW.id) THEN RAISE EXCEPTION 'VOCABULARY_INCOMPLETE'; END IF;
  FOR member IN SELECT s.*, e."editorialStatus" AS entry_status FROM "VocabularyCollectionMember" m JOIN "LexicalSense" s ON s.id=m."senseId" JOIN "LexicalEntry" e ON e.id=m."lexicalEntryId" WHERE m."collectionVersionId"=NEW.id ORDER BY s.id FOR SHARE OF s,e LOOP
    SELECT * INTO source FROM "VocabularySource" WHERE id=member."sourceId" FOR SHARE;
    IF member."editorialStatus" <> 'REVIEWED' OR member.entry_status <> 'REVIEWED' THEN RAISE EXCEPTION 'VOCABULARY_SENSE_UNREVIEWED'; END IF;
    IF source."rightsStatus" IS DISTINCT FROM 'APPROVED' OR NOT source."allowedUses" @> ARRAY['EXTRACT','STORE'] OR NOT source."allowedFields" @> ARRAY['FORM'] OR (member.definition IS NOT NULL AND NOT source."allowedFields" @> ARRAY['DEFINITION']) THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS'; END IF;
    IF EXISTS (SELECT 1 FROM "VocabularyEntryResolution" r JOIN "VocabularySourceEntry" o ON o.id=r."sourceEntryId" JOIN "VocabularyDocument" d ON d.id=o."documentId" JOIN "VocabularySource" s ON s.id=d."sourceId" WHERE r."senseId"=member.id AND (s."rightsStatus" <> 'APPROVED' OR NOT s."allowedUses" @> ARRAY['EXTRACT','STORE'] OR NOT s."allowedFields" @> ARRAY['FORM'] OR (o."permittedDefinition" IS NOT NULL AND NOT s."allowedFields" @> ARRAY['DEFINITION']) OR (o.pronunciation IS NOT NULL AND NOT s."allowedFields" @> ARRAY['PRONUNCIATION']))) THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: provenance'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_publication_rights BEFORE INSERT OR UPDATE ON "VocabularyCollectionVersion" FOR EACH ROW EXECUTE FUNCTION vocabulary_publication_rights_gate();

CREATE FUNCTION vocabulary_batch_identity_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."documentId",NEW."parserVersion",NEW.inventory,NEW."inventoryHash",NEW."detectedRows") IS DISTINCT FROM (OLD."documentId",OLD."parserVersion",OLD.inventory,OLD."inventoryHash",OLD."detectedRows") THEN RAISE EXCEPTION 'Vocabulary batch inventory is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_batch_identity BEFORE UPDATE ON "VocabularyBatch" FOR EACH ROW EXECUTE FUNCTION vocabulary_batch_identity_immutable();
