# W0 Intermediate baseline and D1 recommendation

Date: 2026-10-16, Asia/Saigon. Revision: `efa2fd99b5373a644a011af3787bf81f737a51a7`; native managed worktree at `C:/Users/ASUS/.codex/worktrees/intermediate-quality-baseline/WorkLingo`, detached HEAD. Original dirty checkout was preserved.

## Outcome and limits

W0's **baseline discovery is complete for the examined local legacy schema and fixtures**, with explicit limits: fixture/planner checks pass, all 27 disposable-schema integration tests pass, and direct read-only compatibility inspection of configured public found 3 published Pre-A1 versions. Public has only 16 of HEAD's 31 migrations and no LearningProgram table, so Intermediate catalog membership/label mismatch cannot be established there. The current-model CLI remains blocked by that schema mismatch; a separately labeled migrated-copy inventory demonstrates its behavior after the existing migrations. No public upgrade is required to report this baseline. No learner-public-schema writes, content publish, provider call, program reassignment, scoring change, commit, push or merge was performed.

The user accepted the planning package with “duyệt” and delegated the best evidence-backed D1 recommendation. The [approval note](2026-10-16-intermediate-approval.md) preserves scope; the mandate is approved with W0 limits, not verified/implemented as a whole.

## Reproducible fixture result

Machine-readable evidence: [fixture baseline](2026-10-16-intermediate-fixture-baseline.json). Input is the current expanded `packages/test-fixtures/src/foundation-mission.fixture.ts`, assigned deterministic synthetic UUIDs/order before parsing with the real curriculum schema. The real `computeAvailableDurations` and `planFoundationSession` are executed without providers/DB. This is synthetic evidence, not published content discovery.

Full fixture: **10 activities, 10 MCQ, 4 open tasks, 2 contexts**, FOUNDATION_1 / Pre-A1. Open tasks count speaking/writing prompts, including Activate writing and shadowing; they are not all independent transfer assessments.

| Planned minutes | Selected activities | MCQ | Open tasks | Actual plan validates |
| --- | --- | --- | --- | --- |
| 45 | 4 | 5 | 2 | yes |
| 60 | 5 | 5 | 3 | yes |
| 90 | 7 | 8 | 3 | yes |
| 120 | 8 | 8 | 4 | yes |
| 150 | 10 | 10 | 4 | yes |

The legacy five-activity subset still rejects 90/120/150 with `INSUFFICIENT_CONTENT_FOR_DURATION` and [45,60] availability. These are different inputs; earlier contradictory reports/docs did not always distinguish them. Structural validity does not establish adequate workload or 15 minutes of actual learning per block.

No actual active-time, overlap percentage, CEFR attainment or listening independence metric was measured. Word counts in the JSON use whitespace-separated tokens, explicitly distinct from other tokenization methods. No semantic-overlap percentage is inferred from identical/different text hashes.

## Initial DB/integration check — superseded by continuation below

The existing root configuration points to loopback port 55432, schema public; credentials were never printed. The read-only inventory CLI accepts loopback URLs only, starts a RepeatableRead transaction, applies `SET TRANSACTION READ ONLY` before its first query, uses selected fields/limits, and exports aggregate counts/safe IDs only. It never seeds or repairs data. The pure summary redacts source/answer/provider text, including unexpected extra audio fields, and retains unknown audio duration/provenance.

`pnpm --filter @worklingo/api exec tsx scripts/report-intermediate-inventory.ts` exits 1 with a safe `INVENTORY_UNAVAILABLE` message. A separate socket probe also confirmed the configured endpoint is unreachable. No alternate port or test database was silently substituted.

The two requested integration suites fail during Prisma migration/bootstrap and skip all 27 tests. A cleanup hook also reports unreachable DB. Their schemas use generated test-only names; no application assertion ran. This is an environment blocker, not a verified application regression. Full DB-dependent suite/build/E2E was not repeated against this same known unavailable endpoint.

Next environmental action: restore the configured PostgreSQL service/endpoint, then rerun the CLI and the two suites. Do not seed or migrate the learner schema to obtain an inventory. Disposable integration fixtures may migrate only their own generated schemas.

## D1 — Recommended product direction

**Recommendation: add a genuinely B1 path in Intermediate, first with 1–2 expert-reviewed lessons, while preserving current Foundation learners and historical version bindings.** Plan B2 after B1 pilot evidence; do not obtain “B1” by increasing question counts or relabeling Pre-A1 content.

Reasons grounded in the current system:

1. The catalog labels Intermediate B1–B2, but the inspected seed is FOUNDATION_1 / Pre-A1. A new B1 path addresses the substance of that mismatch; renaming alone cannot create the intended product.
2. `LearningPath.programId` supports additive paths. Existing session/version snapshots can keep their historical content while new reviewed content is published separately.
3. `ProgramContextService` checks that an enrollment's current level belongs to its active program (`program-context.service.ts`, `initializeIntermediate`/`readContext`). Moving Foundation into Beginner would affect enrollment/program membership and compatibility mirrors; it is not a harmless metadata rename.
4. Snapshot immutability, prerequisites, placement evidence and currentLevel membership are existing safeguards to preserve. New-entry eligibility/defaults must be designed explicitly before steering any learner to the new path.

Transition proposal for review: keep the current Foundation path as an accurately labeled bridge/legacy path for enrolled learners; make UI copy transparent about Foundation versus B1. Enable new B1 selection only after reviewed content, eligibility and readiness are in place. Do not move existing levels or switch activeProgramId/currentLevelCode automatically. A future Beginner destination can be considered separately for new learners with its own admission/enrollment design, rather than forcing a migration now.

The human subsequently accepted this direction with a second “duyệt”; it is recorded as [D-036](../../docs/DECISIONS.md#d-036--intermediate-b1-additive-path-with-foundation-continuity). This approves the product direction, not a claim that B1 content exists, passes expert review or is ready for publication. Current learner-facing defaults/eligibility and D2–D10 remain gated.

## Verification record

- Original checkout planner baseline: 37/37 PASS.
- Isolated worktree planner baseline: 37/37 PASS.
- Final inventory summary plus planner specs: 46/46 PASS (9 inventory + 37 planner).
- Red→green: absent inventory module initially failed as the planned missing implementation; an added privacy regression then exposed extra audio-field leakage, and an explicit field projection made it pass. Synthetic fixture setup issues were corrected without weakening product assertions.
- `tsc --project apps/api/tsconfig.inventory.json` and ESLint for both inventory files: passed (run through API workspace).
- Initial current-model inventory CLI: BLOCKED/unavailable, exit 1. After service recovery: blocked by missing `public.LearningProgram`. Direct legacy-compatible read-only inspection subsequently exported a separately labeled configured-public baseline with unknown program membership.
- Initial `curriculum-seed.integration.spec.ts` and `learning-sessions.integration.spec.ts`: setup failed, 27 skipped. After service recovery: **27/27 PASS**, using their generated disposable schemas.
- Mandate validate after direct human approval: valid=true, count=2. Product implementation acceptance remains unverified.

W3's profiler/Admin changes and W1/W2/W4–W8 were not implemented in this W0 slice. W3 timing configuration requires review; other policy/data/provider/release gates remain open.

## Independent review and final checks

The reviewer identified one Important finding: audio bindings were not capped even though version/mission queries were bounded. A new test first failed because the query was unbounded; adding `take:101` plus overflow detection above 100 bindings makes it reject rather than export a partial inventory. The full focused suite then passed 46/46, with focused TSC/ESLint passing again. No live SQL verification is claimed.

Mutation check: inverting the provenance condition caused two tests to fail; the original bytes were restored, then the suite passed. Final `mandate.mjs validate` and `git diff --check` passed. No package version or lockfile change.

The review's minor roadmap status finding was corrected in this continuation: W0 and D1 direction are accepted; downstream implementation gates remain open.

Execution choices and limits:

- W0 was run inline because the user approved the package without selecting a method; a later slice can choose a different method. Cost if wrong: change method later, no product-policy change.
- Worktree isolation followed the approved master plan's setup step. Cost if wrong: one recoverable local checkout; unrelated original work was preserved.
- Reviewer set live SQL/endpoint enforcement aside because DB is unavailable. Expected behavior remains read-only, bounded, safe failure; runtime evidence stays blocked. Cost: W0 cannot be declared complete.
- Reviewer set CEFR/elapsed-time/audio quality aside because they require real content/learner evidence and qualified review. No proficiency/timing/quality claim is made. Cost: product decisions remain gated.
- Reviewer set W3/downstream arithmetic/UI aside because none was implemented. Their acceptance remains open. Cost: no workload-warning feature delivered yet.
- Reviewer set current learner eligibility aside because output is publication states plus pure-plan validity, not an authenticated endpoint result. No live eligibility claim is made. Cost: DB/endpoint baseline must be rerun.

## 2026-10-16 continuation — D1 accepted and database recovery/preflight

The human's second “duyệt” accepts the additive B1 direction in D-036, preserving Foundation/enrollment/history. The existing `worklingo-audio-review-postgres` container mapped to the configured loopback port was started without resetting its volume. During the later preflight it was found stopped again (exit 255, no OOM flag); it was restarted and readiness confirmed. No cause of that stop is asserted.

The two existing integration suites then passed **27/27** (15 curriculum-seed and 12 learning-sessions). Their own disposable schemas were cleaned up. This verifies those fixture scenarios; it does not establish authenticated learner eligibility or live-public content sufficiency.

Read-only schema inspection reports **37 public tables, 16 applied migrations, 15 pending, no LearningProgram table**. The exact pending list is in [schema status](2026-10-16-intermediate-schema-status.json). Migrations include catalog/path backfill and learner enrollment initialization; they are not just metadata required by this report. No public migration or seed was run.

A repository-native backup was saved at `D:/Projects/WorkLingo/.superpowers/backups/intermediate-preupgrade/backup-20261016-083132-9bdecada`. Its manifest was verified during restore; database dump SHA256 is `d9120880d1c0881489114aa28389e6d343a89c18eebe439692fe6586f0d7de5b`. Raw dump/data stay in ignored local storage and are not included in mandate artifacts.

The backup was restored into a fresh `w0_rehearsal_<uuid>` schema with a separate data directory, then the existing 15 pending migrations were applied there. All **31 migrations** finished. Comparing row counts and order-independent row digests over the original columns of **36 legacy application tables / 96 rows** found **zero changed legacy tables**; new fields/tables and migration bookkeeping are intentionally excluded. This is evidence for this backup only, not a promise for future database state. The disposable schema was removed successfully. Safe results: [upgrade preflight](2026-10-16-intermediate-upgrade-preflight.json).

Read-only inventory on that migrated copy found **3 published lesson versions**, all FOUNDATION_1 / Pre-A1 with a B1–B2 catalog-label mismatch: two learning versions each have **5 activities / 5 MCQ / 3 open tasks**, structurally playable at **45/60** minutes; one placement version has **4 / 5 / 2**, playable at **45** minutes. All have fake-tts metadata with unknown duration. Source provenance is unknown for the two learning versions and fixture-hash-match for placement; no seed was run during rehearsal. See [copy-only inventory](2026-10-16-intermediate-rehearsal-inventory.json). These are counts of the backed-up local data after migration, not production counts, expert CEFR validation or public learner endpoint evidence.

After rehearsal, another read-only inspection confirms public still has **16 applied / 15 pending** migrations and no LearningProgram table; no rehearsal schema remains. [Reviewable operation and rollback](2026-10-16-intermediate-local-upgrade-review.md) defines an optional future maintenance action; D1 approval has not been stretched to cover it. Upgrading public is not a prerequisite for the compatibility inventory below.

## Direct configured-public legacy baseline

A bounded compatibility inspection uses explicit schema-qualified SELECTs over the existing tables, in a RepeatableRead transaction with `SET TRANSACTION READ ONLY` before any query. PostgreSQL itself returned `transaction_read_only=on` and `transaction_isolation=repeatable read`. Versions are capped at 501 with rejection above 500; mission/audio bindings at 101 with rejection above 100. It reuses the reviewed `summarizeInventory` projection and real planner, exports no snapshots/source/answers/learner records, and performs no migrations or seeds. The one-off inspection stays in ignored workflow scratch rather than introducing another production schema compatibility layer.

The actual configured public data contains **3 published versions, no unbound versions**: two learning versions each **5 activities / 5 MCQ / 3 open tasks**, valid at **45/60** minutes; placement **4 / 5 / 2**, valid at **45** minutes. All declare FOUNDATION_1 / Pre-A1. Audio metadata is fake-tts, with duration unknown. Counts match the backed-up copy, but actual program membership and level publication status are **unknown**, because the relevant table/column do not exist in public yet; labelMismatch is explicitly `null`, not a false claim of label consistency. [Direct local legacy inventory](2026-10-16-intermediate-local-legacy-inventory.json) is the authoritative evidence for this environment.

Ruling: use a read-only compatibility inspection to close W0 discovery for the schema actually present, rather than making an optional public-data upgrade a prerequisite. Cost if wrong: program-specific API/catalog/eligibility findings remain unverified and require a current-schema environment before that implementation slice. This does not approve W3 priors, D2–D10 or any data mutation. The whole mandate remains approved rather than verified/implemented.

Final task-completion run: the inventory summary spec, planner spec and both integration specs ran together via `task-done`: **4 files / 73 tests PASS**, exit 0 (62.39 seconds). Task 1 completion is recorded in the local execution ledger. The code remains uncommitted in the isolated worktree; the equal BASE/HEAD in that ledger records zero commits rather than implying a commit was created. W3 Tasks 2–3 remain pending reviewed diagnostic configuration; the whole plan/mandate is not complete.
