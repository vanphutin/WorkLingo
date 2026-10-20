-- Administrative early access is separate from earned learning evidence.
-- Existing and future learners remain gated unless explicitly granted access.
ALTER TABLE "LearnerProfile" ADD COLUMN "ieltsEarlyAccess" BOOLEAN NOT NULL DEFAULT false;
