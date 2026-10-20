-- AlterTable
ALTER TABLE "IeltsMockPlayback" ADD COLUMN     "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IeltsMockRecording" ADD COLUMN     "consentPolicyVersion" TEXT NOT NULL DEFAULT 'ielts-mock-speaking-v1',
ADD COLUMN     "consentScope" TEXT NOT NULL DEFAULT 'ielts-mock-speaking-review';
