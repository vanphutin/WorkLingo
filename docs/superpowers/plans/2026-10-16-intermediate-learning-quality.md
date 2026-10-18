# Intermediate Learning Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver evidence-backed Intermediate learning quality improvements through separately approved, testable slices while preserving existing learners and versions.

**Architecture:** Extend the existing NestJS modular monolith and Admin workspaces. Derive workload without writes first; introduce assessment and planner policy versions only for approved new sessions. This is the dependency/handoff plan, not an independent sprint backlog.

**Tech Stack:** TypeScript, NestJS, Next.js/React, Zod, Prisma/PostgreSQL, Vitest/RTL, Playwright, Node 20 and pnpm 10.34.1.

**Spec:** `docs/superpowers/specs/2026-10-16-intermediate-learning-quality-design.md` (human-reviewed; bounded W0 execution).

## Global Constraints

- Package reviewed on 2026-10-16; W0 local read-only inventory/disposable-fixture verification authorized. Downstream product/data/provider/release gates remain effective.
- Preserve published/archived LessonVersion, rubric, admission and historical mastery evidence.
- Preserve IN_PROGRESS/PAUSED session snapshots and their original version bindings.
- Preserve enrollment, activeProgramId and currentLevelCode semantics; no implicit learner reassignment.
- Keep supported durations 45/60/90/120/150, targetMinutes=15, canonical ordering, four-skill coverage, unique activity IDs and final Respond.
- Preserve Format 1.0/1.1 parsing and legacy plan parsing/resume.
- No filler, repeated IDs, runtime AI question generation or forced waiting to fill a time label.
- No new provider calls, schema migration or telemetry ingestion endpoint without scoped approval.

## Review Focus

1. Same-topic different-fact contexts: allow pedagogical repetition but detect answer leakage, including Reading opened before Listening (integrity plan Task 1; Task 5 tests).
2. Thin legacy content and unknown audio timing: show structural readiness separately from estimated/unknown workload (baseline plan Tasks 1–3).
3. Accessible playback/media failure: preserve a supported path without pretending it measures listening without text (integrity plan Task 2).
4. Concurrent retries and delayed AI evaluation: one first attempt, stable support evidence, pending is not mastered (integrity plan Task 3; Task 7 here).
5. Old sessions and non-pilot programs after flag changes: resume original policy/version and avoid cross-program selection (integrity plan Task 1; Task 6 here).

## Authority, source and dependencies

Read the spec, `mandate/items/MND-20261015-001-architecture-redesign-intermediate-learning-session-workload-and-cross-skill-separa.md`, roadmap Increment 5 and `mandate/reports/2026-10-16-intermediate-approval.md` before execution. The first approval accepts W0 execution boundaries; the second accepts D1's additive B1 direction as D-036. D2–D10 remain open. Codex coordinates W0; sprint remains unassigned. Use the mandate CLI for scope updates/approval; do not infer permission from another historical audit.

W0 → W1 → W4 → W5 → W7 → W8. W0 also precedes W2 and W3; W2/W4 precede W6; W5/W6 precede W7. Each package may be accepted or rejected independently. No dates/capacity or hard lesson-time SLA are promised.

Two bounded plans carry concrete first-slice interfaces/tests:

- [Baseline and read-only workload/Admin warnings](2026-10-16-intermediate-baseline-workload.md): W0 and W3; source P0-01/05/06/07.
- [Assessment integrity](2026-10-16-intermediate-assessment-integrity.md): W2; source P0-03/04; gated by mode/audio/evidence decisions.

W2 continuation (2026-10-16): the human directly approved the [concrete policy](../specs/2026-10-16-intermediate-assessment-policy-design.md), isolated implementation and disposable test-schema migration. The same assessment plan is implemented with one fresh final engineering review and one fix pass; [execution evidence](../../../mandate/reports/2026-10-16-intermediate-assessment-integrity.md) records verification and limits. Public/preview upgrades, live selection, content/media activation, integration and mastery weighting remain separate gates. No new sprint board or whole-mandate completion is created.

Tasks 4–9 below are phase briefs. Before executing one, resolve its decisions and write/review its subsystem spec and detailed plan; these briefs must not be treated as complete coding instructions.

