-- Missing grants must fail closed even for operational/direct SQL writes.
-- Existing NULL records require an explicit authorization correction before deploy;
-- this migration never invents a grant or silently changes source approval.
ALTER TABLE "VocabularySource" ALTER COLUMN "allowedUses" SET NOT NULL;
ALTER TABLE "VocabularySource" ALTER COLUMN "allowedFields" SET NOT NULL;
