# R2 Full Learning Program & Progression Platform — qualification report

Started: 2026-10-30. Qualification: 2026-10-31; resumed final gates on 2026-11-01 after environment reset. Status: **IMPLEMENTED AND QUALIFIED LOCALLY — INDEPENDENT FINAL REVIEW / INTEGRATION PENDING**. No production readiness, deployment or human qualification is claimed. Main merge, push receipt and mandate verification remain controller-owned gates.

## Initial repository state

- Remote and local main independently verified at `d7a213e779c9fd4daac70e80f1e73ad545638833` via `git ls-remote origin refs/heads/main` and local refs.
- Starting worktree `C:/Users/ASUS/.codex/worktrees/r2-program-progression/WorkLingo` was clean on `codex/r2-learning-program-progression` at `d507d0c`. Its code had already been merged into main; only later integration receipts differed.
- Created required branch `codex/r2-full-learning-program-platform` at verified main in the existing isolated linked worktree. No other branch/worktree was modified.
- Main checkout `D:/Projects/WorkLingo` contained modified `apps/web/next-env.d.ts` and untracked `backups/`; preserved. Existing R1/R2 preservation stashes retained.
- Owner mission attachment: `C:/Users/ASUS/.codex/attachments/df1ef26e-1c8f-4a93-a27d-d2c7c147cf18/Pasted text.txt`. Scoped mandate: MND-20261030-011, created/triaged/approved/implementing through CLI; 35-record register validated. Approval hash is tooling-generated in the mandate.

## Baseline and environment

Actual initial API invocation omitted the explicit disposable DSN and included a test requiring a dedicated network-denied config: 164 files/1,144 tests passed, two suite failures, one skipped test and one unhandled config error. Failures were `ielts-topic-admin.service.spec.ts` (Invalid URL / missing DATABASE_URL) and `beginner-evaluator-context.spec.ts` (DEDICATED_CONTEXT_CONFIG_REQUIRED). These are retained evidence, not passing product tests.

Corrected baseline commands and results:

| Command | Result |
|---|---|
| Explicit disposable `WL_R2_TEST_DATABASE_URL`, API `vitest run --config vitest.r2.config.ts src --exclude src/teacher-ai/application/beginner-evaluator-context.spec.ts` | 165 files / 1,145 PASS |
| API `vitest run --config vitest.beginner-evaluator-context.config.ts` | 2 files / 60 PASS (17 overlap evaluation tests in baseline) |
| Web `pnpm --filter @worklingo/web test` | 150 files / 951 PASS |
| Contracts `pnpm --filter @worklingo/contracts test` | 31 files / 150 PASS |
| Parser `pnpm --filter @worklingo/content-format test` | 12 files / 147 PASS |
| Node mandate/i18n/secret-scan tests | 37 PASS |

Private logs are under `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2full-*baseline*.log`. Owned disposable PostgreSQL container `worklingo-r2full-20261030` uses loopback port 55447/database `worklingo_r2`; per-suite schemas and explicit no-env Prisma config isolate mutations. The unrelated primary container on port 55432 is read-only for this mission and is not owned for cleanup.

## Fresh primary vocabulary inspection

Both fresh snapshots used `SET TRANSACTION READ ONLY`, statement/lock timeouts and verified `transaction_read_only=on`, PostgreSQL 17.11. No primary mutation occurred.

| Data | Actual count |
|---|---:|
| Sources/documents | 5 / 5 |
| Source entries | 8,744 |
| Lexical entries | 8,129 |
| Senses | 8,742 |
| Pronunciations | 8,542 |
| CEFR associations/resolutions | 8,742 / 8,742 |
| Program/path/level/mission/lesson/version/word-bank records | 0 |

Private inventory SHA-256: `3d2d35ee7725d1cb3bf48bec69873b5f22efa73d6a60806d16cc694e07db6b38`. Fresh candidate/provenance snapshot SHA-256: `dc83339985601569b70f8ab1808b10629c4b1552dcd9bc7f3e3a3e268e5decf1`. Snapshots remain under `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2full-20261030/`.

Source documents currently provide A1/A2/B1/B2/C1; C2 is supported by contracts when source data exists but no C2 document is present. Beginner accepts A1–A2. Example verified existing pair: entry `f645a610-9c89-48c8-b029-1ef6ba81a583`, sense `f07ea45f-15ef-47e4-a352-d62823ee4e3d`, source entry `f10282ae-4527-4578-922b-e342a7301002` for “from”, original A2 retained. Licensing remains user-attested permission, not independent authentication.

On 2026-10-31 Task 4 needed full permission/attribution and source-row fields omitted from the earlier projection. Primary port 55432 was unavailable: `worklingo-review-postgres` was already exited at 05:09:36 UTC. The controller mounted its verified `infra_worklingo-postgres` volume read-only, copied it to mission-owned `worklingo-r2full-primary-rocopy-20261031`, started only a disposable clone on loopback 55448, and selected the exact source/document/three occurrence/resolution records in a transaction with `transaction_read_only=on`. Supplement SHA-256: `e6b8b51561fd0c1e6d243859f05efd237dfeac3bb695616eba9de41952799307`. The clone was stopped after the read; the primary container remained exited and its volume was never mounted writable by this operation. This snapshot is explicitly labelled an exact-row read from a disposable clone, not a live primary query. It supplies existing permission references and attribution; it creates no new legal authorization.

## Architecture and delivery status

Before: mutable program metadata plus UUID-array curriculum pins; immutable per-mission curriculum revisions and per-session lesson versions; no program release lifecycle or enrollment status/history.

Implemented additive architecture and exact builder decisions are in the linked design and execution plan and accepted decisions D-037–D-039. Current status:

