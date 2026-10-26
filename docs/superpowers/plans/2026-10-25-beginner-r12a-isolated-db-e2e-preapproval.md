# Beginner R1.2a Isolated DB and E2E Preapproval Plan

> For agentic workers: after matching human approval only, use executing-plans task-by-task with TDD and one independent final review. Current task is documents/capture only.

**Goal:** Qualify R1.2a with real isolated PostgreSQL fixtures, integration/E2E and verified cleanup.
**Architecture:** Reuse current authoring/publisher/registry and the two dedicated integration/two Playwright files. Add an operator runner, actual synthetic fixture provisioning and identity-bound cleanup.
**Tech stack:** Installed Node/pnpm/Prisma/Nest/Next/Vitest/Playwright, Windows host and local Docker Desktop PostgreSQL17.
**Spec:** [Canonical R1.2a plan](2026-10-24-beginner-r12a-implementation.md) and the human “R1.2a ISOLATED DB & E2E PREAPPROVAL” request dated2026-10-25. This is an addendum, not a new product increment.

## Global constraints

PROPOSED ONLY. No current execution/data approval. No DB connection, setup/reset/migration, fixture write, server startup or test run during capture.
Parent001 stays captured/null,002 verified,003 implementing,20261025-001 verified. Preserve their bytes/statuses. This scope may recommend003 verification after all acceptance passes; it cannot transition003.
After matching approval, only the16 product/test files in the [scope lock](../../../mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json) and explicitly named disposable resources may change.
No migration/schema file changes, production/shared DB/media, real content/video/providers, learner admission, R1.2b/R2/R3/R4, merge/push/deploy, fabricated human approval or actual APPROVED_RELEASE.

## Exact proposed environment

All identities below are proposed, not provisioned.

| Resource | Exact requested identity |
| --- | --- |
| Run / environment | 202610250002 / beginner-r12a-db-e2e-20261025-002 |
| Docker context | desktop-linux, npipe:////./pipe/dockerDesktopLinuxEngine; remote contexts denied |
| Image | postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24, linux/amd64; local image observed, no pull |
| Container | worklingo-beginner-r12a-202610250002 |
| Volume | worklingo-beginner-r12a-202610250002-pgdata |
| PostgreSQL | 127.0.0.1:55432 -> container5432; schema public |
| Database | worklingo_beginner_r12a_202610250002 |
| Runtime role | wl_beginner_202610250002 |
| Migration owner | wl_beginner_owner_202610250002 |
| cluster_name | wl-beginner-r12a-202610250002 |
| Expected root Program UUID | 10000000-0000-4000-8000-000000000001; migration-provided Beginner catalog row, query/verify only after setup |
| TEST_DATABASE_URL | Private runtime value for exactly the endpoint/DB/runtime role above; no literal DSN/password in Git/logs |
| DATABASE_URL | Explicit validated equality to TEST_DATABASE_URL in runtime children; never fallback |
| Setup secret variable | WORKLINGO_BEGINNER_SETUP_DATABASE_URL; separate exact owner-role preflight, never supplied to API/integration |
| Owned temp parent | C:/Users/ASUS/AppData/Local/Temp/worklingo-beginner-r12a |
| Run root | C:/Users/ASUS/AppData/Local/Temp/worklingo-beginner-r12a/202610250002 |
| Storage / registry | runRoot/storage and runRoot/registry |
| Runtime / artifacts | runRoot/runtime, runRoot/runtime/workspace and runRoot/artifacts |
| Operator approval root | C:/ProgramData/WorkLingo/BeginnerTestApprovals/202610250002 |
| Permission ID | beginner-r12a-isolated-202610250002 |
| API / Web | http://127.0.0.1:47771 / http://127.0.0.1:47772; owned new PIDs, no reuse |
| Grant lifetime | At most24h after real human approval; no automatic extension |

Required Docker labels: worklingo.environment=beginner-r12a-db-e2e-20261025-002 and worklingo.run=202610250002. Record actual containerID, image digest, volume mount and per-attempt nonce before writes.
Read-only observations: no listener on55432/47771/47772; proposed run/approval roots absent; local context/image available. Recheck at execution. Unexpected existing resources cause STOP, not reuse/reset.

## Database, operator and approval permissions

