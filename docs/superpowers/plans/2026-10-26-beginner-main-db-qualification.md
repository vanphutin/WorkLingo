# Beginner R1.2a Main Database Qualification Implementation Plan

> **For agentic workers:** after matching human approval only, use superpowers:executing-plans task-by-task. Current task is read-only audit and governance capture; no code, startup, backup or DB writes yet.

**Goal:** Qualify R1.2a with fixture-only integration/E2E on the existing main worklingo database, preserving all existing data and using one bounded approval.

**Architecture:** Explicit CONTROLLED_MAIN_DB capability alongside unchanged legacy isolated mode; current ASUS operator is trusted, not presented as a separate OS security principal. A dedicated limited PostgreSQL login is proposed inside the existing cluster. The existing superuser remains only in the bootstrap/backup/cleanup coordinator, never runtime children.

**Tech Stack:** Existing PostgreSQL17.11/Docker image, Prisma6.19.1, Node/pnpm, Vitest/Playwright and synthetic local WAV fixtures. No new Windows worker, database, schema clone, PostgreSQL instance or dependency install.

**Spec:** Owner USE MAIN DATABASE FOR R1.2a message; [existing R1.2a plan](2026-10-24-beginner-r12a-implementation.md), [audit](../../../mandate/reports/2026-10-26-beginner-main-db-review.md), [exact scope](../../../mandate/reports/2026-10-26-beginner-main-db-scope.json).

## Global constraints and observed baseline

- Baseline 98b0e72b8dd1f42eed002b2b14802ee249e91753 / codex/foundation-basic-readiness; clean feature worktree. Preserve R1.1/P1/retirement verification and original parent captured/null. Old isolated approval is not reused.
- Endpoint127.0.0.1:55432, database worklingo, volume infra_worklingo-postgres; reuse ONLY existing container dfc7473d056cb648ca71d6a7cb4343279413e417038334f254c587692b75b151. Never start stopped alias infra-postgres-1 on the same volume.
- Both containers are currently stopped. Docker metadata/entrypoint/cmd/image/mount verified; live SQL identity/counts/schema are NOT freshly verified. Last SQL snapshot 2026-10-26T07:25:24.775Z confirmed systemID7692646346822291490, OID16384, cluster_name empty,97 tables and nonempty accounts/vocabulary/topics.
- Snapshot:8744 source occurrences,8129 lexical entries,8742 senses,2 accounts,9 sessions,1 learner profile,377 topic groups/687 names. Preserve every pre-existing row, not just these named tables.
-47 migration.sql plus migration_lock.toml=48 locked files; last history47 applied/4 rolled-back/0 pending/0 current failed. Three checksums remain unexplained after all local Git file history, formatting, primary checkout and bounded in-memory reconstruction comparisons. No migration/history/checksum changes permitted.
- No migrations, migrate reset/dev/deploy/resolve, db push, DROP DATABASE/SCHEMA, TRUNCATE, DROP OWNED, broad deletes, global PUBLIC grants/revokes, ownership/RLS/trigger/table alterations, actual restore, APPROVED_RELEASE, real content/enrollment/provider, next increment, merge/push/deploy.
- Backup and role/bootstrap/fixture writes require this NEW matching approval. Backup NOT_RUN now. No restore target is authorized; RESTORE_NOT_TESTED is an explicit residual risk, never PASS.

## Exact source allowlist and interfaces

Modify only:

- apps/api/src/beginner/beginner-admin.controller.spec.ts
- apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts
- apps/api/src/beginner/domain/beginner-environment-preflight.ts
- apps/api/src/common/config/app-config.module.spec.ts
- apps/api/src/common/config/app-config.module.ts
- apps/api/test/integration/beginner-authoring.integration.spec.ts
- apps/api/test/integration/beginner-release-registry.integration.spec.ts
- apps/api/test/integration/beginner-test-harness.ts
- apps/api/vitest.beginner.integration.config.ts
- apps/web/e2e/beginner-admin-history.spec.ts
- apps/web/e2e/beginner-admin.spec.ts
- apps/web/playwright.beginner-admin.config.ts
- packages/contracts/src/beginner-authoring.contracts.spec.ts
- packages/contracts/src/beginner-authoring.contracts.ts

Create only:

- apps/api/prisma.beginner-main.config.ts
- apps/api/test/beginner-main/backup.spec.ts
- apps/api/test/beginner-main/backup.ts
- apps/api/test/beginner-main/egress-guard.cjs
- apps/api/test/beginner-main/environment.spec.ts
- apps/api/test/beginner-main/environment.ts
- apps/api/test/beginner-main/fixtures.spec.ts
- apps/api/test/beginner-main/fixtures.ts
- apps/api/test/beginner-main/run.spec.ts
- apps/api/test/beginner-main/run.ts
- apps/api/test/beginner-main/server.ts
- apps/api/vitest.beginner-main-tools.config.ts

No production publisher/authoring/lifecycle/learner service or Prisma schema/migration edit. Reuse those services and existing synthetic source factory. Optional controller-spec change only if its known HTTP-mock flake is reproduced and diagnosed; do not mask failures/retry to claim PASS.

Permission v1 retains its existing shape and checks. Add a strictly validated v2 CONTROLLED_MAIN_DB record bound to this mandate/scope hash, actual human authorization, run/manifest IDs, database OID/systemID/empty clusterName, exact role/paths/actions and4h one-run expiry. Runtime flags must be test + WORKLINGO_BEGINNER_MAIN_TEST=1; reject dual mode flags. V2 uses trusted-operator hash checks, not a false read-only/elevation ACL claim. Absent/invalid permission denies; no change to normal Intermediate/IELTS/legacy mode.

New helpers: run.ts owns the exact action state machine and command/environment allowlist; environment.ts verifies scope/authority/identities/privileges/cleanup; backup.ts streams and validates private dumps; fixtures.ts owns preallocated IDs, transactional creation ledger, guarded Prisma access and dependency cleanup; server.ts binds existing Admin guards/services with explicit DB/storage and fake-provider/test-only infrastructure overrides. Exported interfaces and assertions are pinned in their co-located tests; no arbitrary command passthrough.

## Helper contracts pinned before implementation

- environment.ts: readMainScope(scopePath:string):MainScope; verifyMainPreflight(scope:MainScope,evidence:MainEvidence):void. Evidence is collected read-only; identity/privilege/authority failure throws before mutation.
- run.ts: runMainAction(scopePath:string,action:MainAction):Promise<PhaseReceipt>. MainAction is exactly the scoped4 actions. Each receipt binds predecessor receipt hash, run/cluster/database/role identity, phase, actual result and owned-resource keys; no caller-provided SQL or command string.
- backup.ts: createMainBackup(scope:MainScope,io:BackupIO):Promise<BackupReceipt>; validateMainBackup(scope:MainScope,receipt:BackupReceipt,io:BackupIO):Promise<void>. Receipt records archive path/size/SHA256/full-decode exits and restoreStatus NOT_TESTED; binary output remains private.
- fixtures.ts: createMainFixtures(scope:MainScope,db:PrismaService,ledger:RunLedger):Promise<FixtureDescriptor>; cleanupMainFixtures(scope:MainScope,db:PrismaService,ledger:RunLedger):Promise<CleanupReceipt>. RunLedger contains exact returned PK/composite keys, operation/hash receipts and created path/link identities; cleanup never accepts a table/prefix filter from callers.
- server.ts: startMainAdminServer(scope:MainScope,fixture:FixtureDescriptor):Promise<OwnedServerReceipt>. It consumes only the limited-role URL/fresh synthetic session secret, resolves real Admin auth/ownership guards and fake infrastructure, and records process/listener ownership for exact shutdown.
- MainScope is the captured strict scope schema; MainEvidence/PhaseReceipt/BackupReceipt/FixtureDescriptor/RunLedger/CleanupReceipt/OwnedServerReceipt are exported test-tool types colocated with their owning helpers. They must carry the exact named receipt fields above and use PASS/FAIL/BLOCKED, never convert skips or absent proofs to PASS. No product DTO/schema migration is implied.

## Review focus

1. Same ASUS/elevated principal can alter its files; trusted-operator mode is a consciously narrower threat model, never an OS isolation proof. No superuser/Docker bootstrap secret reaches test children.
2. Two container aliases share one data volume; startup must fail if ANY other container uses that volume and is running. No new cluster init or schema bootstrap.
3. Older migration bytes are unavailable locally; empty Prisma diff does not validate unsupported CHECK/trigger/function semantics. Catalog audit must explicitly cover all objects from the3 discrepant migrations.
4. Existing nonempty protected tables and FK cascades survive both failed tests and cleanup; run suffix alone is never delete authority. Unknown external writers stop the run.
5. Backup decode is not restore rehearsal. Any scenario needing destructive recovery, learner APPROVED_RELEASE, unknown ID ownership or broader grants is BLOCKED.

