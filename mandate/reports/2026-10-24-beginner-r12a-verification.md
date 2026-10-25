# Beginner R1.2a — software verification

Date: 2026-10-25 (Asia/Saigon). Mandate: MND-20261024-003. Parent MND-20261024-001 remains captured / approval=null; R1.1 MND-20261024-002 remains verified.

## Authority and status

Human software approval: [record](2026-10-24-beginner-r12a-human-approval.md), proposal 1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49. Worktree C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo, branch codex/foundation-basic-readiness. Original baseline 5963dbf7ed5b448b77c8a8b3b48f476a90694caf.

Status: NOT SOFTWARE_READY — one confirmed P1 requires a source file outside the approved allowlist. Authorized software checks are documented below; full R1.2a acceptance remains BLOCKED. Mandate stays implementing. No DB connection/provisioning/migration/seed/import/publication, actual approved release, provider call, learner write/access, merge/push/deploy or next increment occurred.

Frozen artifacts rechecked unchanged:

- [Execution plan](../../docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md): 60ff2caff21f5d5352cf84c89fbbc6ddca27e1644bff452007f7875cd2a031e6.
- [Scope review](2026-10-24-beginner-r12a-preapproval-review.md): ab66a7196bf5e9488265f786238202f7c5ccab46d0301cfaa305f95936679336.
- [Exact scope lock](2026-10-24-beginner-r12a-scope.json): allowlist fingerprint 5c976d313378bd6fb5cb1831cf03ec0af9ed24cbfdafc842fb08d826a5538259; original source-baseline fingerprint ec1bea8b364bb983af76cf595b35a2ab347bc713571ba9fe59eebecf04c1dd13 verified before implementation.
- [Parent plan](../../docs/superpowers/plans/2026-10-24-beginner-implementation.md): 165fc3e8cbcf7ce1b2245974fa7cb40cc0c75b10cb31cf87fe2557f6a922c96b.

Initial five dirty preapproval/governance files were inspected and preserved in the approval commit. They are not new product scope. Subsequent product changes were checked against the frozen allowlist; no additional product path was authorized.

## Implemented software

- Admin-only dedicated Beginner workspace, two Paths and static five-Stage/20-Unit/80-Lesson editorial tree. PLANNED metadata creates no database content/resource/video. Selected-node authoring is explicit.
- Foundation 1.2 raw-source editor with structured controls; invalid/unknown sections remain visible. Save, validation, safe preview, independent technical review and scoped test publication are separate operations. Preview uses the exact selected LessonVersion and never creates learner state.
- Opaque server-created authorization context, exact ancestry/exclusive ownership checks, environment/actor/action binding and default-deny shared command guards before receipt replay or writes. Runtime permission records come from a separately protected operator root, not an HTTP approval endpoint.
- Review hashes bind source/editor/revision/audio/target. Scoped transactions reuse receipts/locks; fixture audio requires actual bytes and script/file hashes. Shared Beginner audio generation is blocked before provider/job writes.
- Beginner supersession preserves valid old V1 PUBLISHED snapshots while moving the current pointer to V2. Mutable source cannot corrupt old previews: scoped publication audit freezes raw source and source/snapshot/review hashes. Intermediate/IELTS archive behavior is unchanged in mocked regression.
- Canonical shared learner projection removes Beginner answer keys, private rubric/evidence/model answers and listening transcripts/content. Admin preview disables learner submit/recording behavior; authorization is enforced independently on media access.
- Internal test-release registry verifies actual IDs, immutable lesson/curriculum snapshot hashes, receipts, technical reviews and asset bytes. Export never approves. Approval requires a distinct candidate-bound trusted human record. Synthetic mocked approval branches never produce a real release.
- Dedicated future integration/E2E harness/configuration is authored, with no fallback DB/.env, strict isolated identity/root preflight, explicit actions, network guard and no automatic DB provisioning/cleanup/server startup. These suites were not executed.