Bootstrap operator may use postgres only inside the newly created labelled container and its postgres catalog for this run’s roles/DB/comment and final exact-target removal. No shared/local developer cluster.
Migration owner: NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS, owns only this DB/schema; temporary LOGIN for unchanged migration deployment, then NOLOGIN. Existing pgcrypto and data steps embedded in the48 locked migration files are permitted only here. Migration20261012000100_learning_programs inserts four durable catalog rows, including Beginner COMING_SOON; migration enrollment backfill must produce zero on the fresh empty-user database. No additional application seed, db push/reset, new migration or copied developer data.
Runtime role: LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; no memberships/elevated predefined roles or DB/table/schema ownership. Grant CONNECT, public USAGE, explicit SELECT/INSERT/UPDATE/DELETE on repository application tables and necessary sequence USAGE; _prisma_migrations read-only. No GRANT ALL, CREATE/TEMP/TRUNCATE/schema DDL. Revoke PUBLIC defaults and runtime access to postgres/template DBs.
Limit pool4/role connections8, statement_timeout30s, lock_timeout5s and idle-in-transaction timeout. Read actual flags, memberships, ownership and privileges; do not infer safety from role name.
Fresh random DB/Admin/session secrets stay in operator-protected runtime memory/files, never command-line literals, report/Git content or full environment dumps. API/Web run non-elevated; operator elevation is limited to ACLs on the new approval root. No OS user/service/global-firewall creation.

Existing runtime permission contract still identifies003/software hash1170d5..., which is software provenance, not DB authority. Keep that contract unchanged. Trusted authorizationSource and an outer operator envelope must bind the actual new child mandate/hash, scope/image/DB/paths/actions, expiry and tested candidate. Runner verifies the CLI approved/implementing state and actual human note before activation.
Never use fixturePermission(), synthetic-unit-grant,2099 expiry or a fabricated human actor in live records.
Runtime actions requested: read,author,validate,review,publish,export,fixture-audio. Setup/cleanup are separate operator actions. Exclude approve-release. Export only TEST_PUBLISHED/FIXTURE_ONLY with approvalRef=null; a positive release still needs later candidate-hash human approval.

## Fail-closed preflight

1. Before provisioning, match plan/review/allowlist/baseline/proposal locks, frozen originals and branch/HEAD. Verify local Docker context/digest, absent exact resources, free ports and cleanup authority. No connection/write on mismatch.
2. Normalize/realpath every ancestor. Reject symlinks/reparse points and overlap between storage/registry/approval or protected project/media roots in scope. Refresh only configured WORKLINGO_DATA_DIR paths without loading .env; unresolved paths or changed overlap => STOP. Both repository checkouts are excluded from cleanup.
3. Current Windows gap: fs.access(W_OK) does not reliably check NTFS ACL (installed Node fs.d.ts documents this). Amend only the named preflight/helper spec to use non-mutating OS effective-access checks for the current token and approval directory/files. Windows AccessCheck via a static no-profile local PowerShell/native adapter checks write/create/delete-child/WRITE_DAC/WRITE_OWNER; POSIX retains its checks. No interpolated shell path, write probe, writable-root exemption or disabled guard. Unknown/unavailable proof => deny.
4. Prove actual API/test principal cannot modify approval root, selected records or ACL, and is not elevated. Operator may write only the new root. Mock filesystem tests do not establish real NTFS enforcement.
5. Phase-specific SQL: verify container/cluster before bootstrap writes; after DB creation verify target/comment/setup role before migrations; runtime first statement verifies current_database/current_user/cluster_name and complete role/ownership constraints before fixture DML.
6. Runtime URL must match127.0.0.1:55432, exact DB/user/public schema, no extra options/host alias. TEST_DATABASE_URL is mandatory; DATABASE_URL is explicitly mirrored, never fallback. Validate run marker, trusted hash/expiry/revocation, source candidate and action before every phase.
7. After approved source edits, compare BASE..candidate against exact allowlist and frozen migration/original hashes. Freeze tested candidate tree/commit in run descriptor. Unrelated drift requires renewed approval.
8. Sanitized child env only: workers off, AI_ROUTING_ENABLED=false, fake evaluation/STT/TTS and provider keys/endpoints empty. Include explicit WORKLINGO_BEGINNER_ENVIRONMENT_ID for Playwright. Strict Node preload permits only exact API/Web/PG endpoints; browser/API-request traffic denies every other origin/port. Loopback-any-port alone is insufficient.

