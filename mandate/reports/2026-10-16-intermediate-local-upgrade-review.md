# Local database upgrade proposed for W0 completion

Date: 2026-10-16, Asia/Saigon. Status: optional maintenance proposal, prepared and rehearsed; **not authorized or applied to public**. W0's actual-local legacy inventory was obtained read-only, so this upgrade is not needed to finish baseline discovery.

## Exact proposed action

Apply the 15 existing pending Prisma migrations at revision `efa2fd99b5373a644a011af3787bf81f737a51a7` to the configured local database at loopback port 55432, schema `public`. The exact names and current applied state are in [schema status](2026-10-16-intermediate-schema-status.json). Then run the bounded read-only W0 inventory and save safe aggregate evidence. Do not seed lesson content, reset the database, move Foundation to Beginner, change historical scores, publish B1 content or contact providers.

This upgrades existing local data to the repository's current schema. Notable existing migration effects include adding catalog programs, assigning existing paths to Intermediate, creating enrollment records and setting activeProgramId for completed learners, inferring Level publication state, and adding engagement/Admin/IELTS/settings tables. These are existing repository migrations, not implementation of the new B1 path. The actual existing learner row count is not exported.

## Evidence already prepared

- Native backup plus verified manifest: `D:/Projects/WorkLingo/.superpowers/backups/intermediate-preupgrade/backup-20261016-083132-9bdecada`.
- Database dump SHA256: `d9120880d1c0881489114aa28389e6d343a89c18eebe439692fe6586f0d7de5b`.
- Restore and migration rehearsal passed in a disposable schema: 31 migrations applied; original columns/rows across 36 application tables (96 rows) unchanged. New fields and migration bookkeeping excluded. Disposable schema removed.
- [Safe preflight results](2026-10-16-intermediate-upgrade-preflight.json) and [inventory of the migrated copy](2026-10-16-intermediate-rehearsal-inventory.json).
- Existing curriculum-seed/session integration suites: 27/27 PASS in their own disposable schemas.

## Execution and recovery boundaries if approved

1. Recheck the configured local target, service readiness, applied migrations and repository revision. If state differs from preflight, stop and assess the difference; do not silently expand the migration list.
2. Pause local application writers and create a fresh native backup before upgrading. Keep the verified backup above as an additional recovery point.
3. Run `pnpm --filter @worklingo/api exec prisma migrate deploy` with the confirmed local root environment. No seed, `migrate reset`, schema push or automatic migration repair.
4. Confirm all 31 migrations finished; run the read-only inventory. Compare original columns/row counts with the fresh backup to detect unexpected legacy changes. Report migration-generated fields separately.
5. On failure, stop application access and retain the failed target for diagnosis. Restore the fresh pre-upgrade backup into a **new empty recovery schema and new empty data directory** using the repository restore script and manifest verification; validate recovery there before pointing the local application at it. Never overwrite occupied public data or perform a blind destructive rollback. No production/remote database or cloud deployment is in scope.

## Approval needed

Direct human approval must specifically cover the local schema upgrade, its existing program/enrollment backfills and the recovery procedure above. Accepted D1 product direction and W0 read-only approval do not themselves authorize those public-data mutations. Source: [Mandate Steward](../../.agents/skills/mandate-steward/SKILL.md), APPROVE step: “Large, breaking, data, security, external or release changes require specific scope and rollback approval.”