## Verification actually executed

All commands below were run from the worktree. API tests used only the dedicated mock-only config; root test/verify and legacy fallback integration harness were not run.

| Command | Result | Count |
| --- | --- | --- |
| pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts --reporter=dot | PASS | 203 tests / 30 files / 0 skipped |
| pnpm --filter @worklingo/contracts exec vitest run | PASS | 145 tests / 30 files / 0 skipped |
| pnpm --filter @worklingo/content-format exec vitest run | PASS | 147 tests / 12 files / 0 skipped |
| pnpm --filter @worklingo/web exec vitest run --maxWorkers=2 --reporter=dot | PASS | 884 tests / 146 files / 0 skipped |
| pnpm --filter @worklingo/api lint; typecheck; build (each separately) | PASS | 3 gates |
| pnpm --filter @worklingo/web lint; typecheck; build (each separately) | PASS | 3 gates |
| pnpm --filter @worklingo/contracts --filter @worklingo/content-format lint | PASS | 2 packages |
| pnpm --filter @worklingo/contracts --filter @worklingo/content-format typecheck | PASS | 2 packages |
| node .agents/skills/mandate-steward/scripts/mandate.mjs validate | PASS | 5 records |
| git diff --check; frozen hashes; current dirty-file allowlist | PASS | no unexpected product paths |
| Dedicated DB integration suites | BLOCKED / NOT RUN | 2 files; no cases counted as PASS |
| Dedicated Playwright desktop/mobile suites | BLOCKED / NOT RUN | 2 files x 2 projects; no cases counted as PASS |
| Browser/manual responsive, keyboard and real media verification | BLOCKED / NOT RUN | requires authorized isolated application/fixture environment |

Final executed tests: 1,379 PASS, 0 FAIL, 0 SKIPPED. This does not include blocked suites. New config/E2E source also passed syntax-only TypeScript transpilation; that is not an E2E run or full E2E typecheck.

The first full Web run had 9 failures: three navigation assertions and six timeouts with excess parallel workers. Navigation was corrected within the allowlist to retain generic deferred-dashboard/default sidebar semantics. Affected regression rerun passed 47/47; the full run with two workers and unchanged timeouts passed 883/883. After review repairs, the final full Web run passed884/884 (146files); the final dedicated API run passed203/203 (30files). A targeted single-test repair run deselected12 cases; those were not counted as PASS and the complete13-case file was subsequently GREEN. Post-review typecheck found optional-delete typing errors in two new test fixtures; explicit BeginnerTarget annotations corrected both before final gates. Earlier RED cases were intentional TDD failures, then corrected and rerun GREEN (environment/context boundaries, stale review/source, exact V1 source, invalid editor preservation, registry integrity/curriculum hash and transcript redaction). Existing jsdom navigation warning remains non-failing; no test is skipped to hide it.

Exact API collection (list command rechecked 30 files):

