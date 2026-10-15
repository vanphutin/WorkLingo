CREATE TABLE "AiRoutingSetting" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "preferredProvider" TEXT NOT NULL DEFAULT 'system-default',
    "fallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiRoutingSetting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AiRoutingSetting_scope_check" CHECK (
      ("id" = 'system' AND "userId" IS NULL AND "preferredProvider" IN ('discovery', 'openai')) OR
      ("id" = "userId"::text AND "userId" IS NOT NULL AND "preferredProvider" IN ('system-default', 'discovery', 'openai'))
    )
);
CREATE UNIQUE INDEX "AiRoutingSetting_userId_key" ON "AiRoutingSetting"("userId");
ALTER TABLE "AiRoutingSetting" ADD CONSTRAINT "AiRoutingSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
