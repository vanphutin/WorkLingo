-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "consumed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_scope_subjectHash_windowStart_key" ON "RateLimitBucket"("scope", "subjectHash", "windowStart");

-- CreateIndex
CREATE INDEX "RateLimitBucket_scope_subjectHash_idx" ON "RateLimitBucket"("scope", "subjectHash");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");
