# Intermediate Baseline and Workload Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a redacted content baseline and show explainable, uncalibrated workload warnings in existing Admin without changing learner plans or publication decisions.

**Architecture:** Inventory approved data read-only, then build provider-free profiling in the learning-session domain. Admin consumes a sanitized projection through its existing query service. Structural availability and estimated workload readiness remain distinct.

**Tech Stack:** TypeScript, Prisma/PostgreSQL, Zod contracts, NestJS, React, Vitest/RTL, pnpm 10.34.1, Node 20.

**Spec:** `docs/superpowers/specs/2026-10-16-intermediate-learning-quality-design.md`, W0/W3; master plan `2026-10-16-intermediate-learning-quality.md`.

## Global Constraints

- W0 authorized on 2026-10-16 for configured-local read-only inventory and disposable-fixture verification. The later “ok,tiếp” authorizes advisory W3 implementation; timing calibration, enforcement and rollout remain gated.
- Preserve published/archived LessonVersion, rubric, admission and historical mastery evidence.
- Preserve IN_PROGRESS/PAUSED session snapshots and their original version bindings.
- Keep supported durations 45/60/90/120/150, targetMinutes=15, canonical ordering, four-skill coverage, unique activity IDs and final Respond.
- No filler, repeated IDs, runtime AI question generation or forced waiting to fill a time label.
- No new provider calls, schema migration or telemetry ingestion endpoint without scoped approval.

## Review Focus

- A context reused across questions/activities in one block incurs reception cost once (Task 2).
- Missing audio duration remains unknown, not zero or a complete readiness result (Tasks 2–3).
- Structurally playable but thin content shows a warning without disabling existing durations (Task 3).
- Legacy snapshots and other programs retain original plans/playability (Tasks 2–3).
- Invalid configuration or malformed source yields an explicit diagnostic, never fabricated estimates (Task 2).

## Entry and data decisions

Run only after the exact W0/W3 scope is approved and mandate links/hash match. W0 DB access requires an explicitly named environment and read-only transaction. No seed, migration, provider call, raw content export or enrollment mutation. If no authorized DB endpoint exists, record it as unavailable and complete fixture-only evidence; never label fixture evidence as live inventory.

W3 is advisory. D3/D8 enforcement stays blocked: no change to `availableDurations`, existing `INSUFFICIENT_CONTENT_FOR_DURATION`, publish status or learner session creation. `INSUFFICIENT_WORKLOAD` below is an Admin diagnostic code, not a new learner error contract. Priors are reviewed diagnostic configuration; they do not establish CEFR validity or pilot calibration.

W3 builder choice, stated in chat on 2026-10-16: there is no reviewed runtime timing configuration, so no numeric priors ship as defaults. Pure functions receive explicit configuration; their synthetic test numbers only validate arithmetic. Admin shows real counts/structural duration results and unknown timing with reasons until configuration is reviewed. The readiness projection accepts null configuration/profile for this case; it must not invent zero costs or net block budgets. See the direct continuation record in `mandate/reports/2026-10-16-intermediate-approval.md`.

### Task 1: W0 — Reproducible content and duration baseline

**Files:**

- Read: `packages/test-fixtures/src/foundation-mission.fixture.ts`, `apps/api/src/curriculum/infrastructure/seed-foundation.ts`, `apps/api/src/learning-programs/domain/program-catalog.ts`.
- Read/Test: `apps/api/src/learning-sessions/domain/session-planner.spec.ts`, `apps/api/test/integration/learning-sessions.integration.spec.ts`, `apps/api/test/integration/curriculum-seed.integration.spec.ts`.
- Create: `apps/api/scripts/report-intermediate-inventory.ts`, `apps/api/scripts/report-intermediate-inventory.spec.ts` if an approved DB inventory tool is needed.
- Create: `mandate/reports/<execution-date>-intermediate-baseline.md`; modify `docs/CURRICULUM.md`/roadmap only to correct behavior actually observed.

**Interfaces:** proposed `summarizeInventory(rows: readonly InventoryLesson[]): InventorySummary` lives in the report script and is independently exported/tested. `InventoryLesson` selects program/path/level/version identifiers, publication state, CEFR labels, parsed counts and audio provenance; `InventorySummary` contains aggregate counts and safe identifiers only. No learner identities/responses or source scripts. Existing `computeAvailableDurations(mission)` and `planFoundationSession(input)` stay unchanged.