- [apps/api/src/beginner/beginner-admin.controller.spec.ts](<../../apps/api/src/beginner/beginner-admin.controller.spec.ts>)
- [apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts](<../../apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts>)
- [apps/api/src/beginner/application/beginner-authoring.service.spec.ts](<../../apps/api/src/beginner/application/beginner-authoring.service.spec.ts>)
- [apps/api/src/beginner/application/beginner-release.service.spec.ts](<../../apps/api/src/beginner/application/beginner-release.service.spec.ts>)
- [apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts](<../../apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts>)
- [apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts](<../../apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts>)
- [apps/api/src/beginner/domain/beginner-publication-policy.spec.ts](<../../apps/api/src/beginner/domain/beginner-publication-policy.spec.ts>)
- [apps/api/src/common/config/app-config.module.spec.ts](<../../apps/api/src/common/config/app-config.module.spec.ts>)
- [apps/api/src/content-authoring/application/audio-generation.service.spec.ts](<../../apps/api/src/content-authoring/application/audio-generation.service.spec.ts>)
- [apps/api/src/content-authoring/application/content-imports.service.spec.ts](<../../apps/api/src/content-authoring/application/content-imports.service.spec.ts>)
- [apps/api/src/content-authoring/application/content-publisher.service.spec.ts](<../../apps/api/src/content-authoring/application/content-publisher.service.spec.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts](<../../apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts](<../../apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts>)
- [apps/api/src/curriculum-foundation/domain/objective-evidence-policy.spec.ts](<../../apps/api/src/curriculum-foundation/domain/objective-evidence-policy.spec.ts>)
- [apps/api/src/curriculum-foundation/domain/prerequisite-graph.spec.ts](<../../apps/api/src/curriculum-foundation/domain/prerequisite-graph.spec.ts>)
- [apps/api/src/ielts-band-curriculum/application/ielts-band-admin.service.spec.ts](<../../apps/api/src/ielts-band-curriculum/application/ielts-band-admin.service.spec.ts>)
- [apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.spec.ts](<../../apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.spec.ts>)
- [apps/api/src/ielts-band-curriculum/domain/evaluate-band-progression.spec.ts](<../../apps/api/src/ielts-band-curriculum/domain/evaluate-band-progression.spec.ts>)
- [apps/api/src/learning-sessions/application/learner-audio.service.spec.ts](<../../apps/api/src/learning-sessions/application/learner-audio.service.spec.ts>)
- [apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts](<../../apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts>)
- [apps/api/src/learning-sessions/application/session-creation.service.spec.ts](<../../apps/api/src/learning-sessions/application/session-creation.service.spec.ts>)
- [apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts](<../../apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts>)
- [apps/api/src/learning-sessions/domain/context-transfer.spec.ts](<../../apps/api/src/learning-sessions/domain/context-transfer.spec.ts>)
- [apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts](<../../apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts>)
- [apps/api/src/learning-sessions/domain/session-planner.spec.ts](<../../apps/api/src/learning-sessions/domain/session-planner.spec.ts>)
- [apps/api/src/teacher-ai/application/evaluate-attempt.handler.spec.ts](<../../apps/api/src/teacher-ai/application/evaluate-attempt.handler.spec.ts>)
- [apps/api/src/teacher-ai/application/evaluation-processing.spec.ts](<../../apps/api/src/teacher-ai/application/evaluation-processing.spec.ts>)
- [apps/api/src/teacher-ai/application/evaluation.service.spec.ts](<../../apps/api/src/teacher-ai/application/evaluation.service.spec.ts>)
- [apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts](<../../apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts>)
- [apps/api/src/teacher-ai/domain/foundation-rubrics.spec.ts](<../../apps/api/src/teacher-ai/domain/foundation-rubrics.spec.ts>)

## Review and remaining limits

One fresh independent review found six P1 and one P2. Coordinator checked the implicated code; five P1 and the P2 were repaired inside the allowlist, each with observed RED then GREEN. No second review pass was substituted for verification.

| Finding | Disposition and evidence |
| --- | --- |
| P1 generic unbound import can resolve Beginner slug then publish/archive | FIXED: check resolved ownership before upsert/publication and recheck resolved Lesson. Real publisher mock-boundary regression rejects before publication writes. |
| P1 generic mission replacement can bind a Beginner Lesson | FIXED: inspect every supplied Lesson even without a scoped context, before receipt replay and again in transaction. Regression rejects cross-program binding. |
| P1 registry accepts B envelope under requested A identity | FIXED: candidate approval and approved loader require record.releaseId === requested releaseId before evidence reads or writes. Both copied-file branches tested RED→GREEN. |
| P1 emitted publication audit lacks draftRevision | FIXED: publisher freezes actual locked draftRevision. Test executes real scoped publisher with synthetic DB/storage boundaries and inspects emitted publication evidence (revision7); no prefilled publication metadata double. |
| P1 scoped createPath is always denied | FIXED: remove redundant unconditional generic denial after authenticated scoped check; scoped creation succeeds while generic Beginner denial remains covered. |
| P2 no published-to-V2 authoring transition; future integration attempts invalid edit | FIXED: published source is read-only; explicit new-draft action retains logical Lesson, strips old import, resets review/audio and calls createDraft. Component test proves no update of old import. Future integration source now creates a separate import for V2; DB execution remains BLOCKED. |
| **P1 generic lifecycle removal bypass** | **OPEN / OUTSIDE ALLOWLIST.** Existing AdminContentLifecycleService.removeImport can archive the Beginner current version and clear its pointer based on Admin role/revision alone. Independent reviewer reproduced with in-memory DB doubles; coordinator confirmed direct writer and missing Beginner guard in source. This prevents SOFTWARE_READY. |

