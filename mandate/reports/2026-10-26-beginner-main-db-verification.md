# MND-20261026-003 — controlled main qualification evidence

Status: **INCOMPLETE / implementing**. Original R1.2a MND-20261024-003 remains **implementing**. No old isolated Gate B is relabelled PASS. Parent MND-20261024-001 remains captured/approval=null.

## Authority and boundary

- Human reply `duyệt` was recorded through Mandate CLI against proposal `280ea7a31e34e1649584bfdcf0f26fd6ead3f6dfdc7d4932434519071f761f17`; source [decision](2026-10-26-beginner-main-db-human-approval.md).
- Frozen scope LF SHA-256 `23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b`; [scope](2026-10-26-beginner-main-db-scope.json), [plan](../../docs/superpowers/plans/2026-10-26-beginner-main-db-qualification.md), [baseline review](2026-10-26-beginner-main-db-review.md).
- Preflight PASS: current approval, 133 baseline source paths, frozen artifacts, exact allowlist and pinned stopped Docker container. Changes are limited to approved source/governance paths. No plan, source baseline, migration, checksum evidence or frozen proposal was rewritten.
- Feature worktree: `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`, branch `codex/foundation-basic-readiness`, implementation base `3c550947b66b66220f7e8d8303ec71c720cb5c2e`.

## Actual execution and blocker

The approved execute command was actually invoked. It failed during **prepare-paths**, while probing the first newly-created directory's ACL. It never reached container startup or live SQL audit. The first directory was created and its own DACL/owner set; no shared-parent ACL changed.

Actual error: Windows PowerShell 5 could not auto-load `Microsoft.PowerShell.Security` for `Get-Acl`. Read-only reproduction confirmed inherited environment FAIL and the same native command with sanitized environment PASS. The inherited PowerShell 7 module path contaminated the Windows PowerShell 5 child. The helper now uses an explicit native executable, sanitized environment and terminating errors. Its unit regression ran RED → GREEN and the actual same-root ACL read passed.

Only `C:/Users/ASUS/AppData/Local/Temp/worklingo-beginner-main` was created. Actual owner was ASUS SID ending1001; protected DACL had precisely ASUS1001, SYSTEM and Administrators FullControl. It was empty. `cleanup-recovery`, inside the original four-hour window, rechecked ownership/ACL and removed that exact empty directory without recursion. Read-only final checks confirmed runtimeRoot/runRoot/backupRoot absent and pinned container still stopped.

The original non-secret t0/deadline journal was retained, never reset. The failed one-run execute remains closed; no secret reconstruction, test resume or automatic new execute was attempted. A further execution requires specifically scoped human rerun authority; this report does not create it.

| Operation | Actual result |
|---|---|
| Pure authority/source/container preflight | PASS |
| Private path preparation | FAIL, corrected in code; full phase not rerun |
| Empty-directory recovery and final absence | PASS |
| PostgreSQL startup/live identity/count audit | NOT RUN |
| Backup/archive decode/actual restore | NOT RUN / NOT RUN / NOT TESTED |
| Runtime role/grants/schema audit | NOT RUN |
| Migration/history/checksum changes | NONE |
| Fixture import/audio/test publication/registry | NOT RUN |
| PostgreSQL concurrency/rollback/history integration | NOT RUN |
| Admin desktop/mobile E2E/Web mirror build | NOT RUN |
| Real learner access/provider/public release | NOT RUN, prohibited |

The last SQL snapshot remains the preapproval snapshot; it was not refreshed. Forty-seven applied migrations and the three unexplained checksums are historical evidence only in this run. No live schema-compatibility or database-preservation claim is made from tests that did not run. There was no database connection/write from this execute attempt.

## Software verification

Final software refresh completed on 2026-10-27 (Asia/Saigon), after the independent review correction pass:

| Command | Result |
|---|---|
| `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-main-tools.config.ts` | 94 PASS / 0 FAIL / 0 pending |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts` | 214 PASS / 0 FAIL / 0 pending |
| `pnpm --filter @worklingo/contracts exec vitest run src/beginner-authoring.contracts.spec.ts` | 4 PASS / 0 FAIL |
| `pnpm --filter @worklingo/web exec vitest run src/features/admin-beginner src/lib/api/beginner-admin-client.test.ts` | 6 PASS / 0 FAIL / 0 pending |
| `pnpm --filter @worklingo/api lint` / `typecheck` / `build` | PASS; a new optional-PID type error was corrected before the successful final typecheck |
| `pnpm --filter @worklingo/web typecheck` | PASS |
| Targeted ESLint: contracts, Prisma/main-tools configs, Playwright/history and fixture helpers | PASS |
| Explicit Web TypeScript check of Playwright config and history spec | PASS |
| Safety mutation: invert `foreignClients !== 0` | KILLED: 2 expected assertion failures; exact original bytes restored, whole tools suite GREEN |
| Actual read-only ACL verification / exact empty-directory recovery | PASS on the original run; no OS setup repeated |
| Final `run.ts --action preflight` | PASS: 133 source paths, frozen authority/allowlist, 0 DB writes |
| Mandate CLI validate | PASS, 10 records |

Suites overlap; counts are test executions, not a claimed unique combined coverage total. No skipped/BLOCKED case is counted as PASS. Legacy evidence covers Foundation1.0/1.1, Intermediate/IELTS, learner pin/start/resume/evaluation mocks and lifecycle P1; real learner admission/evaluation remains outside scope.

Full machine-readable unit reports, run receipts, immutable window/state and manual ledger are retained under the approved ignored evidence directory `.superpowers/sdd/2026-10-25-beginner-r12a-isolated-db-e2e/`. They contain no database passwords or session cookies.

Final JSON reports are `main-tools-reviewed.json`, `main-legacy-reviewed.json`, `main-contracts-reviewed.json` and `main-web-reviewed.json`. Mutation evidence is `main-mutation-reviewed.log`. RuntimeRoot/runRoot/backupRoot were all still absent in the final read-only check; the original window journal remains unchanged. These checks neither reconnect to PostgreSQL nor extend execution authority.

## Independent review and corrections

One independent read-only reviewer returned **request changes**, with no P0, four P1 and three P2 findings. Its complete report is retained as `main-independent-review.md` in the ignored evidence root. No second review or independent re-approval is claimed. One correction pass addressed the findings within the existing allowlist; the reviewer did not execute DB/E2E.

| Finding | Correction and evidence | Remaining limit |
|---|---|---|
| P1: sampled SQL could retain the role password | Gate now includes duration sampling and transaction sampling, failing on missing/unsafe settings; unit RED → GREEN | Live settings were never queried. Unsafe shared logging remains a blocker, with no policy changes allowed. |
| P1: expiry could skip process shutdown | Always attempt owned shutdown before the cleanup mutation deadline check; command/backup stream budgets and SQL statement timeouts are bounded by the original window; RED → GREEN | Native child/descendant termination remains unqualified. Expiry never authorizes DB/file/role cleanup. |
| P1: crash recovery could mutate while orphaned servers remain | Durable launch intent precedes spawn/readiness; non-secret PID/binary/start/state evidence persists; uncertain launches quarantine recovery before DB cleanup; active role connections also block cleanup; RED → GREEN | Automatic crash-process termination is deliberately unavailable: a PID is insufficient ownership proof after coordinator loss. A separate recovery decision is needed for uncertainty. |
| P1: coordinator's v2 URL/approval paths failed preflight | One shared permission-input builder used by coordinator and a virtual-filesystem happy-path test; allow only exact v2 scoped paths and `connection_limit=3`, reject duplicate URL options; v1 retains its path/ACL rules; RED → GREEN | No real capability file or database was created. |
| P2: nested Prisma input acquired an invalid parent FK | Ledger inference carries inherited keys separately from outgoing nested data; RED → GREEN | Prisma/DB integration remains NOT RUN. |
| P2: historical comparisons read only post-publication rows | Capture V1, C1 and session-plan hashes before successors; integration spec compares those captured hashes afterward; pure tamper cases RED → GREEN | Live V1/V2 publication/history assertions remain NOT RUN. |
| P2: executed test failure labelled BLOCKED | Preserve phase and FAIL for executed test assertions separately from prerequisite BLOCKED and cleanup error; RED → GREEN | No DB/E2E failure was fabricated or counted as a result. |

Protected identity reads were also tightened: unbounded `groupBy`/`aggregate` cannot expose identity fields; only counts bypass exact owned-key selectors. Regression RED → GREEN. Sampling behavior was checked against [PostgreSQL17 logging documentation](https://www.postgresql.org/docs/17/runtime-config-logging.html).

## Implementation scope and limits

Added explicit v2 controlled-main permission binding, source execution capsule checks, dual-mode/default-deny checks, sanitized child configuration, egress/.env safeguards, a bounded coordinator, private backup validation, limited-role grant specification, fixture-only source/PK ledger, guarded Prisma access, exact-key/FK-aware cleanup and a fixture-only server using real session/RBAC guards. Existing isolated v1 remains a distinct mode. Synthetic fixtures do not become CONTENT_READY.

Integration coverage was prepared for actual PostgreSQL lock contention, transaction rollback/storage compensation, revision conflicts/idempotency, historical V1/C1 and exact E2E selection. These new DB-bearing paths have **not** been execution-qualified and must not be treated as ready for main-DB writes solely because static/unit checks pass.

## Rulings and residual risk

1. Use the exact scope-approved ignored evidence root and manual ledger; preserve older records. Cost: manual task bookkeeping.
2. Treat `duyệt` as direct contextual approval of the immediately presented mandate/hash, with no expansion. Cost: bounded human-message provenance, not an invented quoted hash.
3. Cleanup uses a narrow bootstrap SQL port rather than generic runtime Prisma for protected principals/catalog. Cost: adapter complexity; runtime protected writes stay denied.
4. Build mirror uses the sole approved dependency link plus a generated build-only TypeScript resolution overlay/NODE_PATH to existing dependencies. No additional link/install/dotenv. Cost: build remains unverified until executed.
5. Fail closed before password provisioning when statement/duration/audit/error logging could retain the password; no shared logging changes. Cost: ordinary server logging may block the later audit. This policy has not yet been evaluated against the live server.
6. Keep the failed execute closed and preserve its original window. Cost: DB qualification remains blocked pending specific rerun authority.

P0: no observed production mutation/exposure. P1/BLOCKED: actual DB/E2E qualification is incomplete; one-run execution stopped before SQL. Native process/backup cancellation and crash handling have only unit/static evidence, and must not be represented as Windows/PostgreSQL acceptance PASS. P2: backup restore rehearsal is unapproved/not tested; three historical checksum causes remain unknown. No verified transition or merge/push/deploy is authorized by this document.

## Changed files and acceptance boundary

Twenty-three of the twenty-six approved source paths changed; three approved paths needed no edit. Groups:

- Contracts/config: `packages/contracts/src/beginner-authoring.contracts.ts`, its spec, `apps/api/src/common/config/app-config.module.ts`, its spec.
- Runtime capability: `apps/api/src/beginner/domain/beginner-environment-preflight.ts`, its spec.
- Test runner/helpers: `apps/api/prisma.beginner-main.config.ts`, `apps/api/vitest.beginner-main-tools.config.ts`, and ten scoped files under `apps/api/test/beginner-main/` (environment, backup, fixtures, run with corresponding specs, egress guard and server).
- DB test preparation: `apps/api/test/integration/beginner-test-harness.ts`, `beginner-authoring.integration.spec.ts`, `beginner-release-registry.integration.spec.ts`.
- Web test preparation: `apps/web/playwright.beginner-admin.config.ts`, `apps/web/e2e/beginner-admin-history.spec.ts`.
- Governance bookkeeping only: current mandate lifecycle/INDEX, actual human approval note and this verification report. Frozen plan/scope/review/checksum artifacts remain untouched.

Software preparation and corrections are reviewable, but the qualification mandate and original R1.2a remain **implementing**. Full acceptance still requires a newly authorized execution window, live identity/count/privilege/schema audit, readable private backup, actual fixture publication/integration/E2E, exact-key cleanup and preservation evidence. The current approval cannot be used to reset the failed run's t0 or to claim these gates PASS. R1.2b/R2/R3/R4 have not started.

## Commits and final audit

| Commit | Scope |
|---|---|
| `5580c83` | Record real contextual human approval and CLI lifecycle bookkeeping |
| `b5a4e0f` | Additive controlled capability contracts and explicit test bootstrap configuration |
| `5291256` | Runtime preflight, bounded coordinator/fixture helpers and integration/E2E preparation with review corrections |

This verification report is retained in a separate documentation commit. Commits are local on the feature branch; no merge/push/deploy occurred. The coordinator/helpers form one coupled scoped test harness; splitting its mutual imports would leave incomplete runnable interfaces, so that software slice is committed together.

The broad secret scan flagged the runtime URL *source concatenation* at `run.ts:250`. The commit command ran before that flag was triaged; this was a workflow sequencing error. Post-commit inspection confirmed that line constructs the URL from memory-only variables, and the literal-secret scan passed. No credential was generated during this attempt or committed. The scan is evidence of a bounded pattern/manual check, not proof that arbitrary data can never contain a secret.

SKILL AUDIT — Used: mandate-steward (actual approval/lifecycle), executing-plans and TDD (scoped implementation/correction pass), systematic-debugging (native ACL failure), requesting-code-review/receiving-code-review/code-review-and-quality (one independent review and mutation experiment), verification-before-completion (fresh commands and honest NOT_RUN gates), git-workflow-and-versioning (explicit file staging/local commits), relevant NestJS/PostgreSQL domain checks. Alternatives not used: frontend redesign, new worktrees/environments, real provider calls and further increments; outside this scope. Verification results and remaining limits are recorded above.
