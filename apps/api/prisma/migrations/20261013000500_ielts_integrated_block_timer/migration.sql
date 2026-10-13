ALTER TABLE "IeltsIntegratedSessionBlock"
ADD COLUMN "startedAt" TIMESTAMP(3);

UPDATE "IeltsIntegratedSessionBlock" AS block
SET "startedAt" = session."startedAt"
FROM "IeltsIntegratedSession" AS session
WHERE block."sessionId" = session."id" AND block."order" = 1;
