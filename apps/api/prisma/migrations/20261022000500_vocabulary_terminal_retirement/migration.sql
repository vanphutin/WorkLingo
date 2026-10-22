CREATE OR REPLACE FUNCTION vocabulary_collection_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='ARCHIVED' AND (TG_OP='DELETE' OR NEW.status IS DISTINCT FROM 'ARCHIVED') THEN RAISE EXCEPTION 'Archived vocabulary snapshot is terminal'; END IF;
  IF OLD.status IN ('PUBLISHED','ARCHIVED') AND (TG_OP='DELETE' OR (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') OR NEW.status NOT IN ('PUBLISHED','ARCHIVED')) THEN RAISE EXCEPTION 'Published vocabulary snapshot is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE FUNCTION vocabulary_retired_batch_publication_gate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='PUBLISHED' AND EXISTS (SELECT 1 FROM "VocabularyBatch" WHERE id=NEW."batchId" AND status='ROLLED_BACK') THEN RAISE EXCEPTION 'Retired vocabulary batch cannot be published'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER vocabulary_retired_batch_publication BEFORE INSERT OR UPDATE ON "VocabularyCollectionVersion" FOR EACH ROW EXECUTE FUNCTION vocabulary_retired_batch_publication_gate();