## Review focus

- Elevated Windows token or incomplete ACL proof: deny before data operations.
- Foreign resource with same name: compare actual IDs/digest/labels/nonce and exclusive mounts, never delete by name alone.
- Restored .env or shared local port: dedicated configs, clean Web mirror and authenticated environment handshake.
- Descriptor with stale/copied IDs: query actual run-owned publication/review/receipt/assets and verify membership/hash.
- Interrupted teardown: quarantine unknown ownership/residue; no cleanup success by assumption.

## Task1 — Harness/software readiness before DB

Files: exact eight modify/eight create paths in scope JSON. Publisher, curriculum, learner resolver, registry contract/service and verified P1 service/spec remain read-only.
Interfaces: environment.ts exposes validateIsolatedRunScope(scope,approval), preflightIsolatedRun(mode,scope), sanitizedChildEnvironment(scope,secretHandles); run.ts dispatches only declared actions; fixtures.ts produces queried FixtureDescriptor. Preflight source adds an internal assertReadonlyApprovalPathSync(path,kind), with no contract/API expansion.

- [ ] RED tools-unit tests for missing/changed scope, source drift, remote Docker, existing resources, wrong endpoint/role/cluster, elevated role/ownership, ACL unknown/writable, media/reparse escape, expired/revoked grant, inherited env/provider secrets and foreign cleanup/PID/volume. Mock infrastructure only.
- [ ] Implement only approved paths. Dedicated tools config collects tools specs/preflight spec, never DB integration. Test command construction and zero-side-effect rejection before real operations.
- [ ] GREEN tools and existing dedicated units, lint/typecheck/API build and independent harness/guard review before provisioning.
- [ ] If prior HTTP mock failure recurs, retain verbose error, timing/event-loop/socket/teardown evidence; isolate once then rerun full relevant suite. An isolated rerun PASS alone is not root-cause proof; unexplained recurrence blocks qualification. No retry masking, timeout inflation or skips. An out-of-scope fix needs renewed approval.

## Task2 — Provision/schema/real synthetic fixtures

- [ ] Operator preflight, then exact new local container/volume/roles/DB. No existing infra compose up/down.
- [ ] Migrate deploy unchanged migration bytes with dedicated config, revoke setup LOGIN/runtime DDL. Accept only documented migration-initialized catalog metadata; verify User/LearnerProfile/LearnerProgramEnrollment initially empty and reject unexpected existing content/state.
- [ ] Query Beginner catalog UUID above, slug=beginner and availabilityStatus=COMING_SOON; refuse any mismatch, never duplicate/upsert/change that Program. Bootstrap only two Path roots and required Stage/Mission roots for MG01/MG02/ownership negatives; never seed the entire20/80 plan.
- [ ] Synthetic editor, separate reviewer, LEARNER negative/history actor and optional SYSTEM_ADMIN use actual supported DB enums ACTIVE/DISABLED. Real hashed fresh test passwords; no invented TEACHER DB enum. No new learner enrollment/admission/completion; do not enable public access flags.
- [ ] At most8 synthetic logical lessons across MG01/MG02 plus one V2 replacement. Source/audio remain FIXTURE_ONLY; synthetic PCM WAV is technical file evidence, not pedagogical speech or completed lessons.
- [ ] Use actual authoring/import/validate/review/publish and Foundation save/validate/technical-review/publish services. Build C1/V1 then C2/V2. Query descriptor, manifest, receipts, reviews/assets and hashes only after successful persistence.
- [ ] Explicit test-only historical learner/session/attempt/evaluation references may be inserted for pin regression. This is a historical fixture, not new admission/enrollment or fake completion.
- [ ] Minimal run-owned Intermediate/Foundation1.0/1.1/IELTS cases; no broad seed/data copy. Ledger every created table/ID/key.

## Task3 — Actual integration matrix

Extend only the two existing dedicated integration specs. Current3 tests alone are insufficient.

