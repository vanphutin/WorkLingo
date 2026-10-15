ALTER TABLE "IeltsMockAttempt"
ADD COLUMN "audioPlayEvents" JSONB NOT NULL DEFAULT '{}'::jsonb;
