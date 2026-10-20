CREATE TABLE "IntermediateTopicReview" (
  "contentImportId" UUID NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "sourceHash" TEXT NOT NULL,
  "draftRevision" INTEGER NOT NULL,
  "proposal" JSONB,
  "approvedPlan" JSONB,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntermediateTopicReview_pkey" PRIMARY KEY ("contentImportId"),
  CONSTRAINT "IntermediateTopicReview_contentImportId_fkey" FOREIGN KEY ("contentImportId") REFERENCES "ContentImport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IntermediateTopicReview_revisions_check" CHECK ("revision" > 0 AND "draftRevision" > 0),
  CONSTRAINT "IntermediateTopicReview_approval_check" CHECK (
    ("approvedPlan" IS NULL AND "approvedById" IS NULL AND "approvedAt" IS NULL) OR
    ("approvedPlan" IS NOT NULL AND "approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL)
  )
);