Open P1 source: [lifecycle service](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts), remove/removeImport, and [controller](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.controller.ts). Those files were inspected only. No runtime API request or DB mutation was made.

Proposed narrow follow-up approval (NOT GRANTED, NOT IMPLEMENTED): allow modifying apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts and apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts; collect that pure unit spec in the already allowlisted dedicated config. Deny generic Beginner/1.2 withdrawal before cached receipts and writes, recheck actual bound/published Lesson ownership after locks, retain legacy Intermediate/IELTS behavior. Required tests cover delete/archive/pointer/receipt/audit non-writes and legacy acceptance using mocks only. Existing frozen mandate/scope is not edited or broadened by this report; proper hash-bound governance approval is needed before those edits.

Remaining known defect classification: P0 none identified; P1 one open as above; P2 no remaining confirmed review defect after fixes. Unknown/live acceptance is not classified as passing. Bounded review declined live concurrency/rollback/history/evaluation/publication, actual operator provenance/ACLs, exhaustive low-risk UI/video text, browser/mobile accessibility, R1.2b pedagogy and R2 admission. Dedicated DB/E2E and manual UI gates remain BLOCKED independently.

Intermediate/IELTS, Foundation formats1.0/1.1/1.2, exact historical V1 preview, session planner, evaluation and shared DTO regressions passed in the collected mock/unit/component suites. Actual historical DB persistence and complete R2 admission guarantees are not established.

No content-readiness, pedagogical approval, real 45-minute rehearsal, CEFR attainment, actual fixture publication or learner-admission claim is made. Complete R2 start/admission and R4 supplementary rollout remain outside this increment; mocked legacy start/resume/evaluation checks do not replace future DB acceptance.

## Commits and changed files

- 29777da — bounded human approval and captured preapproval artifacts.
- 5fec919 — contracts, editorial map, scoped policy/environment gates.
- 0b09975 — scoped authoring, review and supersession.
- b6f479b — editor/workspace, exact-version safe preview and media authorization.
- 0646bec — resolved ownership guards, scoped createPath and actual publication evidence regression fixes.
- 959573d — immutable fixture-only registry and future gated integration/E2E harness source.
- fd09292 — published-to-V2 editor transition, historical/safe DTO regression and navigation compatibility.
- This report is committed separately after the source candidate; its commit is the final docs commit in the branch log.

74 changed/captured files including this report. Exact inventory (paths relative to repository):

### contracts

- [packages/contracts/src/beginner-authoring.contracts.spec.ts](<../../packages/contracts/src/beginner-authoring.contracts.spec.ts>)
- [packages/contracts/src/beginner-authoring.contracts.ts](<../../packages/contracts/src/beginner-authoring.contracts.ts>)
- [packages/contracts/src/beginner-editorial-plan.spec.ts](<../../packages/contracts/src/beginner-editorial-plan.spec.ts>)
- [packages/contracts/src/beginner-editorial-plan.ts](<../../packages/contracts/src/beginner-editorial-plan.ts>)
- [packages/contracts/src/index.ts](<../../packages/contracts/src/index.ts>)

