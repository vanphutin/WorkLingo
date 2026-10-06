CREATE FUNCTION reject_mastery_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  learner_still_exists boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."User" WHERE "id" = $1)', TG_TABLE_SCHEMA)
      INTO learner_still_exists USING OLD."learnerId";
    IF NOT learner_still_exists THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'Mastery events are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER mastery_event_append_only
BEFORE UPDATE OR DELETE ON "MasteryEvent"
FOR EACH ROW EXECUTE FUNCTION reject_mastery_event_mutation();