| Workstream | Status |
|---|---|
| A Program lifecycle/version management | Implemented; actual UI draft/review/approve/publish/new-release journey passed |
| B Curriculum builder and exact lesson bindings | Implemented; real UI path/stage/unit/lesson/objective/prerequisite authoring passed |
| C Enrollment lifecycle/access/history | Implemented; API ownership/status/history/concurrency and UI self-enrollment qualified |
| D Deterministic progression/readiness/history | Implemented; pure/API tests plus actual UI coverage, unlock and interruption passed |
| E Mastery evidence and review scheduling | Implemented; API real review provenance qualified; unsupported dimensions UNKNOWN, AI PENDING |
| F Learner UI | Implemented; desktop/tablet/mobile EN/VI progress and exact resume evidence retained |
| G Program/version analytics | Implemented; aggregate boundaries, mixed sibling fixture and actual UI updated activity passed |
| H Master vocabulary | Exact copied source IDs/CEFR/provenance qualified through HTTP; no primary edits |
| I Publication/version compatibility | Immutable persistence, archived pins and newer release preserving old enrollment/preview passed |
| J Actual DB/API/browser/regression/review | Local engineering checks below; independent Task 6/whole-branch review and integration pending |

## Independent review and integration

Read-only discovery and builder check identified four architecture gaps: hierarchy/action granularity, multi-lesson session selection, truthful legacy-pin backfill, and explicit mastery qualification provenance. All have explicit resolutions in the design. Implementation review, mission commit audit, merge and push are pending. Final commit hashes must be populated from actual Git evidence; no final hash is invented.

### Persistence phase evidence

Commit `21b5c6f844b95c9ef57b9ab32be7c5fe5b76339e` adds release contracts, additive migration, immutable published release/binding triggers, append-only history, enrollment release/status fields, review session provenance and the labelled legacy-pin backfill. The implementer recorded 22 contract tests and 7 real disposable PostgreSQL integration tests passing, plus focused lint/typecheck and Prisma validation/generation. The controller independently reran the focused contract suite: 22/22 passed, exit 0; `git diff --check` passed.

Independent Task 1 review returned spec compliant and task quality Approved, with no Critical/Important findings. A Minor UUID case-normalization gap is assigned to Task 2 with a regression test. Source-aware legacy payload handling and service-enforced enrollment pin immutability are explicit downstream checks, not established by the persistence review alone.

The disposable public schema received an earlier migration checksum during development. Final persistence integration applied the final migration bytes to fresh isolated schemas; subsequent qualification must create fresh schemas rather than treating that public deployment as final evidence. Production data was not changed.

### Release lifecycle and enrollment phase evidence

Task 2 commit `48ab2e445874bcaf514627527a5241e1db342ddb` adds authored release lifecycle, strict source validation, preview, duplicate/rollback/archive, service-layer actor authorization, exact-version assignment, self-enrollment, lifecycle/history and idempotent receipts. Existing program endpoints remain compatible. Read resolvers validate actor status without adding write locks after session profile locks. New generic enrollment requires an authored published release; legacy captured payloads retain a separate response branch.

The implementer reports 9 files / 79 focused API/domain tests and 23 contract tests passing, API/contracts typecheck and focused lint/diff/secret checks passing. The controller independently reran the contract suite on this commit: 23/23 passed, exit 0, and diff check passed. A mutation of the version-mismatch guard caused the covering API test to fail before restoration. Initial RED tests reproduced missing endpoints, strict-input failures and a stale self-enrollment command accepted incorrectly before fixes. The lifecycle completion test uses an explicitly synthetic completion fixture; it is not proof of the new session projection engine.

Independent Task 2 review identified two Important findings: mutable authoring metadata leaked into a release-bound catalog fallback, and the standalone IELTS integration fixture omitted the new enrollment provider/dependencies. Fix commit `a572990f0853bedae11c81b5d7170fcf984ed108` captures catalog metadata server-side, derives hierarchy counts from frozen bindings, fixes the fallback and updates the IELTS fixture. Admin lifecycle management also remains available for an existing enrollment after target account/onboarding changes; account status still independently blocks learning access. The implementer recorded 4 files / 29 focused API tests and 23 contract tests passing, plus API/contracts types, focused lint, staged diff and secret checks. Scoped independent re-review is pending.

Scoped independent re-review confirmed both findings ADDRESSED, with no new Critical/Important breakage or out-of-scope observations. The controller freshly ran `pnpm --filter @worklingo/contracts exec vitest run src/program-platform.contracts.spec.ts`: 23/23 PASS, exit 0; `git diff --check` passed. Task 2 is complete at `a572990`; progression and the later acceptance gates remain open.

On 2026-10-31 the controller also ran the repository Node checks `node --test scripts/i18n-check.test.mjs scripts/qualification/scan-secrets.test.mjs .agents/skills/mandate-steward/scripts/mandate.test.mjs`: 37/37 PASS, exit 0. This is supporting hygiene evidence only; it does not establish the pending API, UI, browser or merge gates.

The owner explicitly reaffirmed continuation of the full mission on 2026-10-31. At that checkpoint Task 3 was implementing from `a572990`; subsequent phase evidence below records its completion. Read-only `git ls-remote origin refs/heads/main` again returned the original `d7a213e779c9fd4daac70e80f1e73ad545638833`; other worktrees were retained. This historical checkpoint does not establish integration.

### Progression and review implementation evidence

Task 3 commits `d1d6e90477838b32b172ba649b6f8375084e4d36` and `21173c15524b2f8ed843faae6d6e26ff422cb3cc` add pure deterministic progression/review rules, strict progress contracts, owned progress/history/review/recalculate routes and the database-only evidence adapter. Authored sessions stamp exact enrollment/release pins; repeated sessions prioritize uncovered activities, archive/retire preserves owned access, inactive enrollment blocks direct learning mutations and EvaluationService leaves unqualified authored AI mastery pending. Review completion requires later matching completed sessions and persisted event provenance. Vocabulary/grammar/pronunciation evidence remains explicitly UNKNOWN where unqualified.

The implementer reports 36 files / 249 API tests, the separate 2-file / 60 Beginner evaluator tests, and 3-file / 27 contracts tests passing, plus API/contracts types, changed-file lint, diff/secret checks. The controller freshly reran the 27 contracts: PASS, exit 0. A review-readiness condition mutation caused the pure test to fail; exact restored bytes then passed 7 pure tests. The real isolated API journey covers multi-session coverage, two exact lessons, review iteration, concurrent projection, archival reactivation, inactive direct-session guards and terminal readiness.

