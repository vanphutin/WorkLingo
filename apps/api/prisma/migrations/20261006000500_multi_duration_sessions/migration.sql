-- AlterTable
ALTER TABLE "LearningSession" DROP CONSTRAINT IF EXISTS "LearningSession_duration_check";
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_duration_check"
  CHECK ("durationMinutes" IN (45, 60, 90, 120, 150));

-- AlterTable
ALTER TABLE "SessionBlock" DROP CONSTRAINT IF EXISTS "SessionBlock_order_check";
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_order_check"
  CHECK ("order" BETWEEN 1 AND 10);