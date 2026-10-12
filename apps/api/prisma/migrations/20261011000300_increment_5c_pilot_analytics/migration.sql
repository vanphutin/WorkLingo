-- CreateEnum
CREATE TYPE "PilotMetricEventType" AS ENUM (
  'REGISTRATION_COMPLETED',
  'ONBOARDING_CONFIRMED',
  'LEARNING_SESSION_STARTED',
  'LEARNING_SESSION_COMPLETED',
  'LEARNING_SESSION_RESUMED',
  'PLACEMENT_CONFIRMED',
  'EVALUATION_TERMINAL',
  'CONTENT_IMPORT_VALIDATED',
  'CONTENT_PUBLISHED',
  'ENGAGEMENT_TARGET_MET'
);

-- CreateTable
CREATE TABLE "PilotMetricDaily" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dateKey" TEXT NOT NULL,
  "eventType" "PilotMetricEventType" NOT NULL,
  "dimensionKey" TEXT NOT NULL,
  "dimensions" JSONB NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotMetricDaily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PilotMetricDaily_count_check" CHECK ("count" >= 0)
);

-- CreateTable
CREATE TABLE "PilotMetricReceipt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceHash" TEXT NOT NULL,
  "eventType" "PilotMetricEventType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PilotMetricReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotMetricDaily_dateKey_eventType_dimensionKey_key"
  ON "PilotMetricDaily"("dateKey", "eventType", "dimensionKey");
CREATE INDEX "PilotMetricDaily_dateKey_eventType_idx"
  ON "PilotMetricDaily"("dateKey", "eventType");
CREATE INDEX "PilotMetricDaily_updatedAt_idx"
  ON "PilotMetricDaily"("updatedAt");
CREATE UNIQUE INDEX "PilotMetricReceipt_sourceHash_key"
  ON "PilotMetricReceipt"("sourceHash");
CREATE INDEX "PilotMetricReceipt_createdAt_idx"
  ON "PilotMetricReceipt"("createdAt");