### Task 1: fail-closed main capability and pure safety tests

- [ ] Verify matching new approval/baseline/frozen/allowlist; record approved -> implementing through CLI before code or OS/data actions.
- [ ] TDD RED -> GREEN for T01/T02/T03/T13 guards with mock OS/DB/process/storage only; add main permission/config branch while retaining v1 tests. Missing/forged authority, stale hash, wrong role/endpoint, .env attempt, unsafe SQL or cleanup must fail before a side effect.
- [ ] Add independent main-tools config; retain existing beginner unit config. API config ignores all .env files in explicit main-test mode; Prisma uses only new explicit config, never prisma.config.ts; Node preload denies .env and backup-root reads in test children and all network except the three approved loopback ports; this is a reviewed-code safeguard, not an OS sandbox.
- [ ] Run tools/legacy focused unit/component checks, lint/typecheck and API build. Defer Web build to action build after paths/fixtures are ready; it uses a clean source-only mirror under runRoot with no .env or secret files; reuse installed dependencies by an exact ledger-owned link, never delete through its target. No app startup or DB write from build.
- [ ] If HTTP-mock flake recurs, diagnose once with real failure evidence and explicit teardown/binding fixes in its allowed spec; do not count retries/skips as PASS.

### Task 2: existing server audit and complete private backup

- [ ] Create only listed absent run/backup roots, owner ASUS SID1001 with protected DACL for owner/SYSTEM/Administrators only; no shared-parent ACL changes. Same-owner processes are not claimed isolated.
- [ ] Reinspect exact container/image/entrypoint [docker-entrypoint.sh]/cmd [postgres]/mount and initialized PGDATA17; no other active mount user. Start ONLY that existing container if stopped, logging ownership of this startup; no create/run/reconfigure/new init. Connect through explicit pinned-container psql -X -w and explicit -h/-p/-U/-d with READ ONLY transactions.
- [ ] Refresh full identity,47-name migration status/checksums, all97 table counts, schemas/roles/grants and incoming FKs. No data payload/log/secret export. Any different identity, pending/failed/unknown migrations or unexpected table/data baseline stops before fixture writes; no repair.
- [ ] Require owner maintenance window: normal application/learner services are stopped by owner; no foreign foreground DB clients. The test server serves only fixture-admin/test requests. Observe own backend identities; unknown clients/writers => stop tests, preserve/quarantine, never kill them.
- [ ] Stream unfiltered pg_dump -Fc worklingo (all schemas/data/large objects/sequences/ACL/owners) to private backupRoot/worklingo.dump; capture globals metadata with pg_dumpall --globals-only --no-role-passwords -l worklingo. Never put bytes, hashes of credentials, row payloads or DSNs in Git/chat. Record size/SHA256/client/server versions and exit statuses.
- [ ] Run pg_restore --list plus full pg_restore --exit-on-error --file=/dev/null reading the entire archive, no -d/--create/--clean and no SQL execution. Treat warnings/errors/incomplete stream as BLOCKED. The result is ARCHIVE_READABLE, actual RESTORE_NOT_TESTED. Retain backup after successful cleanup.

### Task 3: least-privilege role and schema compatibility

- [ ] After validated backup only, create exact absent LOGIN wl_r12a_main_202610260003 with random in-memory secret, no role membership, NOSUPERUSER/NOCREATEDB/NOCREATEROLE/NOINHERIT/NOREPLICATION/NOBYPASSRLS, connection limit12, one-run expiry; record its OID. The new server-side SCRAM verifier is normal credential persistence; the plaintext password stays only in coordinator/child memory. Verify safe logging/redaction and SCRAM settings first; unsafe logging/audit means BLOCKED, no shared-policy weakening. No other roles/credentials/PUBLIC ACL are changed.
- [ ] Grant LearningProgram SELECT on id/slug/name/description/learningGoal/proficiencyLabel/iconKey/availabilityStatus/displayOrder/createdAt/updatedAt, plus UPDATE(updatedAt) only for locking. Grant worklingo CONNECT/public USAGE, narrow pg_control_system() EXECUTE for live identity proof and exact table permissions in scope. No owner/schema CREATE/TRUNCATE/protected DML. PUBLIC-derived TEMP is reported/accepted only as a main-mode residual privilege; test SQL forbids TEMP/DDL, qualified public names, fixed timeouts/search path. Do not revoke shared PUBLIC TEMP to fake old isolated preflight.
- [ ] Keep only the new role default_transaction_read_only=on for the audit; after a passing audit the coordinator may switch that exact role to off and reconnect for fixtures. Run a READ ONLY Prisma6.19.1 diff using explicit config and --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code, no migration directory/shadow DB/script execution. Exit0 means supported schema matches;2 means difference/BLOCKED,1 error/BLOCKED. Additionally compare pg_catalog types/columns/defaults/indexes/FKs/CHECKs/functions/triggers required by the3 source migrations. No schema-equivalence claim beyond actual checks.
- [ ] Fixture writes require compatible relevant schema and current expected counts/fingerprints. Historical checksum root cause can remain UNKNOWN only as explicitly disclosed/accepted risk under this proposal; actual structural differences cannot be waived. Missing LearningProgram catalog is not repaired/seeded: only one new disabled run-owned fixture program is created later and removed.