- [x] Record revision, branch, dirty state, Node/pnpm, environment alias and time; use isolated schemas for integration tests. Document imported H01–H17 separately from new observations.
- [x] Write failing `summarizeInventory` tests: distinct activity/question/open-task counts; seed versus Admin provenance may be unknown; absent audio metadata remains unknown; mismatched program labels are reported rather than repaired; zero published lessons produces an empty inventory rather than a fabricated B1 count.
- [x] Run `pnpm --filter @worklingo/api exec vitest run scripts/report-intermediate-inventory.spec.ts`; expect assertion/module failure before implementing the report projection.
- [x] Implement the pure summary and optional script. Use a read-only, repeatable-read DB transaction with a bounded selected-field query; report only counts/IDs and audio metadata. Do not print connection strings or source snapshots. Read-only enforcement must apply before any inventory query. Skip DB execution when scope/credentials are unavailable.
- [x] Run the report spec again; expect PASS. Run `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/domain/session-planner.spec.ts`; record exact exit/counts. For the expanded fixture versus legacy subset, report all five durations and actual plan success separately. Do not infer endpoint availability from the helper alone.
- [x] With an authorized disposable integration schema, run the two integration specs above. With approved real read-only access, run `pnpm --filter @worklingo/api exec tsx scripts/report-intermediate-inventory.ts`; record aggregate results and limitations. A missing environment is a reported blocker, not permission to seed it.
- [x] Publish the redacted baseline report and evidence-backed docs corrections; review and commit only the explicit task files when execution/Git scope permits. Do not modify existing old reports to make them look current.

Progress on 2026-10-16: W0 discovery complete for the examined local legacy schema and fixtures. Report/planner specs 46/46 PASS; disposable integration suites 27/27 PASS. Current-model CLI fails safely on absent LearningProgram (15 pending migrations); a bounded read-only compatibility inspection obtains the actual public baseline with unknown catalog membership/level status. Backup/restore/migration rehearsal passed on a separately inventoried disposable copy, which was removed. See `mandate/reports/2026-10-16-intermediate-baseline.md` for the explicit ruling/limits. No commit/push or public migration is authorized or performed. The following “ok,tiếp” authorizes advisory W3; reviewed timing and enforcement remain gated.

### Task 2: W3 — Pure workload profile and per-plan estimates

**Files:**

- Create: `apps/api/src/learning-sessions/domain/lesson-workload-profiler.ts`, `lesson-workload-profiler.spec.ts`.
- Create: `apps/api/src/learning-sessions/domain/workload-snapshot.ts`, shared workload-only validation with safe repair locations. This does not alter legacy curriculum validation.
- Read: `apps/api/src/curriculum/domain/curriculum.types.ts`, `apps/api/src/learning-sessions/domain/session-plan.types.ts`, `packages/contracts/src/learning-session.contracts.ts`.

**Interfaces (proposed new types, all in the profiler file):**

```ts
interface WorkloadConfig {
  version: string;
  readingWordsPerMinute: number;
  audioReplayFactor: number;
  secondsPerQuestion: number;
  secondsPerOpenTask: { speaking: number; writing: number };
  feedbackSecondsPerPrompt: number;
  reflectionSecondsPerActivity: number;
  transitionSecondsPerActivity: number;
  budgetSecondsByBlock: Record<SessionBlockType, number>;
}
interface AudioTiming { readonly secondsByContentSlug: Readonly<Record<string, number | null>> }
function profileLessonWorkload(
  snapshot: LessonSnapshot, config: WorkloadConfig, audio: AudioTiming,
): LessonWorkloadProfile;
function estimatePlanWorkload(
  plan: SessionPlan, profile: LessonWorkloadProfile, config: WorkloadConfig,
): readonly BlockWorkloadEstimate[];
```

Import `LessonSnapshot` and `SessionPlan`/`SessionBlockType` from existing domain/shared types. Outputs are immutable serializable data, not Prisma entities. Define `LessonWorkloadProfile` with `configVersion`, `calibrated: false`, activity/question/open-task totals, context reception records keyed by `(contentSlug, reading|listening)`, activity component costs/context keys and `unknowns`. Define `BlockWorkloadEstimate` with `order`, `activityIds`, counts, unique `contextKeys`, `estimatedSeconds: number|null`, `budgetSeconds`, `missingSeconds: number|null`, `calibrated: false`, and `unknowns`. Components sum reception + processing + production + feedback + reflection + transition. Invalid config throws a typed diagnostic, not NaN/Infinity.

**Builder choices:** implementation may select internal collections and word-tokenization library already installed. Document the word-count rule and priors; no new dependency or AI inference is necessary. Derive cognition only when declared metadata exists; unknown cognition remains unknown.

- [x] Write tests named `counts_questions_separately_from_open_tasks`, `charges_shared_context_once_per_block`, `keeps_unknown_audio_null`, `rejects_invalid_config`, `preserves_input_and_legacy_plan`. Use small synthetic valid snapshots in the test file with fixed IDs and explicit config.

```ts
// Synthetic priors test arithmetic, not pedagogical calibration.
expect(profile.calibrated).toBe(false);
expect(profile.questionCount).toBe(2);
expect(profile.openTaskCount).toBe(1);
// Two questions use the same 60-word text; 60 WPM => 60s reception.
// With question processing 10s each and other costs zero: 80, not 140.
expect(sharedBlock.estimatedSeconds).toBe(80);
expect(sharedBlock.contextKeys).toHaveLength(1);
expect(missingAudioBlock.estimatedSeconds).toBeNull();
expect(missingAudioBlock.missingSeconds).toBeNull();
```