### policy

- [apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts](<../../apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts>)
- [apps/api/src/beginner/domain/beginner-authoring-policy.ts](<../../apps/api/src/beginner/domain/beginner-authoring-policy.ts>)
- [apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts](<../../apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts>)
- [apps/api/src/beginner/domain/beginner-environment-preflight.ts](<../../apps/api/src/beginner/domain/beginner-environment-preflight.ts>)
- [apps/api/src/beginner/domain/beginner-publication-policy.spec.ts](<../../apps/api/src/beginner/domain/beginner-publication-policy.spec.ts>)
- [apps/api/src/beginner/domain/beginner-publication-policy.ts](<../../apps/api/src/beginner/domain/beginner-publication-policy.ts>)

### authoring

- [apps/api/src/app.module.ts](<../../apps/api/src/app.module.ts>)
- [apps/api/src/beginner/application/beginner-authoring.service.spec.ts](<../../apps/api/src/beginner/application/beginner-authoring.service.spec.ts>)
- [apps/api/src/beginner/application/beginner-authoring.service.ts](<../../apps/api/src/beginner/application/beginner-authoring.service.ts>)
- [apps/api/src/beginner/beginner-admin.controller.spec.ts](<../../apps/api/src/beginner/beginner-admin.controller.spec.ts>)
- [apps/api/src/beginner/beginner-admin.controller.ts](<../../apps/api/src/beginner/beginner-admin.controller.ts>)
- [apps/api/src/beginner/beginner.module.ts](<../../apps/api/src/beginner/beginner.module.ts>)
- [apps/api/src/beginner/dto/beginner-authoring.dto.ts](<../../apps/api/src/beginner/dto/beginner-authoring.dto.ts>)
- [apps/api/src/content-authoring/application/audio-generation.service.spec.ts](<../../apps/api/src/content-authoring/application/audio-generation.service.spec.ts>)
- [apps/api/src/content-authoring/application/audio-generation.service.ts](<../../apps/api/src/content-authoring/application/audio-generation.service.ts>)
- [apps/api/src/content-authoring/application/content-imports.service.spec.ts](<../../apps/api/src/content-authoring/application/content-imports.service.spec.ts>)
- [apps/api/src/content-authoring/application/content-imports.service.ts](<../../apps/api/src/content-authoring/application/content-imports.service.ts>)
- [apps/api/src/content-authoring/application/content-publisher.service.spec.ts](<../../apps/api/src/content-authoring/application/content-publisher.service.spec.ts>)
- [apps/api/src/content-authoring/application/content-publisher.service.ts](<../../apps/api/src/content-authoring/application/content-publisher.service.ts>)

### curriculum

- [apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts](<../../apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts>)
- [apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts](<../../apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts](<../../apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts](<../../apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts](<../../apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts>)
- [apps/api/src/curriculum-foundation/application/foundation-validation.ts](<../../apps/api/src/curriculum-foundation/application/foundation-validation.ts>)
- [apps/web/src/features/admin-curriculum/foundation-definition-editor.test.tsx](<../../apps/web/src/features/admin-curriculum/foundation-definition-editor.test.tsx>)
- [apps/web/src/features/admin-curriculum/foundation-definition-editor.tsx](<../../apps/web/src/features/admin-curriculum/foundation-definition-editor.tsx>)

### preview

- [apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts](<../../apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts>)
- [apps/api/src/learning-sessions/application/learning-sessions.service.ts](<../../apps/api/src/learning-sessions/application/learning-sessions.service.ts>)
- [apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts](<../../apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts>)
- [apps/api/src/learning-sessions/domain/learner-activity-projection.ts](<../../apps/api/src/learning-sessions/domain/learner-activity-projection.ts>)
- [apps/web/src/features/learning-session/activity-renderer.test.tsx](<../../apps/web/src/features/learning-session/activity-renderer.test.tsx>)
- [apps/web/src/features/learning-session/activity-renderer.tsx](<../../apps/web/src/features/learning-session/activity-renderer.tsx>)

