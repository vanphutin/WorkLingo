-- AlterTable
ALTER TABLE "IeltsMockAttempt" ADD COLUMN     "clockUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "elapsedMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "policyVersion" TEXT NOT NULL DEFAULT 'legacy-v1';

-- CreateTable
CREATE TABLE "IeltsIntroductionVisit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "learnerId" UUID NOT NULL,
    "orientationVersionId" UUID NOT NULL,
    "lastSlideIndex" INTEGER NOT NULL DEFAULT 0,
    "visitedSlideIds" JSONB NOT NULL DEFAULT '[]',
    "viewedAllAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsIntroductionVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsTopic" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "draftRevision" INTEGER NOT NULL DEFAULT 1,
    "draftContent" JSONB NOT NULL,
    "currentPublishedVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsTopicVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topicId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "content" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "IeltsTopicVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsTopicSession" (
    "sessionId" UUID NOT NULL,
    "topicVersionId" UUID NOT NULL,
    "packSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsTopicSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "IeltsMockPlayback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "clientPlayId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeltsMockPlayback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeltsMockRecording" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "clientRecordingId" UUID NOT NULL,
    "part" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "retainUntil" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IeltsMockRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IeltsIntroductionVisit_learnerId_updatedAt_idx" ON "IeltsIntroductionVisit"("learnerId", "updatedAt");

-- CreateIndex
CREATE INDEX "IeltsIntroductionVisit_orientationVersionId_idx" ON "IeltsIntroductionVisit"("orientationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsIntroductionVisit_learnerId_orientationVersionId_key" ON "IeltsIntroductionVisit"("learnerId", "orientationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsTopic_slug_key" ON "IeltsTopic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsTopic_currentPublishedVersionId_key" ON "IeltsTopic"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "IeltsTopicVersion_status_publishedAt_idx" ON "IeltsTopicVersion"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsTopicVersion_topicId_version_key" ON "IeltsTopicVersion"("topicId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsTopicVersion_id_topicId_key" ON "IeltsTopicVersion"("id", "topicId");

-- CreateIndex
CREATE INDEX "IeltsTopicSession_topicVersionId_idx" ON "IeltsTopicSession"("topicVersionId");

-- CreateIndex
CREATE INDEX "IeltsMockPlayback_assetId_idx" ON "IeltsMockPlayback"("assetId");

-- CreateIndex
CREATE INDEX "IeltsMockPlayback_expiresAt_idx" ON "IeltsMockPlayback"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsMockPlayback_attemptId_assetId_key" ON "IeltsMockPlayback"("attemptId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsMockPlayback_attemptId_clientPlayId_key" ON "IeltsMockPlayback"("attemptId", "clientPlayId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsMockRecording_storageKey_key" ON "IeltsMockRecording"("storageKey");

-- CreateIndex
CREATE INDEX "IeltsMockRecording_attemptId_part_idx" ON "IeltsMockRecording"("attemptId", "part");

-- CreateIndex
CREATE INDEX "IeltsMockRecording_retainUntil_deletedAt_idx" ON "IeltsMockRecording"("retainUntil", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsMockRecording_attemptId_clientRecordingId_key" ON "IeltsMockRecording"("attemptId", "clientRecordingId");

-- AddForeignKey
ALTER TABLE "IeltsIntroductionVisit" ADD CONSTRAINT "IeltsIntroductionVisit_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsIntroductionVisit" ADD CONSTRAINT "IeltsIntroductionVisit_orientationVersionId_fkey" FOREIGN KEY ("orientationVersionId") REFERENCES "IeltsOrientationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsTopic" ADD CONSTRAINT "IeltsTopic_currentPublishedVersionId_id_fkey" FOREIGN KEY ("currentPublishedVersionId", "id") REFERENCES "IeltsTopicVersion"("id", "topicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsTopicVersion" ADD CONSTRAINT "IeltsTopicVersion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "IeltsTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsTopicSession" ADD CONSTRAINT "IeltsTopicSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsTopicSession" ADD CONSTRAINT "IeltsTopicSession_topicVersionId_fkey" FOREIGN KEY ("topicVersionId") REFERENCES "IeltsTopicVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsMockPlayback" ADD CONSTRAINT "IeltsMockPlayback_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "IeltsMockAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IeltsMockRecording" ADD CONSTRAINT "IeltsMockRecording_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "IeltsMockAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IeltsIntroductionVisit" ADD CONSTRAINT "IeltsIntroductionVisit_bounds" CHECK ("lastSlideIndex" >= 0 AND "revision" > 0 AND jsonb_typeof("visitedSlideIds") = 'array');
ALTER TABLE "IeltsTopic" ADD CONSTRAINT "IeltsTopic_revision" CHECK ("draftRevision" > 0);
ALTER TABLE "IeltsTopicVersion" ADD CONSTRAINT "IeltsTopicVersion_bounds" CHECK ("version" > 0 AND "status" IN ('PUBLISHED','ARCHIVED'));
ALTER TABLE "IeltsMockAttempt" ADD CONSTRAINT "IeltsMockAttempt_policy" CHECK ("policyVersion" IN ('legacy-v1','v2') AND "elapsedMs" >= 0 AND ("policyVersion" <> 'v2' OR "mode" IN ('PRACTICE','EXAM_SIMULATION')));
ALTER TABLE "IeltsMockRecording" ADD CONSTRAINT "IeltsMockRecording_bounds" CHECK ("part" BETWEEN 1 AND 3 AND "byteSize" > 0 AND "durationSeconds" > 0 AND "retainUntil" > "consentedAt");
CREATE FUNCTION protect_ielts_topic_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published IELTS topic cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."topicId" IS DISTINCT FROM OLD."topicId" OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."sourceHash" IS DISTINCT FROM OLD."sourceHash" OR NEW."content" IS DISTINCT FROM OLD."content" OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN RAISE EXCEPTION 'Published IELTS topic snapshot is immutable'; END IF;
  IF OLD."status" = 'ARCHIVED' AND NEW."status" <> 'ARCHIVED' THEN RAISE EXCEPTION 'Archived topic cannot be republished'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "IeltsTopicVersion_immutable" BEFORE UPDATE OR DELETE ON "IeltsTopicVersion" FOR EACH ROW EXECUTE FUNCTION protect_ielts_topic_version();
