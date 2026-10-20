-- Topic stages use the administrator-approved allocation, rather than fixed 15-minute blocks.
ALTER TABLE "SessionBlock" DROP CONSTRAINT "SessionBlock_minutes_check";
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_minutes_check"
  CHECK ("targetMinutes" BETWEEN 1 AND 150);