### web

- [apps/web/src/app/(admin)/admin/programs/beginner/page.tsx](<../../apps/web/src/app/(admin)/admin/programs/beginner/page.tsx>)
- [apps/web/src/features/admin-beginner/beginner-learner-preview.test.tsx](<../../apps/web/src/features/admin-beginner/beginner-learner-preview.test.tsx>)
- [apps/web/src/features/admin-beginner/beginner-learner-preview.tsx](<../../apps/web/src/features/admin-beginner/beginner-learner-preview.tsx>)
- [apps/web/src/features/admin-beginner/beginner-lesson-editor.test.tsx](<../../apps/web/src/features/admin-beginner/beginner-lesson-editor.test.tsx>)
- [apps/web/src/features/admin-beginner/beginner-lesson-editor.tsx](<../../apps/web/src/features/admin-beginner/beginner-lesson-editor.tsx>)
- [apps/web/src/features/admin-beginner/beginner-workspace.test.tsx](<../../apps/web/src/features/admin-beginner/beginner-workspace.test.tsx>)
- [apps/web/src/features/admin-beginner/beginner-workspace.tsx](<../../apps/web/src/features/admin-beginner/beginner-workspace.tsx>)
- [apps/web/src/features/admin-beginner/beginner.css](<../../apps/web/src/features/admin-beginner/beginner.css>)
- [apps/web/src/features/admin-dashboard/admin-navigation-config.ts](<../../apps/web/src/features/admin-dashboard/admin-navigation-config.ts>)
- [apps/web/src/features/admin-dashboard/admin-navigation-inventory.test.tsx](<../../apps/web/src/features/admin-dashboard/admin-navigation-inventory.test.tsx>)
- [apps/web/src/features/admin-dashboard/admin-navigation-model.ts](<../../apps/web/src/features/admin-dashboard/admin-navigation-model.ts>)
- [apps/web/src/features/admin-dashboard/admin-sidebar.test.tsx](<../../apps/web/src/features/admin-dashboard/admin-sidebar.test.tsx>)
- [apps/web/src/features/admin-dashboard/admin-sidebar.tsx](<../../apps/web/src/features/admin-dashboard/admin-sidebar.tsx>)
- [apps/web/src/i18n/messages/adminBeginner.ts](<../../apps/web/src/i18n/messages/adminBeginner.ts>)
- [apps/web/src/lib/api/beginner-admin-client.test.ts](<../../apps/web/src/lib/api/beginner-admin-client.test.ts>)
- [apps/web/src/lib/api/beginner-admin-client.ts](<../../apps/web/src/lib/api/beginner-admin-client.ts>)

### registry

- [apps/api/src/beginner/application/beginner-release.service.spec.ts](<../../apps/api/src/beginner/application/beginner-release.service.spec.ts>)
- [apps/api/src/beginner/application/beginner-release.service.ts](<../../apps/api/src/beginner/application/beginner-release.service.ts>)

### harness

- [apps/api/src/common/config/app-config.module.spec.ts](<../../apps/api/src/common/config/app-config.module.spec.ts>)
- [apps/api/src/common/config/app-config.module.ts](<../../apps/api/src/common/config/app-config.module.ts>)
- [apps/api/test/fixtures/beginner/authoring/fixture-factory.ts](<../../apps/api/test/fixtures/beginner/authoring/fixture-factory.ts>)
- [apps/api/test/integration/beginner-authoring.integration.spec.ts](<../../apps/api/test/integration/beginner-authoring.integration.spec.ts>)
- [apps/api/test/integration/beginner-release-registry.integration.spec.ts](<../../apps/api/test/integration/beginner-release-registry.integration.spec.ts>)
- [apps/api/test/integration/beginner-test-harness.ts](<../../apps/api/test/integration/beginner-test-harness.ts>)
- [apps/api/vitest.beginner.config.ts](<../../apps/api/vitest.beginner.config.ts>)
- [apps/api/vitest.beginner.integration.config.ts](<../../apps/api/vitest.beginner.integration.config.ts>)