Independent Task 3 review found three Important defects: shorter duration could permanently miss activate activities; retry exhaustion blocked configured remediation; planner and review persistence used different session-cycle boundaries. Fix commit `3a5fa33f89db2896ad4625278b70921bba7cbc89` adds server-owned compatible/recommended durations, actionable duration rejection, configured remediation recovery and a shared review-cycle membership predicate. Retained raw logs show 251 focused API tests, 60 dedicated Beginner tests and 27 contracts passing; types/lint/diff/secret checks pass. Scoped independent re-review marks all three findings ADDRESSED and finds no new breakage. The controller freshly reran 9 pure tests: PASS, exit 0; diff check passed. Task 3 is complete; broader UI/browser/build/regression gates remain open.

### Analytics and vocabulary implementation evidence

Task 4 commit `4e8a519` adds a program/version-scoped aggregate endpoint with strict UTC half-open ranges up to 180 days, cohort/current-status definitions, actual activity, lifecycle events, frozen node observations, qualified/pending skill evidence, mature retention denominators, current review backlog and bounded version/node comparison pages. SQL aggregates run in repeatable-read transactions with service/controller authorization and an additive cohort index. Persisted projections may lag activity; backlog is explicitly current at generatedAt, not historical at `to`.

Authoring options reuse the existing vocabulary library/bindings and exact copied source fixture. Release vocabulary references capture server-canonical source, CEFR/sourceEntryId, permission and attribution; spoofed provenance is replaced, missing/foreign/rights-invalid/duplicate associations fail. No master record is edited by release authoring. The fixture keeps the exact A2 `from` graph and snapshot hashes, with no credentials/private local paths or learner data.

The implementer reports 29 focused API/pilot tests, 28 contracts, final 3 API tests after self-review, API/contracts types, focused lint, Prisma validation/migration, diff/secret checks passing. Mutation of `< to` to `<= to` failed the boundary assertion before exact restoration. The controller freshly ran 28 related contracts: PASS, exit 0. Independent Task 4 review is Approved, with no Critical/Important findings. One Minor requests a mixed multi-node analytics fixture; retained for final qualification/review. The controller compared all fixture fields across eight graph records against the exact candidate/supplement snapshots: all match. Task 5 UI and final qualification remain open.

## Qualification boundaries

### Admin and learner UI implementation evidence

Task 5 commits `193ee1b3af57c4e541fb3f7350ad3526633464af`, `2bd5548041e9f85f433de8324e5d76d605544acd`, and `bb231a7e143b6d87a9c9c0a8ec664fae89766d70` add safe learner display metadata, strict platform clients, localized release/enrollment/analytics panels, exact human-title curriculum/evidence selectors and authoritative learner progress/review/history/actions. Authored learner starts use exact lesson and server-compatible durations; null/backfilled legacy dashboards retain their branch. EN/VI metric meanings, timestamp/rate formatting and unknown evidence states remain explicit. The separate protected Beginner editorial workspace retains its existing fallback; this is not claimed as a newly qualified Beginner adapter.

The implementer records 160 web files / 971 tests, 35 contracts files / 176 tests, 13 actual isolated API lifecycle tests, typecheck/lint/i18n, production Next build and diff checks passing. Exact lesson-target mutation initially exposed identical test IDs; distinct IDs then killed the mutation, and exact restoration passed. The controller freshly ran `pnpm i18n:check`: 45 namespaces, 3050 paired keys, 0 errors (881 candidate unused keys are reported inventory, not failures); diff check passed.

Independent Task 5 review identified four Important findings: vocabulary attachment could cross reused bindings; enrollment/analytics panels retained prior program state; canonical IELTS resume used the wrong destination; acknowledged release command keys were reused for a distinct intent. Fix `b7cd619` addressed all four with RED/GREEN regressions. Scoped independent re-review found all addressed with no new breakage. The controller freshly ran four vocabulary/enrollment tests and diff check: PASS. Earlier Task 1 UUID normalization Minor was resolved by Task 2. Task 4 mixed-node and Task 5 navigation-stderr Minors are resolved in Task 6 below.

R1.2b remains engineering-closed in its bounded local scope. Real learner validation, expert pronunciation certification and real-provider grading qualification are **DEFERRED / NOT_RUN** for this mission. Synthetic tests never supply these approvals. Beginner's protected evaluator/readiness gates remain in force. Production deployment is excluded by the current mission.

## Task 6 qualification and final engineering evidence

Task 6 started at `b7cd6195e9a4b344ee2e27f22ca1c38ebfdc304a` on `codex/r2-full-learning-program-platform`. The implementation checkout is the existing linked worktree; the three parent documentation edits were explicitly assigned to this task. Main checkout changes were not touched. Final implementation commit hashes are recorded in the commit inventory below; the report commit itself is discoverable through Git history and the controller's final integration receipt.

### Database and runtime safety

Only verified container `worklingo-r2full-20261030`, PostgreSQL 17 Alpine, `127.0.0.1:55447/worklingo_r2` was mutated. Tests create unique schemas and use `prisma.r2.config.ts`; no default env-loading Prisma or API config was invoked. Fake evaluation/STT and fake-tts were explicit, real provider keys blank. Standalone selected legacy migrations use explicit no-env config. The test-only endpoint guard compares protocol, hostname, port and database path; per-suite schema query parameters are allowed. A no-I/O regression rejects a different host/port/database/protocol before migration.

On November 1 the environment reset left the owned database stopped and API/Next ports no longer listening. The first affected legacy rerun recorded five bootstrap failures and 27 skipped test bodies (infrastructure failures, not intentionally skipped assertions). `docker inspect` verified the exact mission container, owned anonymous data volume and loopback 55447 mapping before `docker start worklingo-r2full-20261030`; the subsequent guard and all legacy suites passed. No primary container/volume was started, changed or cleaned. Browser evidence was retained from October 31; it was not recreated after the reset. The disposable database remains running for controller review; no API/Next service remains listening after reset.

