ALTER TABLE "LanguageBlock" ADD COLUMN "normalizedExpression" TEXT NOT NULL DEFAULT '';
CREATE FUNCTION worklingo_normalize_vocabulary_expression(value TEXT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT lower(btrim(regexp_replace(normalize(value, NFKC), '[[:space:]]+', ' ', 'g'))) $$;
UPDATE "LanguageBlock" SET "normalizedExpression" = worklingo_normalize_vocabulary_expression("canonicalForm");
CREATE FUNCTION worklingo_sync_vocabulary_expression() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW."normalizedExpression" := worklingo_normalize_vocabulary_expression(NEW."canonicalForm"); RETURN NEW; END $$;
CREATE TRIGGER language_block_expression BEFORE INSERT OR UPDATE OF "canonicalForm" ON "LanguageBlock"
FOR EACH ROW EXECUTE FUNCTION worklingo_sync_vocabulary_expression();
CREATE INDEX "LanguageBlock_normalizedExpression_idx" ON "LanguageBlock"("normalizedExpression");

CREATE TABLE "LessonVocabularyUsage" (
  "lessonVersionId" UUID NOT NULL, "sourceWordBankSlug" TEXT NOT NULL, "sourceSlug" TEXT NOT NULL,
  "languageBlockId" UUID NOT NULL, "decision" TEXT NOT NULL,
  "topicGroupId" UUID, "topicName" TEXT, "topicNameEn" TEXT,
  CONSTRAINT "LessonVocabularyUsage_pkey" PRIMARY KEY ("lessonVersionId", "sourceWordBankSlug", "sourceSlug"),
  CONSTRAINT "LessonVocabularyUsage_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonVocabularyUsage_languageBlockId_fkey" FOREIGN KEY ("languageBlockId") REFERENCES "LanguageBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LessonVocabularyUsage_topicGroupId_fkey" FOREIGN KEY ("topicGroupId") REFERENCES "IntermediateTopicGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LessonVocabularyUsage_languageBlockId_idx" ON "LessonVocabularyUsage"("languageBlockId");
CREATE INDEX "LessonVocabularyUsage_topicGroupId_idx" ON "LessonVocabularyUsage"("topicGroupId");
INSERT INTO "LessonVocabularyUsage" ("lessonVersionId", "sourceWordBankSlug", "sourceSlug", "languageBlockId", "decision", "topicGroupId", "topicName", "topicNameEn")
SELECT version.id, bank->>'slug', block->>'slug', vocabulary.id, 'reuse', topic.id, topic.name, topic."nameEn"
FROM "LessonVersion" version
JOIN "Lesson" lesson ON lesson.id = version."lessonId"
LEFT JOIN "IntermediateTopicGroup" topic ON topic.id = lesson."topicGroupId"
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(version."parsedContent"->'wordBanks', '[]'::jsonb)) bank
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(bank->'languageBlocks', '[]'::jsonb)) block
JOIN "LanguageBlock" vocabulary ON vocabulary.id::TEXT = block->>'id'
WHERE version.status IN ('PUBLISHED', 'ARCHIVED') AND bank->>'slug' IS NOT NULL AND block->>'slug' IS NOT NULL
ON CONFLICT DO NOTHING;