### Task 1: Authorize and record the first execution slice

**Files:** mandate item above (CLI only); `mandate/reports/` decision/evidence note; canonical `docs/IMPLEMENTATION_ROADMAP.md` Increment 5.
**Interfaces:** consumes direct named human authorization; produces proposal-hash-bound approval and exact allowed checks/data scope. No application interface changes.

- [x] Read current Git status/revision, mandate/history and linked docs; preserve unrelated changes.
- [x] Ask the human to review this draft, select the slice and name its owner. Record only decisions actually made, with reference/date/actor and rollback scope. W0 accepted; Codex coordinates it.
- [x] Resolve any decision necessary for that slice. Keep the remaining packages captured/blocked in the proposal narrative. W0 is read-only/disposable only; public migrations remain separate.
- [x] Use CLI `update`/`transition` in legal lifecycle order; validate the register. A change to evidence/scope invalidates approval by design.
- [x] Prepare an isolated execution checkout using the Git/worktree skill when implementation is authorized. Commit explicit completed changes only under that authorization. Native worktree prepared; no commit/push authorized or made.

### Task 2: Establish W0 baseline and policy decisions

**Files:** baseline plan Task 1 paths; `docs/DECISIONS.md` only for decisions actually accepted; `docs/CURRICULUM.md` only after duration checks.
**Interfaces:** consumes published snapshots and approved read-only scope; produces redacted counts/readiness and D1–D10 decision evidence.

- [x] Execute baseline plan Task 1; report actual fixture revision and distinguish current authored content from imported reports. Examined-local legacy schema/fixture discovery only; current-schema catalog/API eligibility remains unknown.
- [ ] Resolve D1 (program mapping), D2 (reviewer), D3 (budget/UX) as relevant. Do not change seed/labels/enrollment as part of inventory.

Current progress (2026-10-16): D1 accepted as D-036; D2/D3 remain open. W0 discovery is complete for examined-local legacy public and fixtures; fixture/planner checks pass (46/46), integration checks pass (27/27). A bounded read-only compatibility inspection supplies the actual public baseline with unknown program membership. Public remains 15 migrations behind; a verified backup/migrated-copy rehearsal is complete, while any public upgrade is an optional separate approval. See `mandate/reports/2026-10-16-intermediate-baseline.md` and `2026-10-16-intermediate-local-upgrade-review.md`.
- [ ] Resolve D4–D7 before assessment work. Scope D-023/D-024 exceptions to approved policy versions.
- [ ] Resolve D8/D9 before enforcement or product changes. Preserve D10 as a pilot gate.

### Task 3: Deliver independently reviewed W2 and W3 slices

**Files:** exact files in linked subsystem plans.
**Interfaces:** W3 produces `LessonWorkloadProfile`/`DurationReadiness` for later W5; W2 produces versioned server-derived attempt evidence for later W6.

- [ ] Execute only the approved subsystem plan, task by task with red/green tests and scoped commits.
- [ ] Review DTO/security/privacy and legacy compatibility before any policy flag can select new behavior.
- [ ] Record passing focused checks and limitations; do not mark human calibration or pilot approved.

W3 continuation on 2026-10-16: the human “ok,tiếp” authorizes advisory Tasks 2–3 in the baseline/workload plan. No runtime timing defaults are shipped; Admin shows real counts and unknown estimates pending configuration review. Advisory W3 implementation and its independent review/fix pass are technically verified: whole-workspace1,324 PASS, browser4 PASS, typecheck/lint and API/web builds PASS. See `mandate/reports/2026-10-16-intermediate-workload-visibility.md`. W2 and all calibration/enforcement/data/provider/content/integration/release/pilot gates remain open; this does not complete the master plan or mandate.

### Task 4: W1/W4 — Product mapping, B1 content and authoring

**Source:** P0-02, P1-01, P1-02. **Gate:** D1/D2, W0; content publication separately authorized.

