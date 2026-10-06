-- Backfill historical authored Language Blocks into the stable catalog.
INSERT INTO "LanguageBlock" (
  "id", "wordBankId", "slug", "canonicalForm", "meaning", "pronunciation",
  "collocations", "grammarPattern", "examples", "commonErrors", "cefrLevel",
  "transferContexts", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (block."slug")
  gen_random_uuid(), bank."wordBankId", block."slug", block."canonicalForm",
  block."meaning", block."pronunciation", block."collocations",
  block."grammarPattern", block."examples", block."commonErrors",
  block."cefrLevel", block."transferContexts", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "LanguageBlockVersion" AS block
JOIN "WordBankVersion" AS bank ON bank."id" = block."wordBankVersionId"
ORDER BY block."slug", bank."version" DESC, block."createdAt" DESC, block."id"
ON CONFLICT ("slug") DO NOTHING;