- [x] Run `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/domain/lesson-workload-profiler.spec.ts`; require the intended red result.
- [x] Implement both pure functions and explicit diagnostics. Count each content reception once per block; question count never multiplies full context cost. Use measured audio seconds plus replay prior. Missing required timing makes the affected total unknown; all estimates retain provenance/config version.
- [x] Run that spec and existing session-planner spec; require PASS and unchanged v1 behavior. Add cases for empty content/unknown references, negative or nonfinite config, same content read versus heard, repeated blocks, multi-question arrays and neither count nor input mutation.
- [x] Review technical arithmetic/totals/exclusions against W0 and independent code review. Qualified content review of actual timing priors remains open; no priors ship at runtime. No commit is authorized or made. No planner selection, session schema or DB writes in this task.

### Task 3: W3 — Admin warning/readiness projection

**Files:**

- Create: `apps/api/src/learning-sessions/domain/workload-readiness.ts`, `workload-readiness.spec.ts`.
- Create: `apps/api/test/helpers/workload-fixture.ts`, `apps/web/src/features/admin-curriculum/lesson-workload-panel.tsx` and `.test.tsx`.
- Modify: `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.ts`, its existing spec.
- Modify: `packages/contracts/src/admin-curriculum.contracts.ts`, existing `.spec.ts`; add optional workload projection, keeping old responses parseable.
- Modify: `apps/web/src/features/admin-curriculum/curriculum-workspace.tsx`, existing `.test.tsx`, and `i18n.ts` for localized labels.
- Modify: `apps/web/src/features/admin-curriculum/curriculum.css`, `apps/web/src/i18n/messages/adminCurriculum.ts` for responsive/native keyboard disclosure and EN/VI details.
- Test: `apps/api/test/integration/admin-curriculum-query.integration.spec.ts`, `apps/web/e2e/admin-curriculum-audit.spec.ts`.

**Interfaces:** proposed `buildDurationReadiness(mission: PublishedMission, profile: LessonWorkloadProfile, config: WorkloadConfig): readonly DurationReadiness[]`. For each supported duration call existing canonical planner when structurally available; consume Task 2 estimates. `DurationReadiness` has duration, structural availability, `workloadStatus: 'unavailable'|'unknown'|'insufficient'|'estimated_sufficient'`, block estimates and warnings (`code`, block order, message, `missingSeconds: number|null`, safe source pointers). Unknown takes precedence over a claim of sufficient. Insufficient requires a known component deficit; “estimated sufficient” is not expert approval. Add `workload?` to Admin-only summary contracts; never project scripts, answer entities or rubrics to learner DTOs.

Implemented boundary refinements: profile/config may be null to represent missing reviewed priors, with null estimates and null net budgets. Source warnings contain allowlisted paths/IDs/slugs instead of raw parser errors; blank text/ambiguous identifiers are invalid for workload only. The optional projection includes declared-skill activity counts, snapshot/unknown-authoring provenance and selected audio adapter/status metadata, with unknown duration. Narrow-screen rows stack vertically while preserving table roles. Final evidence in `mandate/reports/2026-10-16-intermediate-workload-visibility.md`: whole-workspace1,324 PASS, browser4 PASS, full typecheck/lint plus API/web build PASS. Advisory W3 is technically verified; calibrated priors, enforcement and integration/release remain separate gates.

- [x] Write failing readiness tests across all five durations: missing structural content stays unavailable with existing availability result; thin playable fixture warns; missing timing is unknown; exact synthetic budget matches; excess workload is reported; invalid lesson gets a safe diagnostic. Assert no source snapshot mutation.
- [x] Write failing query/contract/UI tests: response without optional workload still parses; UI renders counts/unknown/calibrated=false and per-block deficit; a warning never changes publish/archive/playability actions; unauthorized role cannot access extra data; errors give safe activity/context pointers.
- [x] Run focused API readiness/query, contracts and Admin RTL specs to establish red. Implement pure readiness plus optional Admin projection and localized warning UI; reuse existing workspaces. Repeated context costs obey Task 2. Do not couple read-only Admin querying to learner mastery/provider calls.
- [x] Run `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/domain/workload-readiness.spec.ts src/admin-curriculum/application/admin-curriculum-query.service.spec.ts`; `pnpm --filter @worklingo/contracts test`; `pnpm --filter @worklingo/web exec vitest run src/features/admin-curriculum/curriculum-workspace.test.tsx`; `pnpm i18n:check`. Require PASS.
- [x] With isolated DB/browser fixtures, run the integration spec and `pnpm --filter @worklingo/web exec playwright test e2e/admin-curriculum-audit.spec.ts`; verify keyboard/mobile warning reading and absence of publish blocking. Run affected package typechecks and a focused diff review.
- [x] Record W3 acceptance evidence and unknowns. Keep enforcement of `INSUFFICIENT_CONTENT`/duration disabling and workload hard gates blocked by D3/D8. Commit explicit task paths only if authorized.

## Completion boundary

W0 is complete only for the environments actually examined. W3 is complete when counts/estimates/unknowns are visible, five-duration warnings are tested and current learner/publish behavior remains verified. This does not complete W1/W2/W4–W8, prove B1 content, calibrate priors or authorize a pilot. The master plan owns subsequent decisions.