W1/W4 continuation (2026-10-16): [subsystem design](../specs/2026-10-16-intermediate-b1-content-authoring-design.md), [two readable B1 candidates](../../content-drafts/2026-10-16-intermediate-b1-pilot.md) and [AI review](../../../mandate/reports/2026-10-16-intermediate-b1-content-review.md) are prepared. The bounded grouped-authoring Format 1.2 slice is technically verified in the existing worktree:1,378 tests/271 files PASS, typecheck/lint/build/i18n PASS, one independent review with3 Important fixes verified RED→GREEN and1 Minor deferred. See [execution evidence](../../../mandate/reports/2026-10-16-intermediate-grouped-authoring.md) and [completed bounded plan](2026-10-16-intermediate-grouped-authoring.md). Local preview uses an isolated schema per direct user request. CEFR remains provisional; Speaking transfer remains unsupported. No content publication, catalogue/admission change, independent assessment, integration or whole Task 4 completion is recorded.

**File map:** `apps/api/src/learning-programs/domain/program-catalog.ts`; `apps/api/src/curriculum/domain/curriculum.types.ts`; `packages/content-format/src/{ast,parser,normalizer,validator}.ts` and matching existing specs; `packages/test-fixtures/src/foundation-authoring.fixture.ts`; versioned authoring/publish services located during W0.
**Interfaces:** proposed optional item metadata and Format 1.2 AST; retain v1/1.1 → current normalized snapshot. Freeze exact names/types in the subsystem design before implementation.

- [ ] Produce accepted mapping/transition design, curriculum objective/prerequisite map and a named review rubric; no learner reassignment by default.
- [ ] Decide if multi-question authoring is necessary for the reviewed content. If yes, specify `[QUESTION]` grammar, source ranges, stable item IDs, metadata ownership and parser error semantics.
- [ ] Plan failing parser/normalizer tests for multiple questions, bad answer references, unknown metadata and unchanged 1.0/1.1 results; run red before code.
- [ ] Add only additive format/snapshot changes needed by 1–2 B1 lessons; preserve published versions. Commands: `pnpm --filter @worklingo/content-format test`, `pnpm --filter @worklingo/contracts test` and content import/publish integration suites in an isolated DB.
- [ ] Obtain expert CEFR/audio/transfer review before publishing a new version; report provider costs and authoring capacity rather than promising an automatic content bank.

### Task 5: W4 — Item quality and cross-skill integrity

**Source:** P1-03/P1-05. **Gate:** W4 metadata design and D8.
**File map:** `packages/content-format/src/validator.ts`/`validator.spec.ts`; new pure `packages/content-format/src/quality-linter.ts`/`quality-linter.spec.ts`; Admin `validation-panel.tsx`; content issue contracts.
**Interfaces:** proposed `lintLessonQuality(snapshot, policy): readonly QualityIssue[]`; define policy, source pointers and severity contract in the subsystem design.

- [ ] Specify rule IDs F04–F10 and report provenance. Keep heuristics advisory; exact duplicates versus semantic leakage are different tests.
- [ ] Plan/run failing tests: same topic with distinct answers is allowed; paraphrased answer leakage warns; trivial distractors/objective mismatch/cognitive imbalance point to an item; unavailable metadata is unknown, not a fabricated score.
- [ ] Implement deterministic warnings first; no runtime paid semantic provider. Run content-format tests plus Admin RTL and publish integration regressions.
- [ ] Review false positives with the content reviewer; escalate warning→error only for the explicitly accepted rule/policy version. Preserve legacy authoring and Admin error locations.

### Task 6: W5 — Workload-aware planner v2 and shadow comparison

**Source:** P1-04. **Gate:** W3 profiles, W4 reviewed content, D1/D3/D9.
**File map:** new `apps/api/src/learning-sessions/domain/workload-session-planner.ts`/`.spec.ts`; existing `session-planner.ts`, `session-plan.types.ts`, `session-creation.service.ts`/`.spec.ts`; `packages/contracts/src/learning-session.contracts.ts` and new focused spec.
**Interfaces:** proposed `planWorkloadAwareSession(input): WorkloadPlanResult` consumes W3 profiles/config and existing review references; success returns a schema-validated plan, failure returns per-block deficits. Define item identity and additive plan fields in this subsystem's spec.

