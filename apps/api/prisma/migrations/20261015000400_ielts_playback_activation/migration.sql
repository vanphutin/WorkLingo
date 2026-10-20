ALTER TABLE "IeltsMockPlayback" ADD COLUMN "activatedAt" TIMESTAMP(3);
-- Existing leases already started under the previous policy.
UPDATE "IeltsMockPlayback" SET "activatedAt" = "createdAt";
