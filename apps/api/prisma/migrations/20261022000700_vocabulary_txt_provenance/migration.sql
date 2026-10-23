-- TXT locations describe logical topic sections and source lines, never PDF geometry.
ALTER TABLE "VocabularyDocument" ADD COLUMN "sourceFormat" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "VocabularyDocument" ADD CONSTRAINT "vocabulary_document_source_format" CHECK ("sourceFormat" IN ('PDF','TXT'));
ALTER TABLE "VocabularySourceEntry" ADD COLUMN "sourceLineStart" INTEGER;
ALTER TABLE "VocabularySourceEntry" ADD COLUMN "sourceLineEnd" INTEGER;
ALTER TABLE "VocabularySourceEntry" ADD CONSTRAINT "vocabulary_source_line_span" CHECK (
  ("sourceLineStart" IS NULL AND "sourceLineEnd" IS NULL) OR
  ("sourceLineStart" IS NOT NULL AND "sourceLineEnd" IS NOT NULL AND "sourceLineStart">0 AND "sourceLineEnd">="sourceLineStart")
);