| ID | Area | Required real evidence |
| --- | --- | --- |
| M01 | Admin/ownership | Actual roles, right/wrong/shared ancestry, both Lesson relations and generic lifecycle denial; zero rejected-path content/audit/receipt writes. |
| M02 | Foundation1.2 | Source round-trip/invalid input, rubric/min_words/audio hashes; stale or invalid content cannot publish; legacy1.0/1.1 retained. |
| M03 | Preview | Before/after run-owned session/attempt/progress/mastery/evaluation counts+hashes, exact version, redaction/no recorder/provider. Explicit AuthSession login writes are separate. |
| M04 | Review/publication | Distinct technical editor/reviewer; self/missing/stale review denied; exact audio bytes; no partial pointers/children/receipts after failure. |
| M05 | Environment/API bypass | Missing/expired/tampered grant, wrong role/cluster/storage/target rejected before DML. Never probe an actual production/shared address. |
| M06 | Concurrency/idempotency | Independent PG connections, same/different key requests, one publication/receipt, stable replay, changed request conflict and fresh auth on replay. |
| M07 | Locks/rollback | Hold actual advisory/import-row locks on A, block B, observe owned pg_locks/pg_blocking_pids then release. Exercise conflicting ownership/revision/role and transaction failure after writes; inspect DB/storage rollback. Sleeps/Promise.all alone are not proof. |
| M08 | V1/V2 and C1/C2 | Actual old pinned session stays on valid PUBLISHED V1/C1 after V2/C2; exact snapshot/activity/audio/rubric hashes and existing read/resume/fake-evaluation services. No R2 resolver/admission implementation. |
| M09 | Registry | Actual publication/review/receipt/file IDs and hashes -> TEST_PUBLISHED candidate; wrong env/path/member/hash/file rejected; no manufactured positive release approval. |
| M10 | Readiness | FIXTURE_ONLY, transitionEnabled=false, approvalRef=null, Beginner catalog remains COMING_SOON, no learner enrollment; no CONTENT_READY/APPROVED_RELEASE/learner-ready flag. |
| M11 | Legacy | Run-owned Foundation1.0/1.1, Intermediate and IELTS topic/bridge/mock DB regressions; legacy replacement archives prior, Beginner retains V1, old import leaves new pointer. |
| M12 | Desktop/Mobile | Both existing E2E projects: real fixture login, two Paths, editor/invalid validation/review confirmation, exact V1 preview, keyboard/layout and unauthorized direct URL without learner writes. |

M01-M08/M10-M11 live in beginner-authoring.integration.spec.ts; M08-M10 also use beginner-release-registry.integration.spec.ts. M03/M05/M10/M12 also use both E2E files.
Missing fixture/zero collection/unexplained skip is BLOCKED/FAIL. Historical evaluation tests write only their labelled synthetic actor; preview’s before/after window permits no learner writes.

## Task4 — Isolated servers and E2E

- [ ] API launches tested dist/main.js directly, not run-api.mjs; NODE_ENV=test/isolated flag makes AppConfig ignore .env.
- [ ] Web source-only mirror: runRoot/runtime/workspace/apps/web with required root tsconfig/package metadata; exclude .env*, .next*, data/media/secrets/Git. Inventory dependency junctions as read-only inputs: never modify targets or their ACLs; fail if tooling needs an unapproved target/cache write. Remove junction itself before cleanup, never traverse its target. No install.
- [ ] Build/start installed Next CLI from clean mirror with webpack and WORKLINGO_E2E_MODE=true, so .next-e2e stays inside mirror. WORKLINGO_API_URL=API47771, NEXT_PUBLIC_API_BASE_URL=/api/v1. Web NODE_ENV=production describes Next only, never production resources.
- [ ] Own new API47771/Web47772 PID/start-time/command fingerprints; no reuse/kill-by-port. Readiness verifies authenticated workspace environment/Program and Web origin.
- [ ] Real synthetic login via auth endpoint creates private storageState; no forged roles/headers/cookies. Separate Admin/reviewer/learner contexts.
- [ ] Patch dedicated Playwright config for private output/exact origins; keep two projects, workers1,retries0. Extend two specs; select descriptor’s exact V1 rather than first matching binding. Record scenarios/project collection before run; at least two files x two projects.
- [ ] Raw traces/auth state contain secrets: private ACL and deletion/scrubbing before handoff; only redacted evidence/hashes retained.