- [ ] Fix deterministic ordering/scoring, prerequisite/objective constraints and shortage semantics; keep v1 baseline behavior. Do not remove `splice` without an alternative specification.
- [ ] Plan failing table/property tests for every supported duration, review skill alignment, no duplicate IDs/items, missing contexts, overloaded blocks, stable tie-breaks and input immutability.
- [ ] Include flag/version tests: v1 snapshots parse unchanged; old sessions resume after flag flips; new pilot eligibility is server-side; non-pilot programs retain existing behavior.
- [ ] Implement a pure planner with optional `planVersion`, estimate/budget/rationale fields, and `itemRefs` only if the identity contract was accepted. Never silently upgrade a saved plan.
- [ ] Run planner/contracts, session creation and isolated program-context/session integration tests. Shadow only until content coverage and human gates pass; flag rollback affects future creation only.

### Task 7: W6 — Evidence, mastery and checkpoint policy

**Source:** P1-06. **Gate:** W2 evidence, D5/D7 and reviewed rubric.
**File map:** `apps/api/src/mastery/domain/mastery-calculator.ts`/`.spec.ts`; `apps/api/src/progression/domain/checkpoint-policy.ts`/`.spec.ts`; learning-session and Teacher AI completion projection; existing mastery/progression integration specs.
**Interfaces:** consumes versioned W2 attempt evidence; proposed policy versions separate completion, independent correctness, assisted learning and stable mastery. Exact weighting is a human decision.

- [ ] Specify policy version, pending/failed AI semantics, first-attempt weighting and context/spacing requirements; reject any attempt to impose source sample thresholds without review.
- [ ] Plan/run failing tests: queued/failed evaluation cannot be scored as mastery; assisted success is distinguished; concurrent/replayed evidence is applied once; legacy unknown support is not labeled independent; accessibility is not penalized.
- [ ] Implement additive evidence consumption without historical backfill or resetting existing mastery. Run mastery/checkpoint unit tests and isolated mastery/progression/placement-isolation integration suites.
- [ ] Review policy with assessment owner and bind it to new eligible sessions; leave prior histories under their recorded semantics.

### Task 8: W6/W7 — Telemetry, audio and controlled pilot

**Source:** P1-07/08/09. **Gate:** D6/D7/D10; W4/W5/W6; named content/operations approvals.
**File map:** existing `apps/api/src/admin-analytics/` boundary; `apps/api/src/learning-sessions/application/learner-audio.service.ts`; `apps/web/src/features/audio/lesson-audio-player.tsx`; `docs/RELEASE_CHECKLIST.md`, `docs/PILOT_RUNBOOK.md`; provider adapter located in the audio subsystem design.
**Interfaces:** proposed closed aggregate timing/support event vocabulary; no generic ingestion endpoint. Media metadata includes duration, provenance, speaker/accent/WPM where measured; missing facts stay unknown.

- [ ] Design trusted active-time measurement, background/pause handling, bounded retention, replay/hint events and idempotency. Decide JSON versus schema changes before code; do not log learner answers/audio.
- [ ] Plan failing tests for long background time, duplicate events, missing end events, offline resume, unsupported audio metadata and mode-specific browser TTS. Verify privacy-safe aggregates and playback fallback.
- [ ] Obtain approved provider/voice/cost scope and real-audio QA if required; fake stays available for deterministic tests, never as proof of comprehension-quality audio.
- [ ] Write a controlled comparison protocol separating content and planner effects, justified sample size, baseline and stop/rollback rules. Include independent accuracy, inference, transfer, 1/7/14-day retention, assisted dependency, abandonment/satisfaction and timing diagnostics.
- [ ] Run focused subsystem checks, then repository `pnpm verify` and qualification gates for rollout. Technical success is not a content, calibration or pilot approval.
- [ ] Record named human pilot decision in the existing release artifacts. Roll back future selection on regression; preserve all version-bound sessions and evidence.

### Task 9: W8 — Evidence-led extensions

**Source:** P2-01/02/03/04/05. **Gate:** analyzed pilot and new scoped approval/design.
**File map:** existing review/mastery/planner boundaries; proposed item exposure persistence only with a reviewed schema need; canonical curriculum/roadmap/debt docs.

