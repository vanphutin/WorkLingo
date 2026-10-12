# Controlled Pilot Runbook

## Setup and start

1. Install Node.js 20, pnpm 10 and Docker Desktop.
2. Run `pnpm setup:local`; keep generated secrets in the untracked `.env` file.
3. Run `pnpm dev`.
4. Confirm API readiness at `http://127.0.0.1:3001/api/v1/health` and web at `http://127.0.0.1:3000`.

## Smoke checks

- Learner: register, select/test placement, start a session, submit one answer, reload and confirm checkpoint recovery.
- Admin: sign in, inspect Content, Curriculum, Audit, Operations, Analytics and Audio Settings.
- Operations: confirm queue depth/worker status and inspect only the scrubbed job timeline.
- Analytics: confirm bounded aggregate counts and definitions; never expect learner-level exports.

## Backup and restore

Create a backup with `pnpm backup:local`. For qualification or restore, always pass explicit `AllowedRoot`, schema and data paths. Restore requires an empty target schema and empty target data directory; manifest checksums and containment are verified before writes.

Run the isolated rehearsal with `pnpm qualify:recovery`. It does not target the normal local data directory.

Recovery point: the latest successful database dump plus files listed in its manifest. Data created after that timestamp is outside the recovery point.

## Restart and job recovery

Stop `pnpm dev` with Ctrl+C and start it again. Durable pending/retry-wait jobs remain in PostgreSQL; session plan/checkpoint and immutable `LessonVersion` references remain database-backed. Do not manually edit job state.

## Rollback decision

If a release fails before data migration, return to the previous Git revision. After an additive migration, prefer a forward fix. Only roll code back when the previous revision is compatible with the migrated schema; never use `git reset --hard` or delete the user's data. Restore into a new empty schema first, verify identity/count/checksums, then switch configuration deliberately.

## Shutdown

Stop API/web processes. Keep PostgreSQL running if local data is needed. Before stopping/removing Docker storage, create and verify a backup. Temporary qualification schemas are removed by their test teardown only.
