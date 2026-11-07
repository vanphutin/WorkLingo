# Database migration report

Status: additive migration IMPLEMENTED / TESTED / VERIFIED on owned disposable PostgreSQL. See test-execution-report.md. AI_QUALIFIED: unrelated/BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Migration: apps/api/prisma/migrations/20261107000100_versioned_assessment_history/migration.sql.

Creates EvaluationRun with UUID identity, ActivityAttempt reference, per-attempt UUID request key, previous-run reference, input/context hashes, status, positive generation, nullable lease/result/audit JSON, and timestamps. Status and generation check constraints reject invalid values. Indexes support unique (attemptId,requestKey), attempt history ordering and status/lease recovery.

Existing EvaluationResult remains unchanged, including unique (attemptId,rubricVersion), required legacy score and prior rows. No old calibration/result data is erased or rewritten. Re-evaluation writes a new EvaluationRun and preserves the previous decision link.

A BEFORE UPDATE OR DELETE trigger rejects all changes to terminal statuses SCORED/NEEDS_REVIEW/NOT_SCORABLE/FAILED/CANCELLED. For nonterminal rows it also rejects changes to attempt/key/hash/previous/created identity. Generation-fenced application writes resolve stale-worker races; the trigger alone does not provide lease ownership.

Both ActivityAttempt and previous-run foreign keys use ON DELETE RESTRICT. This protects history but blocks ordinary cascading learner/attempt deletion. Retention/erasure policy must explicitly reconcile this before production use; no destructive cleanup is authorized here.

All 51 migrations were applied on the owned 55452 database. The recovery integration suite verifies legacy uniqueness preservation and immutability, generation recovery, cancellation and authorization. Its DDL rehearsal creates a fresh UUID schema with the prerequisite legacy table shape, applies the additive migration, reverses the empty EvaluationRun table/function, proves the prerequisite table remains, and reapplies. This is a successful isolated empty-DDL reversal, not a populated-history rollback or production down migration. Never drop history in a shared/production database to demonstrate rollback. Production rollback must preserve append-only decisions and requires its own backup/restore plan.