### Task 4: bounded fixtures, real PostgreSQL integration and Admin E2E

- [ ] Preallocate UUIDs and durable run ledger before each creation; INSERT RETURNING only for bootstrap principals/catalog; collision with any pre-existing key stops. No bootstrap upsert/reuse of existing accounts/programs. Three synthetic users (two admins, one RBAC-only learner) and three short-lived HMAC session cookies maximum; no real credentials or enrollment/profile creation.
- [ ] Runtime role SELECT-only on User/UserSession/LearnerProfile; guarded test Prisma/client + request-cookie allowlist prevents pre-existing identity/session reads. Bootstrap creates the synthetic sessions using existing HMAC format; exercise real SessionAuthGuard/RolesGuard. No existing UserSession update/revoke/delete.
- [ ] Create one run-owned LearningProgram slug beginner with availability DISABLED; require current program catalog empty and never change any existing availability flag. Runtime can update only its updatedAt column for FOR UPDATE locking, not access status. All content DML tables must be initially empty; every subsequently writable row must be created and recorded by the run; fail if changed. Canonical program/path/stage/unit/editorial identifiers remain unchanged (beginner, mat-goc/co-ban, existing stage codes and mg01/mg02); baseline emptiness/collision checks plus exact ID ledger prove run ownership. Other unique lesson/word-bank/block names and storage keys include run ID; publisher upserts may touch only recorded fixture IDs.
- [ ] Only synthetic MG01/MG02 lesson/audio/manifest slots (at most8 lessons/16 versions), FIXTURE_ONLY. A synthetic pinned session for the synthetic learner may be inserted by bootstrap solely for historical FK/snapshot verification, never as proof of admission/completion/mastery. Runtime has no learner-session/progress/attempt/mastery writes.
- [ ] Implement/run T04–T11 and T13/T14 assertions in exact tests below; use independent PG connections/barrier and pg_locks evidence for contention, test-only injected storage faults for rollback. Preview checks counts/digests of learner state and exact V1 redaction. All selectors must bind ledger IDs; remove current E2E first-matching-binding ambiguity.
- [ ] Export only TEST_PUBLISHED candidate; permission excludes approve-release/schema-setup. Assert no .approved artifact/APPROVED_RELEASE/CONTENT_READY/public/learner access. Actual learner admission/evaluation is BLOCKED_SCOPE; existing mock regressions plus real pinned snapshot reads are reported separately.

### Task 5: exact cleanup and acceptance

- [ ] Stop only ledger-owned API/Web/clients. In a transaction lock owned parent rows FOR UPDATE; enumerate incoming FK children and require all affected rows belong to ledger, including implicit CASCADE paths. Unknown/new foreign reference => BLOCKED, no force cleanup. Delete children before parents with exact PK/composite tuples and expected counts; no prefix/all-table/CASCADE cleanup.
- [ ] Bootstrap coordinator alone deletes exact created principals/sessions and fixture catalog; runtime cannot DML protected tables. Verify every pre-existing table count/content digest/schema baseline unchanged, empty content tables restored empty, no registry APPROVED_RELEASE, and every owned row/file accounted. If any mismatch, retain backup/evidence and report INCOMPLETE; no automatic full restore.
- [ ] Revoke only grants made to the exact new role/OID, then DROP ROLE only when no foreign dependency/session exists; never DROP OWNED or REASSIGN OWNED. Retain/quarantine unknown resources. Remove only ledger-owned files/dirs and owned dependency links without following targets; backupRoot and audit are retained. Restore initial stopped container state only if this run started it, cleanup succeeds and no foreign clients remain.
- [ ] Run final focused unit/component/integration/E2E, lint/typecheck/build appropriate to changed files; one independent final review. Record actual PASS/FAIL/BLOCKED/skipped distinctly and source/fixture/SQL hashes. Commit source/governance only on feature branch; no merge/push/deploy.
- [ ] New mandate can verify only after its acceptance. For original R1.2a003, explicitly map the approved main-DB/trusted-operator substitution to its old dedicated-DB/root boundary; never label the old isolated Gate B PASS. Recommend original verification only when every remaining required criterion is evidenced and CLI lifecycle permits; any unfulfilled mandatory historical/runtime test keeps it implementing.