### e2e

- [apps/web/e2e/beginner-admin-history.spec.ts](<../../apps/web/e2e/beginner-admin-history.spec.ts>)
- [apps/web/e2e/beginner-admin.spec.ts](<../../apps/web/e2e/beginner-admin.spec.ts>)
- [apps/web/playwright.beginner-admin.config.ts](<../../apps/web/playwright.beginner-admin.config.ts>)

### governance

- [mandate/reports/2026-10-24-beginner-r12a-human-approval.md](<../../mandate/reports/2026-10-24-beginner-r12a-human-approval.md>)
- [mandate/reports/2026-10-24-beginner-r12a-verification.md](<../../mandate/reports/2026-10-24-beginner-r12a-verification.md>)

### Previously captured preapproval/governance artifacts

- [docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md](<../../docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md>)
- [mandate/INDEX.md](<../../mandate/INDEX.md>)
- [mandate/items/MND-20261024-003-feature-implement-isolated-beginner-r1-2a-admin-authoring-and-test-release-reg.md](<../../mandate/items/MND-20261024-003-feature-implement-isolated-beginner-r1-2a-admin-authoring-and-test-release-reg.md>)
- [mandate/reports/2026-10-24-beginner-r12a-preapproval-review.md](<../../mandate/reports/2026-10-24-beginner-r12a-preapproval-review.md>)
- [mandate/reports/2026-10-24-beginner-r12a-scope.json](<../../mandate/reports/2026-10-24-beginner-r12a-scope.json>)

## Full acceptance and rollback

Before authorized DB/E2E execution, require a separate explicit owner approval binding actual database/server/role identity, environment/run ID, isolated storage/registry and OS-protected approval roots, permitted read/write/publication/audio actions, admin fixture identities, preflight and exact cleanup policy. Provisioning/fixture import/test publication are not granted by this software approval. Run the dedicated integration/E2E suites and inspect actual IDs/hashes/receipts and learner-table before/after evidence. Candidate APPROVED_RELEASE additionally requires a distinct human approval of the actual candidate hash. Until then keep implementing, do not mark verified.

Software rollback before any data: revert the feature commits in reverse dependency order, preserving R1.1 and existing user work; this is a documented option, not an action performed. After any later authorized fixture publication, disable scoped mutations first and retain valid historical version readers, registry/audio/receipts until run-only cleanup is proven safe. Never erase referenced versions or regrade/alter learner state. No migration or data rollback was needed/performed. Commits are independently tested source slices, not a full increment acceptance or permission to activate them. Preserve the isolated worktree and plan ledger while the open P1 and DB gates remain unresolved.

R1.2b and R2 require separate scope and human approval. Neither begins automatically.

## Skill audit

Used: using-superpowers and codex-quota-optimizer for routing/bounded reads; mandate-steward for exact approval/lifecycle and register validation; executing-plans and test-driven-development for inline task ledger/RED→GREEN; using-git-worktrees and git-workflow-and-versioning for isolation and explicit atomic staging; nestjs-expert for service/guard boundaries; ui-ux-pro-max and vercel-react-best-practices for the existing Admin UI/component patterns; systematic-debugging and receiving-code-review for failure/root-cause disposition; requesting-code-review and code-review-and-quality for one independent bounded final review; verification-before-completion for observed gates.

Not used: subagent-driven-development/parallel implementers (inline execution chosen); brainstorming/writing-plans (existing human-approved design/plan reused, no new feature design); finishing-a-development-branch integration menu (full acceptance remains blocked; human explicitly prohibits merge/push/deploy); live browser/database/provider workflows (not authorized).