- [ ] Use pilot findings to choose explainable weak→scaffold and strong→inference/transfer branches; preserve due review and new-context retries.
- [ ] Establish sample sufficiency before item p-value/discrimination/IRT or exposure models; do not build tables because the report mentioned them.
- [ ] Version/calibrate priors from cohort evidence, review drift and protect immutable session estimates.
- [ ] Expand B1/B2 curriculum only with reviewer/authoring capacity. Clean legacy shims/naming/docs and friction after integrity and invariants are stable.
- [ ] Create one bounded design/plan per accepted subsystem; write its failure cases, red/green checks, rollback and review gate before implementation.

## Source traceability — every prioritized row

| Source row | Destination |
| --- | --- |
| P0-01 | W0; baseline plan Task 1 |
| P0-02 | W1; Task 4 |
| P0-03 | W2; integrity plan Tasks 1–2 |
| P0-04 | W2; integrity plan Task 3 |
| P0-05 | W3; baseline plan Tasks 2–3 |
| P0-06 | W3 warning diagnostics; baseline plan Task 3; W5 enforcement only after D3 |
| P0-07 | W0; Tasks 1–2; normalization report |
| P1-01 | W4; Task 4 |
| P1-02 | W4; Task 4 |
| P1-03 | W4; Task 5 |
| P1-04 | W5; Task 6 |
| P1-05 | W4; Task 5 |
| P1-06 | W6; Task 7 |
| P1-07 | W6; Task 8 |
| P1-08 | W6; Task 8 |
| P1-09 | W7; Task 8 |
| P2-01 | W8; Task 9 adaptive |
| P2-02 | W8; Task 9 item analytics |
| P2-03 | W8; Task 9 calibration |
| P2-04 | W8; Task 9 curriculum expansion |
| P2-05 | W8; Task 9 cleanup/UX |

## Source traceability — all distinct proposal groups

| Source IDs | Coverage |
| --- | --- |
| C01–C05 | W0/W1/W4; mapping, genuine B1, reviewer and authoring costs |
| C06–C13 | Spec §4/8; W4/W5/W8; retrieval, cognitive fit, reading/listening/production, workplace variety, review reuse |
| P01–P04 | W3 profiler/config; component budgets, deduplicated context, uncalibrated priors |
| P05–P08 | W5; multi-activity/item selection, deterministic score, prerequisites and review/transfer |
| P09 | W4 linter; W5 context constraints |
| P10–P12 | W3 readiness/warnings; W5 approved enforcement across durations |
| P13–P15 | W5 additive contract/flag/snapshot tests |
| P16 | W8 debt after stability |
| F01–F03 | W4 parser/metadata and immutable versions |
| F04–F12 | W4 linter, diagnostics and reviewed warn→error policy |
| L01–L05 | W2 mode/audio/API/UI/support evidence and replay telemetry |
| L06–L09 | W0 provenance; W6 audio/cost/quality |
| L10 | W4 independent facts/answer entities |
| M01–M04 | W2 evidence/feedback/retry design; W6 independent versus assisted |
| M05–M08 | W6 mastery/checkpoint/async grading |
| M09–M12 | W8 scaffold/stretch/spaced retrieval/item analytics; preserve current review |
| A01–A08 | W3 Admin views; W4 item lint/expert QA/publish policy |
| O01–O03 | W0 baseline; W6 telemetry/calibration |
| O04–O10 | W6/W7 metrics, shadow, test layers, controlled experiment and acceptance |
| G01–G05 | Spec §3; W0/W5 compatibility, flags, docs and rollback |
| G06–G10 | Tasks 1–2; mandate lifecycle, canonical roadmap, human ownership and protected enrollment |

H01–H17 are imported observations, not automatically confirmed bugs; W0 determines their current applicability. X01–X22 remain in the preserved source and normalization report. Spec §9 D1–D10 keeps every original business decision open; a planning choice never counts as a human product decision.

## Handoff and acceptance of this planning deliverable

All source text is preserved; every prioritized row and proposal group maps above; one existing mandate is reused; proposal/spec/plan/roadmap links resolve; no implementation checkbox is ticked. Run mandate validation and document link/traceability/diff checks. App tests, DB inventory, paid audio and pilot checks are future work, not claimed passing here.

Recommend reviewing W0/W3 first because their outputs inform content adequacy without changing learner grading. If execution is later approved, choose inline or subagent execution at that point; this planning task selects neither method and authorizes no commit/push.