Fresh-schema final migration/backfill evidence is included in the seven-test R2 persistence suite: valid captured compatibility pins, fail-closed invalid pins, immutable releases/bindings, append-only history, exact constraints. Added migrations are `20261030000200_r2_full_platform` and `20261031000100_program_analytics_indexes`; older migration files are unchanged. There is no destructive down script. Operational rollback disables new selection or restores backups in a designated environment without rewriting enrolled snapshots. Primary migration/deployment was NOT_RUN.

### Actual UI journey

`apps/web/e2e/r2-full-learning-program-platform.spec.ts` replaces API-authored curriculum evidence with actual product forms. Read-only requests inspect persisted state and independently check pins; they do not author the tested hierarchy, objectives, release or enrollment.

The successful final October 31 run created a program, opened CurriculumWorkspace, created its Path/Level/two Missions, attached an existing synthetic published lesson, configured four-skill objective evidence and the second unit's prerequisite in FoundationDefinitionEditor, and published hierarchy/Foundation revisions. It selected published revisions by title, saved a release and used In review → Approved → Published controls. The learner discovered/enrolled through the catalog, opened authoritative progress, observed first available/second locked plus UNKNOWN mastery, submitted actual rendered reading/listening/writing/typed-speaking activities across repeated sessions, persisted checkpoints, completed unit one and unlocked unit two. The test asserted the next action and interrupted session's exact second-unit mission/revision/lesson pins, paused, reloaded, and keyboard-activated the exact resume URL. Admin UI loaded current aggregate analytics with one active learner, copied Version 1 to a new draft and published Version 2. Read-only assertions established unchanged enrolled version/revision arrays and byte-equivalent old release preview; learner UI still displayed pinned Version 1.

The controller separately used native CUA with actual login, then the visible Resume session link and actual Resume session button for second-unit session `0dbddf24-bf0b-4e60-8e3f-59e07b33de10`. Fresh UI showed Pause session, enabled response input and the same saved checkpoint (0 of 5); no answers were submitted during that manual confirmation. This complements the automated exact URL/keyboard/persistence assertions. Both actors are automated/synthetic: human participant count is zero. Typed speech fallback is explicitly unscored; no captured pronunciation or real-provider result was qualified.

Desktop 1440×1000, tablet 768×1024 and mobile 390×844 overflow assertions and full-page screenshots were executed for builder, published release, locked roadmap, resume roadmap and analytics in English; resume roadmap also in Vietnamese. Native CUA confirmed visible EN→VI switching and mobile width 390/scrollWidth 375. Label-based form operation, semantic headings/status/error components and keyboard Enter on resume were exercised; this is scoped accessibility evidence, not a complete WCAG certification or screen-reader audit. Loading/error/stale/input-preservation behavior is covered by component tests, not fabricated browser network faults.

Evidence retained outside ignored scratch:

