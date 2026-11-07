CREATE TABLE "EvaluationRun" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "attemptId" UUID NOT NULL, "requestKey" UUID NOT NULL,
 "previousRunId" UUID, "contextHash" TEXT NOT NULL, "inputHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'RECEIVED', "generation" INTEGER NOT NULL DEFAULT 1,
 "leaseUntil" TIMESTAMP(3), "result" JSONB, "audit" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "EvaluationRun_status_check" CHECK ("status" IN ('RECEIVED','VALIDATING','EVALUATING','SCORED','NEEDS_REVIEW','NOT_SCORABLE','FAILED','CANCELLED')),
 CONSTRAINT "EvaluationRun_generation_check" CHECK ("generation">0),
 CONSTRAINT "EvaluationRun_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ActivityAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "EvaluationRun_previousRunId_fkey" FOREIGN KEY ("previousRunId") REFERENCES "EvaluationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EvaluationRun_attemptId_requestKey_key" ON "EvaluationRun"("attemptId","requestKey");
CREATE INDEX "EvaluationRun_attemptId_createdAt_idx" ON "EvaluationRun"("attemptId","createdAt");
CREATE INDEX "EvaluationRun_status_leaseUntil_idx" ON "EvaluationRun"("status","leaseUntil");
CREATE FUNCTION protect_terminal_evaluation_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."status" IN ('SCORED','NEEDS_REVIEW','NOT_SCORABLE','FAILED','CANCELLED') THEN
  RAISE EXCEPTION 'TERMINAL_EVALUATION_RUN_IMMUTABLE';
 END IF;
 IF TG_OP='UPDATE' AND (NEW."attemptId"<>OLD."attemptId" OR NEW."requestKey"<>OLD."requestKey" OR NEW."contextHash"<>OLD."contextHash" OR NEW."inputHash"<>OLD."inputHash" OR NEW."previousRunId" IS DISTINCT FROM OLD."previousRunId" OR NEW."createdAt"<>OLD."createdAt") THEN
  RAISE EXCEPTION 'EVALUATION_RUN_IDENTITY_IMMUTABLE';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "EvaluationRun_immutable" BEFORE UPDATE OR DELETE ON "EvaluationRun" FOR EACH ROW EXECUTE FUNCTION protect_terminal_evaluation_run();
