-- Exception resolutions are review evidence; the original inventory remains immutable.
ALTER TABLE "VocabularyBatchRow" ADD COLUMN "resolvedExceptions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "VocabularyBatchRow" ADD CONSTRAINT "vocabulary_exception_resolution_array" CHECK (jsonb_typeof("resolvedExceptions")='array');
