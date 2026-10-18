# W3 advisory workload visibility

Status: **advisory W3 technical implementation verified in the managed worktree**; no runtime timing priors, integration/release or whole-mandate completion claim.

Date: 2026-10-16, Asia/Saigon. Revision: efa2fd99b5373a644a011af3787bf81f737a51a7, with uncommitted W3 changes in the attached managed worktree. The original main checkout has no W3 application code edits.

## Scope and behavior

The direct human “ok,tiếp” continues the existing W0/W3 plan after W0, as recorded in [approval boundaries](2026-10-16-intermediate-approval.md#w3-continuation-authorization). Tasks 2–3 add pure diagnostic arithmetic and optional Admin-only workload details. Existing learner plans, duration availability, publication rules and persisted records are not changed. No migration, provider call, public seed, content publication, commit/push/merge or pilot occurs in this slice.

Each published lesson summary shows separate activity, MCQ, open-task, context and whitespace-word counts. All five duration entries execute the real canonical planner and distinguish structural availability from estimated sufficiency. Malformed snapshots return a safe diagnostic and unknown counts. No answer keys, rubrics, source scripts or learner records are projected.

There are **no reviewed runtime timing priors**. Admin therefore shows timing as unknown and explains that a reviewed configuration is needed. Pure functions accept explicit versioned configuration, and tests use synthetic numbers to check arithmetic only. This is a builder choice stated in chat, not a human approval of those synthetic rates or evidence of calibration. Missing audio stays unknown, even with a configuration; bytes/fake-tts availability never become an inferred duration.

Reception is charged once per `(context, reading|listening)` within each block, and again when a later block uses that context. Comprehension adds question processing; writing/speaking add open-task production; feedback, reflection and transition are separate explicit configuration terms. Writing receives its referenced contexts as reading; shadowing requires listening. These diagnostic assumptions require review before enabling estimates. They do not infer cognition, CEFR or actual learner active time.

Pure readiness retains known shortfall/excess warnings with safe block/activity pointers; any missing required timing takes precedence over an overall sufficiency claim. Warnings are not called by the learner planner, publication commands or scoring flows. D3/D8 enforcement, calibration and all content/audio/pilot decisions remain separate.

## Verification record

- RED: profiler module absent; query lacked optional workload; old contract stripped the new projection; UI panel absent.
- Pure profiler/planner: 52/52 PASS before final review. Readiness: 6/6 PASS. Query unit: 2/2 PASS. Contracts: 87/87 PASS.
- Read-only-projection HTTP integration: 2/2 PASS, including learner 403 and no answer/rubric leakage.
- Initial browser: 4/4 PASS on desktop/mobile, including keyboard disclosure, curriculum mutations and no viewport overflow. Visual inspection then found narrow mobile table headings difficult to read; this is an open fix-pass finding, not a final UI acceptance claim.
- Inverting unknown-timing precedence caused 2 readiness regressions to fail; original bytes restored.
- One fresh reviewer found four Important items and no Critical items: mobile readability, inconsistent malformed-source validation, missing repair locations, missing skill/provenance details. All four entered one fix pass.
- RED→GREEN: whitespace text now rejects instead of estimating zero; duplicate/ambiguous content uses one shared workload-only validation boundary; malformed references carry allowlisted path/activity/context pointers; skill counts and audio metadata are projected without extra source fields. Focused API regression run: **26/26 PASS**; UI panel/workspace: **9/9 PASS**; contracts: **87/87 PASS**.
- Mobile geometry regressions first failed: warning width 70.2px and caption width 15.0px, both below the 176.8px readable-width threshold in that fixture. Stacked narrow-screen rows and a full-width caption fixed both. Final browser **4/4 PASS**; English and Vietnamese screenshots were visually inspected. Native table roles/header relationships and keyboard disclosure are retained.
- Full workspace typecheck and lint: **PASS**. API and web production builds: **PASS**. i18n: 27 namespaces / 1670 paired keys, **0 errors**. `git diff --check` and mandate validation: **PASS**.
- The first broad run had API818 PASS, but the web run caught two new review regression assertions while the fix pass was in progress (`shows_counts_unknowns_and_all_durations_without_action_buttons`, `localizes_unknowns_and_displays_per_block_deficits`). Their final focused run is green above; the stable final whole-suite run is still pending below. Do not treat the pre-fix broad run as final acceptance.

Final stable whole-workspace run, via `task-done ... 3 ... -- pnpm test`: **exit 0, 267 files / 1,324 tests PASS**: content-format47, contracts87, API821, web369. Task 3 is recorded complete in the execution ledger. All Task 2/3 technical checks now pass; no re-review or additional test repetition is needed. Known integration-test fault-injection logs are expected negative-path evidence, not failing tests. The API includes the updated Admin HTTP projection/403 coverage and unchanged learner regression journeys.

Post-test read-only metadata inspection still reports public37 tables,16 applied/15 pending migrations and no LearningProgram table. No public upgrade or new program/enrollment mutation occurred. Worktree source, untracked files and ignored workflow evidence remain preserved; the generated Next type-reference file returned to its original content after the normal build.

## Review rulings and remaining limits

The independent reviewer did not perform the following assessments. These are explicit execution rulings, not dropped findings:

1. Pedagogical accuracy, CEFR, calibrated rates/budgets/replay factors and actual learner time require qualified review/pilot evidence. Runtime timing remains unknown and estimates stay `calibrated:false`. Cost: no validated learning-time or proficiency claim.
2. Audio voice quality/provider suitability/measured duration require separate content/audio review. Adapter/status metadata is provenance only; duration remains null. Cost: no audio release-quality claim.
3. Cognitive distribution has no declared metadata in the current schema, so it is not inferred or displayed. Cost: that diagnostic remains unknown until an approved additive metadata design exists.
4. Learner enforcement, publish blocking, assessment secrecy/mastery, planner v2 and telemetry remain outside W3. The new diagnostic functions are not used by those policy paths. Cost: those mandate packages remain unimplemented.
5. Public-schema compatibility, live catalog eligibility and upgrade safety are not established by disposable-fixture tests. Public stays on its existing legacy schema; the optional maintenance proposal stays separate. Cost: the original running app needs a separately authorized current-schema/integration action before using W3 there.
6. W0 and register governance were excluded from this fresh W3 review because W0 was reviewed earlier. The parent validates the register separately and retains the direct human authorization notes. Cost: no claim that this reviewer re-audited historical W0/governance.
7. Production-scale latency/memory was not benchmarked. Five canonical planner calls per lesson add Admin-only computation without provider calls or new learner-path work. Cost: no production performance claim; representative-scale review remains a future deployment gate.
8. Screen-reader operation/full accessibility conformance was not manually certified. Semantic roles, keyboard disclosure, readable geometry and both locale screenshots were tested. Cost: no complete accessibility-conformance claim.
9. Final suite/build/typecheck/lint evidence is the parent's responsibility. Actual commands now pass as recorded above; Task 3 completion followed that exit. Cost if this evidence is stale for a later change: rerun its affected verification before making a new completion claim.
10. Commit/merge/release/pilot readiness is not authorized or established. The attached worktree and its uncommitted files are preserved. Cost: this is a reviewable implementation, not a change to the original running app or a released feature.

No Minor findings were separately deferred. The W0 roadmap wording minor was resolved in the earlier continuation. The standard commit-range review-package script rejected BASE=HEAD; the explicit W3 working-tree package lists every tracked and untracked source file so the reviewer reviewed actual code rather than an empty diff.

## Operational limits

The configured public database is still the legacy schema described in [W0](2026-10-16-intermediate-baseline.md). It has not been upgraded. API/browser integration uses generated disposable schemas, fake providers and separate test data directories. These tests do not establish that the original checkout's running application has the new feature. W3 lives in the attached worktree until integration is separately chosen.
