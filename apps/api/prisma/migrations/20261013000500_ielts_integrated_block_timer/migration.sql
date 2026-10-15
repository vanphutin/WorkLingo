ALTER TABLE "IeltsIntegratedSessionBlock"
ADD COLUMN "startedAt" TIMESTAMP(3);

UPDATE "IeltsIntegratedSessionBlock" AS block
SET "startedAt" = CASE WHEN session."currentBlockIndex" = 0 THEN session."startedAt" ELSE session."updatedAt" END
FROM "IeltsIntegratedSession" AS session
WHERE block."sessionId" = session."id"
  AND session."completedAt" IS NULL
  AND block."order" = session."currentBlockIndex" + 1;