- Raw command logs and controller notes: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2full-20261030/task6-evidence/` (same named `task-6-*.log` files as the SDD workspace).
- Exact journey receipt: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/task6-browser-receipt.json` (synthetic IDs and server progress; private account credentials remain only in separate uncommitted `browser-manifest.json`).
- Successful trace: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/browser-results/r2-full-learning-program-p-7af3b--preserves-old-release-pins/trace.zip` (trace mode `on`, retained on success).
- Eighteen screenshots: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/task6-{builder-en,release-en,locked-en,resume-en,resume-vi,analytics-en}-{desktop,tablet,mobile}.png`.
- Native CUA final screenshots: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/cua-evidence/final-dashboard.jpg` and `final-resumed-unit-two.jpg`. Earlier `catalog-pinned-v1.jpg` and `catalog-vietnamese-mobile.jpg` are explicitly intermediate evidence before the mastery display correction.

### Defects, regression evidence and self-review

- Pending aggregate mastery displayed a qualified-subset 100%, misleadingly adjacent to “Pending evidence.” `program-progress-view.test.tsx` reproduced it (1 failed/4 passed, `task-6-mastery-red.log`); minimal presentation change suppresses overall/lesson percentages in UNKNOWN/PENDING state, leaving known dimension scores intact. Focused GREEN: 15/15 across progress/navigation (`task-6-ui-green.log`), then full 978-test web pass. Backend grading/evidence was unchanged.
- Task 4's mixed-node Minor now has a real disposable two-unit/two-distinct-lesson fixture: unit one completed/ready, sibling incomplete/unready, stage incomplete, empty second release separate. Removing the SQL curriculum grouping predicate caused the new assertion to fail (`task-6-analytics-mutation-red.log`). Exact original source restored; full analytics four tests and R2 integration 31 tests passed. Initial fixture construction errors (missing title/sourceHash, editing a published snapshot, numeric policyVersion) remain in `task-6-analytics-regression*.log`; they are not claimed business RED tests.
- Task 5 navigation stderr Minor: jsdom attempted unsupported document navigation despite a passing disclosure test. The event now cancels browser navigation while still dispatching the real click through the component; browser navigation remains covered by Playwright/CUA. Ten navigation tests pass without that stderr; no production navigation behavior changed.
- Endpoint-isolation defect found during self-review: PostgreSQL URL `.origin` is null, so origin equality did not establish host/port equality. A no-I/O public helper test reproduced three mismatches accepted (3 failed/3 passed, `task-6-isolation-red.log`), explicit protocol/host/port/path comparison made all six pass. Selected harness and two standalone migrations use the helper. Post-fix legacy 30/30 and scoped lint/API types pass.
- Early browser harness mistakes used nonexistent detail/preview paths and a top-level missionId that actually lives in `plan`; retained failure logs identify them. Correct actual list/preview/plan seams passed. The final test asserts second-unit targets rather than an ambiguous first Start button. No product assertion was skipped or weakened.

Self-review used code-review-and-quality across correctness, readability, architecture, security and performance, plus mutation checks. Only presentation code changes production behavior; no new dependency, grading pipeline, schema or provider change was added in Task 6. Test configurations preserve default legacy behavior outside explicit R2 mode. Independent Task 6 and full branch review is still required and is controller-owned; author self-review is not substituted for it.

### Commands and observed results

All API mutation commands below used explicit disposable `WL_R2_TEST_DATABASE_URL` from the private mission environment. `vitest.r2.config.ts` sets no-env, fake providers and owned endpoint; it was never replaced with the ordinary env-loading config. Counts overlap where documented; they are not a unique-test total.

| Actual command | Result / raw log |
|---|---|
| `pnpm --filter @worklingo/web exec playwright test --config playwright.r2.config.ts` | Final 1/1 PASS, 57.3s overall / 54.2s test; `task-6-browser-final-2.log` |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2.config.ts src --exclude src/teacher-ai/application/beginner-evaluator-context.spec.ts` | 167 files / 1,154 PASS; `task-6-api-units.log` |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts` | 2 files / 60 PASS; `task-6-evaluator-context.log` (evaluation.service overlaps unit run) |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2.config.ts test/integration` | 7 files / 31 PASS; `task-6-r2-integration.log` (before six-test no-I/O isolation suite was added) |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2.config.ts test/integration/r2-qualification-isolation.spec.ts` then `pnpm --filter @worklingo/api exec vitest run --config vitest.r2-legacy.config.ts` | 6 isolation tests + 6 legacy files / 30 tests PASS after final guard fix; `task-6-isolation-final-green.log` |
| `pnpm --filter @worklingo/web test` | Initial broad run: 159 files / 977 PASS, 1 existing topic-publication-panel test hit 5s timeout under concurrent load; `task-6-web.log` |
| `pnpm --filter @worklingo/web exec vitest run src/features/admin-intermediate/topic-publication-panel.test.tsx` | 10/10 PASS without code or timeout changes; `task-6-web-timeout-rerun.log` |
| `pnpm --filter @worklingo/web exec vitest run --maxWorkers=2` | Final full 160 files / 978 PASS, 411.47s; `task-6-web-final.log` |
| `pnpm --filter @worklingo/contracts test` | 35 files / 176 PASS; `task-6-final-contracts.log` |
| `pnpm --filter @worklingo/content-format test` | 12 files / 147 PASS; `task-6-shared.log` |
| `pnpm i18n:check` | 45 namespaces / 3,050 paired keys / 0 errors; 881 candidate-unused keys are inventory; `task-6-root.log` |
| `node --test scripts/i18n-check.test.mjs scripts/qualification/scan-secrets.test.mjs .agents/skills/mandate-steward/scripts/mandate.test.mjs` | 37/37 PASS; `task-6-root.log` |
| `pnpm test:setup-local`; `pnpm test:postgres-client`; `pnpm mandate:check`; `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qualification/scan-secrets.ps1` | PASS; mandate valid with 35 records; tracked env/private-key scan PASS; `task-6-root.log` |
| `pnpm lint`; `pnpm typecheck` | Full workspace PASS; `task-6-final-lint.log`, `task-6-final-types.log` |
| Changed isolation files `pnpm --filter @worklingo/api exec eslint ...`; `pnpm --filter @worklingo/api typecheck` | PASS after final guard fix; `task-6-isolation-lint.log`, `task-6-isolation-types.log` |
| `pnpm build` (explicit blank DB/provider keys, fake providers) | Full workspace production build PASS; `task-6-final-build.log` |

Expected API job-runner failure tests emit safe `PROVIDER_TIMEOUT` / `STORAGE_CLEANUP_FAILED` warnings; their assertions pass. No unhandled suite errors or navigation stderr were hidden as green. The bare root `pnpm test`/`pnpm verify` and default browser suite were deliberately not invoked: their ordinary API/Prisma paths can load primary `.env` or require separately authorized legacy fixtures. The safe component-wise commands above cover full API unit/web/contracts/parser and selected explicit integration seams; they do not claim every historical integration/E2E suite ran. Beginner domain/component/evaluator regression and IELTS unit/component plus selected real DB session/catalog regression ran; a new protected Beginner editorial publication or real-provider qualification did not.

### Routes and operational handoff

Existing `/admin/learning-programs`, `/admin/curriculum?programId=...`, `/programs`, `/dashboard` and `/sessions/:id` host the UI. API routes remain under `/api/v1`: admin programs metadata list/create/update/publish; authoring-options, versions list/create/save/preview/transition, archive/rollback/duplicate; admin enrollment list/assign/transition/history; learner program-enrollments list/enroll/withdraw/progress/recalculate/history/reviews/complete; program/version analytics; and exact-target `learning-sessions/curriculum`. Trusted actor IDs come from authentication; services enforce authorization and strict contracts. Private attempt text/learner identifiers are excluded from analytics.

API port 33542 and Next port 33543 served the October 31 browser fixture with private manifest in the evidence root. They stopped during environment reset and were not restarted unnecessarily. Only mission PostgreSQL 55447 remains running after the November 1 restart. Controller owns cleanup after independent reviews and preserving evidence. No merge, push, production deployment, primary mutation or mandate verified transition has been performed by Task 6.

Remaining gates: independent Task 6 and whole-branch review from starting main through implementation head; fixes for any actionable findings; controller mandate transition via real CLI; recheck actual main/remote SHA, protection and check status; authorized normal integration/push and remote receipt. Read-only controller check at `b7cd619`: main/remote `d7a213e779c9fd4daac70e80f1e73ad545638833`, branch protected=false, checks total_count=0 (absent CI is not green CI). Preserve main's unrelated `apps/web/next-env.d.ts` and `backups/`. No current unresolved product Critical/Important finding is asserted closed before independent final review.

Recommended next milestone after engineering integration: separately scoped controlled learner/content validation and evaluator/provider qualification, with calibrated evidence and existing protected Beginner/IELTS gates. Production readiness requires those external and operational approvals; this synthetic mission does not grant them.

## Exact integration inclusion and exclusions

Executed integration/no-I/O suites (browser bootstrap separately serves evidence):

- `apps/api/test/integration/r2-curriculum-progression.integration.spec.ts`
- `apps/api/test/integration/r2-full-platform.integration.spec.ts`
- `apps/api/test/integration/r2-platform-lifecycle.integration.spec.ts`
- `apps/api/test/integration/r2-program-analytics.integration.spec.ts`
- `apps/api/test/integration/r2-program-authoring.integration.spec.ts`
- `apps/api/test/integration/r2-program-progression.integration.spec.ts`
- `apps/api/test/integration/r2-progression-platform.integration.spec.ts`
- `apps/api/test/integration/r2-qualification-isolation.spec.ts`
- `apps/api/test/integration/curriculum-foundation-progress.integration.spec.ts`
- `apps/api/test/integration/ielts-beta-catalog.integration.spec.ts`
- `apps/api/test/integration/ielts-study-session.integration.spec.ts`
- `apps/api/test/integration/learning-sessions.integration.spec.ts`
- `apps/api/test/integration/mastery.integration.spec.ts`
- `apps/api/test/integration/learning-programs-api.integration.spec.ts`

Explicitly NOT_RUN in the final broad integration selection (77 suites; no claim that historical suites were included):

- `adaptive-learning.integration.spec.ts`
- `admin-audit-api.integration.spec.ts`
- `admin-authorization.integration.spec.ts`
- `admin-curriculum-commands.integration.spec.ts`
- `admin-curriculum-query.integration.spec.ts`
- `admin-curriculum-schema.integration.spec.ts`
- `admin-operations-api.integration.spec.ts`
- `ai-settings.integration.spec.ts`
- `audio-settings-api.integration.spec.ts`
- `audio-settings-schema.integration.spec.ts`
- `auth.integration.spec.ts`
- `backup-restore.integration.spec.ts`
- `beginner-authoring.integration.spec.ts`
- `beginner-release-registry.integration.spec.ts`
- `content-audio.integration.spec.ts`
- `content-imports.integration.spec.ts`
- `content-publish.integration.spec.ts`
- `content-schema.integration.spec.ts`
- `curriculum-foundation-admin.integration.spec.ts`
- `curriculum-foundation-eligibility.integration.spec.ts`
- `curriculum-foundation-schema.integration.spec.ts`
- `curriculum-seed.integration.spec.ts`
- `dashboard-analytics.integration.spec.ts`
- `engagement-api.integration.spec.ts`
- `engagement-projection.integration.spec.ts`
- `engagement-schema.integration.spec.ts`
- `error-bank-api.integration.spec.ts`
- `error-bank-schema.integration.spec.ts`
- `error-bank.integration.spec.ts`
- `health.integration.spec.ts`
- `ielts-band-curriculum-schema.integration.spec.ts`
- `ielts-bridge-admin.integration.spec.ts`
- `ielts-bridge-learner.integration.spec.ts`
- `ielts-bridge-schema.integration.spec.ts`
- `ielts-flow-overview.integration.spec.ts`
- `ielts-flow-v3-compatibility.integration.spec.ts`
- `ielts-flow-v3-release.integration.spec.ts`
- `ielts-flow-v3-schema.integration.spec.ts`
- `ielts-integrated-schema.integration.spec.ts`
- `ielts-introduction-v3.integration.spec.ts`
- `ielts-mock-media.integration.spec.ts`
- `ielts-mock-modes.integration.spec.ts`
- `ielts-mock-schema.integration.spec.ts`
- `ielts-mock-workflow.integration.spec.ts`
- `ielts-orientation-admin.integration.spec.ts`
- `ielts-orientation-learner.integration.spec.ts`
- `ielts-orientation-schema.integration.spec.ts`
- `intermediate-topic-groups.integration.spec.ts`
- `jobs-worker.integration.spec.ts`
- `learning-program-migration.integration.spec.ts`
- `locale-preferences.integration.spec.ts`
- `mastery-schema.integration.spec.ts`
- `multipart-security.integration.spec.ts`
- `onboarding-migration.integration.spec.ts`
- `onboarding-schema.integration.spec.ts`
- `onboarding-self-placement.integration.spec.ts`
- `pilot-analytics.integration.spec.ts`
- `placement-attempt.integration.spec.ts`
- `placement-confirmation.integration.spec.ts`
- `placement-isolation.integration.spec.ts`
- `program-context-api.integration.spec.ts`
- `program-enrollment-migration.integration.spec.ts`
- `program-learning-boundaries.integration.spec.ts`
- `progression.integration.spec.ts`
- `rate-limit.integration.spec.ts`
- `recording-retention.integration.spec.ts`
- `session-ownership.integration.spec.ts`
- `speaking-submission.integration.spec.ts`
- `teacher-ai-api.integration.spec.ts`
- `teacher-ai-pipeline.integration.spec.ts`
- `teacher-ai-schema.integration.spec.ts`
- `versioned-learner-audio.integration.spec.ts`
- `vocabulary-library-api.integration.spec.ts`
- `vocabulary-library-http.integration.spec.ts`
- `vocabulary-library.integration.spec.ts`
- `vocabulary-pagination.integration.spec.ts`
- `vocabulary-publication.integration.spec.ts`

## Exhaustive ledger rulings (verbatim, including costs)

- Ruling: Use existing linked worktree and new branch at verified main — no new checkout needed — cost if wrong: branch relocation only.

- Ruling: Owner autonomous mission supersedes routine design/plan/seam approval prompts — all public pure/API/browser seams are authorized — cost if wrong: reversible implementation rework.

- Ruling: Single-session lesson version preserved; multi-lesson curriculum uses explicit optional lessonVersionId selection — prevents evaluator rewrite — cost if wrong: additive API change.

- Ruling: Legacy backfill is labelled captured compatibility metadata, not historical fidelity — cannot reconstruct unavailable history — cost if wrong: backfill rework on disposable schemas only.

- Ruling: Duplicate program clones path/level/mission/curriculum identities and remaps prerequisite/binding refs; immutable lesson versions/vocabulary are reused. Cloned source hierarchy publication may remain, but new program IN_DEVELOPMENT and ProgramVersion DRAFT block discovery/enrollment — preserves strict ownership/publication validation — cost if wrong: duplicate-copy rework in disposable environment.

- Ruling: Keep strict Zod boundary validation used by repository rather than introduce duplicate class-validator DTO validation from generic NestJS skill — actual repository convention higher priority — cost if wrong: DTO adapter only. Task2 will add service-level auth to existing and new program endpoints. No production action authorized.

- Ruling: Admin may manage existing enrollment lifecycle when target account is disabled or onboarding changed; actor authorization stays mandatory and account ACTIVE guard still blocks all learning access — lifecycle administration cannot be stuck after account suspension — cost if wrong: lifecycle policy rework only, no learner access expansion because account status independently enforced.

- Ruling: Published release catalog icon and path/level counts use captured snapshot metadata/distinct bindings; program displayOrder can remain explicit global merchandising configuration, not enrolled curriculum semantics — prevent live hierarchy archive changing released presentation — cost if wrong: snapshot DTO/presentation adjustment. Fixround1 includes optional JSON catalog metadata capture and regression, no migration.

- Ruling: Authored completion uses frozen lesson activityIds and configured requiredActivityRatio, rather than legacy objective-only coverage. Shorter sessions may require further sessions; authored planning must prioritize uncovered activities so 100% coverage stays reachable. Legacy null/backfill semantics remain unchanged. Test fixture full coverage may use60 minutes — cost if wrong: authored coverage/planning policy rework, no primary data changes.

- Ruling: Authored enrollment COMPLETED transition requires projection.ready plus completion, since terminal status must not bypass configured mastery/review readiness; projection.completed remains activity coverage only. Null/LEGACY_PIN_BACKFILL keeps legacy completion gate. Task3 will update the synthetic fixture/regression. Cost if wrong: terminal lifecycle gate rework only.

- Ruling: Fix authored duration dead end via per-item server availableDurations + recommendedDurationMinutes from pinned parsed content/cycle coverage, mirrored in session availability and validated in create paths; incompatible selection fails actionable PROGRAM_DURATION_CANNOT_COVER_PENDING_ACTIVITIES. Explicit configured remediation can recover after ordinary retry exhaustion while cooldown/enrollment/prerequisite gates remain. Review cycle uses completedAt>boundary and startedAt>=boundary shared predicate. Cost if wrong: additive DTO/UI duration or remediation-policy rework only.

- Ruling: Task5 may add minimal server-owned learner enrollment/catalog display DTO metadata (pinned title/version number/source/objectives) because current ID-only DTO cannot satisfy mission readable pinnedversion/programdiscovery requirements. Ownership/auth, safe content only, historical/legacybranch preserved; focusedactualAPI/contracts/UItests required. Cost if wrong: additive DTO/client mapping rework only.

No additional product-scope ruling was made in Task 6. Its sequencing boundary delegates independent review, mandate verification and integration to the controller. Previous deferred Minors: UUID normalization (Task 2), mixed sibling analytics (Task 6), and navigation stderr (Task 6) are resolved; none is silently omitted from review.

## Commit inventory and review boundary

Starting main: `d7a213e779c9fd4daac70e80f1e73ad545638833`. Task 6 base: `b7cd6195e9a4b344ee2e27f22ca1c38ebfdc304a`. Qualified implementation head: `97f205e0135395a22bf45cb5513da300c1dc8b08`. Documentation-only reporting commit follows this implementation head; controller records the final reviewed/integrated SHA.

```text
90246a1bc0d3f08ff0a598806373040bed4260e3 docs: scope authorized R2 full platform mission
21b5c6f844b95c9ef57b9ab32be7c5fe5b76339e feat: persist immutable program releases and progression history
48ab2e445874bcaf514627527a5241e1db342ddb feat: add audited program release and enrollment lifecycle
a572990f0853bedae11c81b5d7170fcf984ed108 fix: preserve published catalog snapshots and enrollment administration
d1d6e90477838b32b172ba649b6f8375084e4d36 feat: define deterministic pinned program progression and review rules
21173c15524b2f8ed843faae6d6e26ff422cb3cc feat: persist owned release progression and real session review evidence
3a5fa33f89db2896ad4625278b70921bba7cbc89 fix: keep authored continuation and remediation reachable
4e8a51911f53922a50d7e7b00184257c2212f0b4 feat: add release-scoped program analytics and vocabulary provenance
193ee1b3af57c4e541fb3f7350ad3526633464af feat: expose safe pinned release presentation to learners
2bd5548041e9f85f433de8324e5d76d605544acd feat: add release enrollment analytics and learner progress panels
bb231a7e143b6d87a9c9c0a8ec664fae89766d70 feat: connect authored program workflows to admin and learner routes
b7cd6195e9a4b344ee2e27f22ca1c38ebfdc304a fix: isolate program edits and retire acknowledged command keys
2acab43126a59d920dec01579b1253ccf75445ec fix: hide incomplete aggregate mastery percentages
97f205e0135395a22bf45cb5513da300c1dc8b08 test: qualify real R2 authoring and pinned learner progression
```

All mission commits are included in the independent review range. Task 1–5 reviewed findings/fix rounds are documented above. Task 6 author self-review found/corrected misleading pending score presentation and endpoint guard comparisons, retained regression/mutation evidence, and inspected the final explicit diff. Fresh independent review and any subsequent findings are not fabricated here. Merge/push verification: NOT_RUN by qualification implementer; main/remote checks above remain checkpoint evidence only.

## Final whole-branch review fix wave - 2026-11-01

The independent review of `d7a213e..70810eb` returned no Critical, three Important and two Minor findings. This single implementer wave starts from clean `70810ebd269284ece29b9287d1883ddd10f6be10`; production/test head is `8505333d386944925e977714372f58010d87b562`. It addresses the three Important findings and the Resume E2E Minor. The controller owns the one scoped re-review, governance and integration; none is claimed complete here.

| Finding | Final behavior and evidence |
| --- | --- |
| Publication admitted an unstartable lesson layout | Authored duration availability calls the canonical pure planner. Publication follows the same shortest-duration recommendation while accumulating covered activities and rejects a dead end with HTTP 422 `PROGRAM_LESSON_UNPLAYABLE`, the lesson version and corrective guidance. Both writing-in-activate and an unreachable reading activity in respond fail publication; a supported multi-skill lesson publishes, starts and reaches all pinned activities through real HTTP submissions. |
| Reading/listening scores leaked to other skill tags | Only the comprehension activity's own assessed skill receives its verified deterministic score. Extra instructional tags remain PENDING with null score. Actual multi-skill learner progress and persisted admin analytics show zero qualified speaking/writing attempts; completion still reaches 100%. EvaluationService and canonical Beginner/IELTS planners are unchanged. |
| Inactive selected enrollment blocked a new program | Current identity/revision is checked independently of current enrollment status. COMPLETED, SUSPENDED and WITHDRAWN generic program A can each self-enroll in new eligible B. Tests verify stale revisions fail, receipt replay is stable, A and its pins are unchanged, B pins the published release, and selecting inactive A still requires explicit reactivation. |
| Resume E2E stopped at URL navigation | Test clicks the actual Resume session button, reads persisted `in_progress`, and verifies the checkpoint and exact plan/lesson/curriculum pins. A separate disposable SQL read confirms DB `IN_PROGRESS` at checkpoint 0. |
| Expected unit logger emissions | Explicitly DEFERRED, nonblocking test hygiene in `safe-exception.filter.spec.ts:202` and `job-runner.service.spec.ts:128` (also transient storage-cleanup test). Expected safe logs remain visible; no production logging or failure assertion was weakened. |

New commits:

```text
7547e95abe1585aa65b4ee4ea68bedb125143642 fix: allow switching away from inactive program enrollments
0bbbba0a69d9f82d749c36b726f65b0bd7b55550 fix: validate authored session coverage and assessed skill evidence
8505333d386944925e977714372f58010d87b562 test: verify actual resume preserves the program session checkpoint
```

Fresh checks on this final production code, using only no-env configurations and the owned loopback 55447 database:

| Command / scope | Observed result |
| --- | --- |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2.config.ts test/integration` | 9 files / 43 PASS, including all new HTTP regressions and isolated migration checks |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2.config.ts src --exclude src/teacher-ai/application/beginner-evaluator-context.spec.ts` | 167 files / 1,154 PASS |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.r2-legacy.config.ts` | 6 files / 30 PASS; explicit Foundation, IELTS study/catalog, learning sessions, mastery and legacy program seams |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts` | 2 files / 60 PASS; includes unchanged EvaluationService |
| `pnpm --filter @worklingo/contracts test` | 35 files / 176 PASS |
| Web targeted program catalog/enrollment/admin and SessionShell; then program-platform and API clients | 4 files / 41 PASS + 10 files / 26 PASS |
| `pnpm --filter @worklingo/web exec playwright test --config playwright.r2.config.ts` | Fresh actual form-driven journey 1/1 PASS, including Resume button; 1.3 minutes overall |
| `pnpm --filter @worklingo/api typecheck`; `pnpm --filter @worklingo/api build`; scoped ESLint of six changed API files | PASS |
| Secret scan; `git diff --check` | PASS; private browser manifest and generated Next route file excluded |

TDD evidence: the original publication implementation returns 200 instead of 422 for both invalid layouts; the original adapter reports speaking qualifiedAttempts 1 / score 1 from reading; all three original inactive-context cases return 409 instead of 200. After fixes all pass. A deliberate mutation restoring the ACTIVE guard kills all three strengthened generic-A cases; exact restoration passes 3/3. The targeted mutation runs exclude 13 unrelated cases by `-t`; the full lifecycle file passes all 16 in the complete R2 run.

Preserved non-product failures: an early target-reactivation assertion used canonical Intermediate's reserved slug and received 400; the fixture was strengthened to generic authored A/B. The first fresh browser assertion incorrectly used database enum casing `PAUSED` rather than the documented HTTP DTO `paused`; the corrected run still asserts the actual state, checkpoint, plan and pins. A web test invocation used a nonexistent `program-progress` directory and found no tests; the corrected `program-platform` run passes 26. A conservative schema-name guard rejected the first SQL probe before execution; the validated actual fixture schema was then queried. Hidden Start-Process startup was blocked by automatic command policy; the ordinary persistent exec session successfully started the same local Next service.

Stable evidence root: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2full-20261030/task6-evidence/`. New raw logs are `final-fix-*.log`; full commands, outputs and self-review are in `.superpowers/sdd/2026-10-30-r2-full-learning-program-platform/final-fix-report.md` and its retained copy in the evidence root. Fresh browser screenshots, timestamped receipt (`2026-11-01T04:01:13.114Z`) and trace are in `final-fix-browser-evidence/`; first fresh failure trace/context are in `final-fix-browser-first-failure/`. Prior Task 6 screenshots and receipt were copied to `pre-final-fix-browser/` before the new run. The older shared-output Task 6 trace was overwritten by the first fresh run and was not separately retained; historical references to that path must not be interpreted as the old trace still being available. Fresh trace is explicitly `final-fix-browser-evidence/trace.zip`.

Fresh resumed session: `cd1e1d17-9eb1-4ca7-af2a-f7423c754337`, DB `IN_PROGRESS`, checkpoint 0, curriculum `acb37c20-fe22-4bbf-ae23-b81e7b8eb4a0`, lesson `2846849b-1abd-4714-838f-26209922a732`; raw result `final-fix-resume-db.log`. The unique browser schema was closed by the explicit owned stop request and its harness cleaned it; API/Next listeners are stopped. Owned PostgreSQL remains running. Main checkout, primary database, provider keys and existing user work were untouched.

The unchanged full web 978, parser 147 and full workspace build in Task 6 remain historical pre-fix evidence; they were not rerun or relabelled as fresh. Current localized API changes have the full API regression/build and real browser coverage above. Production-scale latency, exhaustive legacy journeys, real-provider grading, human/pronunciation qualification, full WCAG certification, live primary-content inspection, legal permission authenticity and deployment remain limited/deferred exactly as stated earlier. No schema migration, new dependency, grading pipeline or production action was introduced. All twelve ledger rulings remain preserved; D-040 records these fixes within the existing approved scope.
