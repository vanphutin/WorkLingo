-- Explicit source dialect metadata, defaulting to no asserted dialect.
ALTER TABLE "VocabularySource" ADD COLUMN "pronunciationDialect" TEXT NOT NULL DEFAULT 'und';
ALTER TABLE "VocabularySource" ADD CONSTRAINT "vocabulary_source_dialect" CHECK ("pronunciationDialect" IN ('en-US','en-GB','und'));
-- A reviewed interpretation never rewrites the original immutable occurrence.
ALTER TABLE "VocabularyBatchRow" ADD COLUMN "reviewCorrection" JSONB;
CREATE FUNCTION vocabulary_review_decision_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."validationState" <> 'REVIEW_REQUIRED' AND (TG_OP='DELETE' OR to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN RAISE EXCEPTION 'Reviewed vocabulary decision is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_review_decision_immutable BEFORE UPDATE OR DELETE ON "VocabularyBatchRow" FOR EACH ROW EXECUTE FUNCTION vocabulary_review_decision_immutable();

CREATE FUNCTION vocabulary_publication_translation_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source "VocabularySource"; member RECORD; BEGIN
  IF NEW.status <> 'PUBLISHED' THEN RETURN NEW; END IF;
  FOR member IN SELECT s."sourceId" FROM "VocabularyCollectionMember" m JOIN "LexicalSense" s ON s.id=m."senseId" WHERE m."collectionVersionId"=NEW.id AND s.translation IS NOT NULL ORDER BY s."sourceId" LOOP
    SELECT * INTO source FROM "VocabularySource" WHERE id=member."sourceId" FOR SHARE;
    IF source."rightsStatus" IS DISTINCT FROM 'APPROVED' OR NOT source."allowedUses" @> ARRAY['EXTRACT','STORE','TRANSLATE'] THEN RAISE EXCEPTION 'BLOCKED_BY_RIGHTS: translation'; END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_publication_translation BEFORE INSERT OR UPDATE ON "VocabularyCollectionVersion" FOR EACH ROW EXECUTE FUNCTION vocabulary_publication_translation_gate();