## Exact future commands

No command below was executed in preapproval. DB/setup/server/test children run only through the approved runner with phase preflight and sanitized env.

    pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-isolated-tools.config.ts
    pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts
    pnpm --filter @worklingo/api exec vitest run src/beginner/beginner-admin.controller.spec.ts --config vitest.beginner.config.ts --reporter=verbose
    pnpm --filter @worklingo/api exec tsx test/beginner-isolated/run.ts --scope C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo/mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json --action preflight

Same exact runner prefix permits only: provision, schema-setup, fixtures, build-api, build-web, servers, auth, integration, e2e, verify, cleanup. Source scope JSON enumerates every full action command.

Runner children:

    pnpm --filter @worklingo/api exec prisma migrate deploy --config prisma.beginner-test.config.ts
    pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.integration.config.ts
    pnpm --filter @worklingo/web exec playwright test --config playwright.beginner-admin.config.ts
    pnpm --filter @worklingo/api lint
    pnpm --filter @worklingo/api typecheck
    pnpm --filter @worklingo/api build
    pnpm --filter @worklingo/web lint
    pnpm --filter @worklingo/web typecheck
    node <checked installed Next CLI> build <owned clean mirror/apps/web> --webpack
    node --require <checked egress-guard.cjs> <tested apps/api/dist/main.js>
    node --require <checked egress-guard.cjs> <checked installed Next CLI> start <owned clean mirror/apps/web> -H 127.0.0.1 -p 47772

Runner resolves placeholders to validated absolute paths; literal placeholders cannot execute. Docker child grammar is limited to the approved context/resource IDs/labels and container-local psql/pg_dump for exact DB/catalog actions. No arbitrary shell, prune/compose-down, default Prisma/integration/e2e configs, db push/reset/seed or browser/image download.

## Task5 — Backup, cleanup, rollback and qualification

- [ ] Pristine schema/privilege fingerprint and private per-phase run-only backup/ownership ledger. Dumps contain synthetic secrets: operator-only ACL, no Git/report contents.
- [ ] Failure stops new writes; retain redacted diagnostics, disconnect clients, stop only recorded PID/start-time pairs. Never kill by port or stop unknown processes.
- [ ] Cleanup rechecks actual containerID/digest/labels/exclusive volume, DB/comment/role, sole run rows/keys/references, absolute paths and no protected-root overlap. Unknown ownership => quarantine/BLOCKED, not guessed deletion.
- [ ] Remove only target run DB/roles, its container/labelled volume, known storage keys and exact run directories; revoke/delete only named runtime approval/secret records. Never parent temp/approval root or real media.
- [ ] Verify each dependency junction target, unlink junction itself using native literal paths without recursion, then verify no other reparse points before recursive runtime removal. Delete dumps/auth/secrets; preserve only redacted evidence outside run.
- [ ] Prove resource/listener/PID/storage/registry/run/approval-root absence and unchanged protected source candidate fingerprints/media sentinel metadata captured just before data phases, without a deep real-media scan or production DB connection. Unrelated concurrent changes are reported, never overwritten. Residue means cleanup FAIL/BLOCKED.
- [ ] Reset authority: at most one retry, only after proven cleanup, same exact resources/new attempt nonce inside same24h grant. No in-place reset/row wipe or reuse of foreign targets.
- [ ] Unexpected outside impact: stop/preserve evidence; no autonomous production restore. Restore covers only disposable run DB/files from their private backup after identity reproof. Failed cleanup retains quarantined private backup, never claims success.
- [ ] Report actual commands, IDs/hashes, pass/fail/skip, lock/rollback/history/auth/legacy and cleanup proofs, P0/P1/P2 and blockers. Recommend003 verification only after its mandatory acceptance/lifecycle review; no automatic transition or positive release.

Acceptance: TDD/unit/static/independent review plus actual M01-M12 with no unexplained failures/skips, fixture-only candidate and verified cleanup. Technical success never implies CONTENT_READY/CEFR/pilot/release approval.
Code rollback affects only approved harness/OS guard commits, retaining P1 fix/readers; data rollback only disposable run. All runtime gates are currently NOT RUN/BLOCKED pending matching human approval.