## Failure, expiry and secret handoff

The sole execute process drives prepare-paths -> start-existing -> audit -> backup -> role -> schema-audit -> fixtures -> build -> servers -> auth -> integration -> e2e -> verify -> cleanup. It keeps fresh role password/session secret in memory and supplies child env/structured Playwright storageState directly; no credential file, role password reset or separate phase invocation. Non-secret predecessor/ownership receipts remain durable.

Hard deadline=t0+4h, where t0 is persisted before the first execute side effect and never rewritten. At3h30m refuse new tests and enter cleanup, reserving30m. Any failing/BLOCKED phase skips later tests/fixture writes and attempts only safe cleanup while authority/time remain. Expiry permits closing owned clients/children and reporting, not DB/role/file cleanup mutation. No automatic extension.

After a coordinator crash, credentials are lost by design. Only cleanup-recovery is allowed within the original unexpired window using pinned bootstrap socket + exact ledger/roleOID, no secret reconstruction/password rotation or test resume. Expired or uncertain resources are quarantined and require an explicit recovery decision; backups stay retained. The accepted main-operator model is not a crash-proof OS sandbox.

## Exact command allowlist

The4 public actions below are the only command entrypoints. execute runs all DB-bearing phases in one coordinator lifetime, after phase gates; internal phases are not separate processes/CLI entrypoints. All mutation/DB/server/fixture children stay under that coordinator. No free-form subprocess/shell command input. No command executes in the current preapproval task.


Public actions:

- pnpm --filter @worklingo/api exec tsx test/beginner-main/run.ts --scope C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/mandate/reports/2026-10-26-beginner-main-db-scope.json --action preflight
- pnpm --filter @worklingo/api exec tsx test/beginner-main/run.ts --scope C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/mandate/reports/2026-10-26-beginner-main-db-scope.json --action unit
- pnpm --filter @worklingo/api exec tsx test/beginner-main/run.ts --scope C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/mandate/reports/2026-10-26-beginner-main-db-scope.json --action execute
- pnpm --filter @worklingo/api exec tsx test/beginner-main/run.ts --scope C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/mandate/reports/2026-10-26-beginner-main-db-scope.json --action cleanup-recovery

Approved child commands:

- pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-main-tools.config.ts
- pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts
- pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.integration.config.ts
- pnpm --filter @worklingo/web exec playwright test --config playwright.beginner-admin.config.ts
- pnpm --filter @worklingo/contracts test (only pure contract tests, zero DB URL)
- pnpm --filter @worklingo/api lint; pnpm --filter @worklingo/api typecheck; pnpm --filter @worklingo/api build (separate argv invocations)
- pnpm --filter @worklingo/web lint; pnpm --filter @worklingo/web typecheck; existing installed Next CLI build --webpack in clean source-only mirror
- Prisma6.19.1 migrate diff ONLY with explicit prisma.beginner-main.config.ts and the read-only flags above; no schema-application CLI command.

Privileged child binaries: pinned Docker inspect/ps/start/exec/stop only as scoped; /usr/local/bin/psql -X -w -v ON_ERROR_STOP=1 -h /var/run/postgresql -p5432 -Uworklingo -dworklingo; pg_dump -Fc -h /var/run/postgresql -p5432 -Uworklingo -dworklingo; pg_dumpall --globals-only --no-role-passwords -l worklingo with explicit socket/user; pg_restore archive-only --list / --file=/dev/null. Secrets/binary streams never use shell interpolation or tool stdout.

## Test matrix

