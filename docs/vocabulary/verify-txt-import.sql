-- Read-only verification. Run ONLY on the named isolated test database.
-- Counts refer to TXT occurrences, not unique words or official PDF totals.
SELECT current_database();

WITH scoped AS (
  SELECT e.*, d."cefrLevel" AS level
  FROM "VocabularySourceEntry" e
  JOIN "VocabularyDocument" d ON d.id = e."documentId"
  JOIN "VocabularySource" s ON s.id = d."sourceId"
  WHERE d."sourceFormat" = 'TXT'
    AND d.sha256 = 'a94a32fdaf896c0110842aacf4673eb7e510587e9da13e558ecc79cd8e0bd4fb'
    AND s."providerName" = 'LanGeek'
)
SELECT level,
  count(*) AS source_entries,
  count(DISTINCT id) AS distinct_occurrences,
  count(DISTINCT ("documentId", "sourceEntryKey")) AS distinct_source_keys,
  count(*) - count(DISTINCT (lower(regexp_replace(trim("parsedWord"), '\s+', ' ', 'g')), "normalizedPos")) AS repeated_form_pos_occurrences,
  count(*) FILTER (WHERE "sourceLineStart" IS NULL OR "sourceLineEnd" < "sourceLineStart") AS invalid_line_spans
FROM scoped
GROUP BY level
ORDER BY level;

SELECT d."cefrLevel", b.status, b."detectedRows", b.checkpoint,
  count(*) FILTER (WHERE r."validationState" = 'REVIEW_REQUIRED') AS pending_source_reviews
FROM "VocabularyBatch" b
JOIN "VocabularyDocument" d ON d.id = b."documentId"
JOIN "VocabularyBatchRow" r ON r."batchId" = b.id
WHERE d."sourceFormat" = 'TXT'
  AND d.sha256 = 'a94a32fdaf896c0110842aacf4673eb7e510587e9da13e558ecc79cd8e0bd4fb'
GROUP BY d."cefrLevel", b.id
ORDER BY d."cefrLevel";