| ID | Exact case group | Executor | Acceptance |
| --- | --- | --- | --- |
| T01 | matching-main-authority-and-no-env-fallback | Pure tools tests | Missing/mismatched/expired permission, dual mode flags, URL/cluster/OID/volume/role, file/hash or .env fallback deny before writes |
| T02 | backup-stream-completeness-and-no-restore-claim | Pure tools + backup phase | Full unfiltered DB dump, private files/hash, archive list and complete decode to null sink; failures abort fixture writes; restore NOT_TESTED |
| T03 | runtime-role-protected-table-denial | Role preflight + integration | No superuser/owner/createDB/createRole/replication/bypassRLS/memberships/TRUNCATE/DDL; no protected-table DML, no unsafe callable definer function; no widening PUBLIC privileges |
| T04 | admin-curriculum-ownership | Beginner integration | Exact disabled fixture program/path/unit; wrong program/path/admin/self-review/direct generic APIs reject before mutation |
| T05 | foundation12-author-validate-preview | Beginner integration | Source exact roundtrip, explicit synthetic PCM/hash, all skills validated, selected exact snapshot redacted; preview changes no learner/attempt/mastery/session state |
| T06 | revision-and-receipt-idempotency | Beginner integration | Same key replay one result, changed payload conflict, stale review/version conflict; fresh environment/auth before replay and after locks |
| T07 | postgres-real-lock-contention | Beginner integration | Independent backend PIDs, fixture row locks + observed wait, bounded release/one publication; no broad/global lock |
| T08 | rollback-and-file-compensation | Beginner integration | Injected test-only storage/transaction failure leaves no partial DB receipt/version/pointer; compensate only owned new storage keys |
| T09 | v1-v2-and-c1-c2-preservation | Beginner integration | V2 updates only fixture pointer; valid V1/C1 hashes/status/synthetic pinned session stable; exact Admin V1 preview never falls back latest |
| T10 | test-release-registry-no-approved-release | Registry integration | Actual fixture IDs/source/assets/hashes export TEST_PUBLISHED/FIXTURE_ONLY; approve-release/load-approved denied; no .approved artifact or CONTENT_READY |
| T11 | admin-desktop-mobile | Two existing Playwright projects | Real guard + synthetic session cookies only; fixture-owned selection, planned tree/editor/validation/preview and read-only keyboard/layout assertions; learner routes denied |
| T12 | legacy-regression | Existing focused pure unit/component configs | Foundation1.0/1.1, Intermediate/IELTS and lifecycle P1 regression; no generic integration/E2E or real providers |
| T13 | preservation-and-exact-cleanup | SQL/FS verification | Baseline97 tables counts/content digests, schema and all existing rows unchanged after cleanup; every created PK/composite FK/storage key accounted; backup retained |
| T14 | historical-runtime-compatibility | Focused legacy unit + real snapshot persistence | Start/resume/evaluation use pinned V1 in existing mock regressions plus real DB pin/FK/snapshot checks; actual Beginner learner admission/evaluation remains forbidden and NOT_RUN |

Unsafe generic suites are BLOCKED: default root integration/E2E configs, curriculum-seed.integration.spec.ts (fallback URL/TRUNCATE/DROP SCHEMA), admin-curriculum-commands.integration.spec.ts (schema provisioning/drop), legacy IELTS study fixtures without run-ledger ownership, arbitrary broad suite globs, destructive recovery and actual learner/APPROVED_RELEASE cases. Reuse safe assertions inside the narrow Beginner harness; do not run their existing lifecycle hooks on main.

## Backup/rollback and final readiness

Before data writes: backup + full decode, compatible schema, exact role/grants/cookies, approved disabled target, preserved baseline and quiescence are mandatory. Any missing proof => BLOCKED before fixtures. Roll back failed transactions and remove only proven fixture IDs/files. Do not claim full restoration capability from decode; no main restore operation is authorized. Retained backup supports a later owner-led recovery decision only if needed.

This single proposal includes guarded source adaptation, starting the EXISTING container, private backup, exact role, fixture publication/tests and cleanup. It does not inherit or create worker/database/instance authority. Current status: SQL refresh BLOCKED_OFFLINE, backup NOT_RUN, restore NOT_TESTED, integration/E2E NOT_RUN. Human approval is still null.

Offline preapproval evidence: PG_VERSION17 and pg_control first-field system identifier7692646346822291490 were read from the stopped existing container with docker cp and match the last live SQL identity. This does not verify live DB name/OID/schema/counts or constitute a backup; phase2 still requires live audit after approved startup.
