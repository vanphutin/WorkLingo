# Intermediate Assessment Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate independent listening assessment from practice/accessibility, with protected transcript/feedback and honest first-attempt/support evidence.

**Architecture:** Bind a policy version/mode and private reviewed manifest when creating a newly eligible session. Persist support-before-attempt in a proposed additive state table, sanitize learner projections, and serve reviewed published media for independent listening. Persist immutable first-answer evidence atomically without rewriting existing sessions or mastery. UI follows server capabilities.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, Zod, React/RTL, Vitest, Playwright, Node 20 and pnpm 10.34.1.

**Spec:** [Accepted W2 policy](../specs/2026-10-16-intermediate-assessment-policy-design.md); [master design](../specs/2026-10-16-intermediate-learning-quality-design.md), W2/§7; master plan `2026-10-16-intermediate-learning-quality.md`.

**Status:** Bounded isolated implementation verified, 2026-10-16: 1,422 tests / 280 files and 6 E2E PASS; typecheck/lint/build/i18n PASS. Direct human “duyệt” binds the concrete policy and test-only migration scope in the [approval record](../../../mandate/reports/2026-10-16-intermediate-approval.md). Inline implementation, one fresh final review and one fix pass; [execution evidence and limitations](../../../mandate/reports/2026-10-16-intermediate-assessment-integrity.md). Live cohort, integration and manual screen-reader testing remain separate.

## Global Constraints

- W2 implementation in the existing isolated worktree and migration in disposable test schemas are approved. Public/preview DB upgrades and rollout are separate.
- Preserve published/archived LessonVersion, rubric, admission and historical mastery evidence.
- Preserve IN_PROGRESS/PAUSED session snapshots and their original version bindings.
- Preserve Format 1.0/1.1 parsing and legacy plan parsing/resume.
- Preserve enrollment, activeProgramId and currentLevelCode semantics; no implicit learner reassignment.
- No new provider calls or telemetry ingestion endpoint are approved.
- The additive `SessionAssessmentState` migration may run only in disposable test schemas; public and the running preview schema remain separate data-change scopes.
- Keep live policy selection disabled. Real content/media/history review and activation are separate from synthetic fixture verification.

## Review Focus

- Alternate text channels and prior Reading exposure must not invalidate independent Listening; require reviewed session-wide separation, safe projections and durable disclosure evidence (Tasks 1/3).
- Media loss/fake audio must not silently become browser TTS in independent mode (Task 2).
- Accessible mode must keep transcript/replay and fair scoring/evidence labels (Tasks 1–3).
- Concurrent and replayed requests must preserve one stable first attempt and support state (Task 3).
- Flag changes and late AI grading must not change a legacy session's policy or turn pending into mastery (Tasks 1/3).

## Concrete decisions proposed before any code

This plan is conditional. The linked concrete policy supplies proposed D1/D4/D5/D6/D7/D9 defaults. Review the exact slice, additive state-table migration and rollback before code. Do not choose real content thresholds, enable a cohort or publish audio as a side effect of approving DTO protection.

**Recommended design for review, not a recorded human decision:** one complete valid accepted submission finalizes that activity's independent cycle, whether correct or incorrect. Partial/malformed requests do not. This explicitly replaces the earlier unspecified retry-cycle suggestion. Keep checkpoint advancement on a perfect score; later correction after feedback is supported. Preserve the first independent score. Support-before-submit means no independent result. No raw-score multiplier or mastery-weight change.

**Independent-content activation gate (D4):** require a reviewed manifest for every selected set/Reading–Listening fact boundary, real media and known history. The user's selected AI review method is permitted with recorded scope/evidence; no human certification is invented. W2 implementation does not prove content separation or media quality. If no review exists, independent mode is unavailable. Durable group exposure makes later answers supported despite new hashes/IDs. Same-version prior sessions and unknown legacy-family sessions conservatively prevent independent selection; recheck new legacy-family sessions before submission. Use explicit “Xem hỗ trợ” / accessibility actions. See policy §§3–7 for the full boundary.

The code's `purpose` values are learning/placement; do not equate this proposed `assessmentMode` with placement. Placement isolation remains unchanged. Legacy sessions keep legacy behavior and unknown support provenance; no synthetic “independent” history is introduced.

### Task 0: Policy/state model and additive persistence seam

**Files:**

- Create: `apps/api/src/learning-sessions/domain/assessment-policy.ts`, `assessment-policy.spec.ts`, `assessment-state.ts`, `assessment-state.spec.ts`.
- Create: `apps/api/src/learning-sessions/application/assessment-state.service.ts`, `assessment-state.service.spec.ts`.
- Modify: `apps/api/prisma/schema.prisma`; create one migration directory named `<generated-timestamp>_session_assessment_state/migration.sql` only after approved scope; `learning-sessions.module.ts`.
- Test: new `apps/api/test/integration/assessment-state.integration.spec.ts`.

**Interfaces:** `AssessmentMode = 'independent'|'practice'|'accessible'`; `SupportReason` is exactly the six-value enum in policy §6. `AssessmentActivityStateV1` contains the exact per-activity fields there; `SessionAssessmentStateV1` wraps `version:1` and `activities:Record<string,AssessmentActivityStateV1>`, strictly limited to the bound selection. `SessionAssessmentPolicy` carries `version:'intermediate-comprehension-v1'`, immutable initial `mode`, and private reviewed manifest; public projection excludes the manifest. `AssessmentStateService.withLockedState<T>(input:{learnerId:string;sessionId:string}, work:(tx:Prisma.TransactionClient,state:SessionAssessmentStateV1)=>Promise<T>):Promise<T>` locks LearnerProfile then LearningSession, reloads the bound plan/state, and persists validated state within the transaction. No provider or file work inside the callback. Use the same order for new-policy creation and all disclosure/attempt writers.

- [x] Write failing state tests: support before any attempt persists, unknown/missing state cannot become independent, supported transition is monotonic, unrelated activity/group keys reject, immutable manifest/policy survive configuration changes. Reject an attempt-only or request-local support implementation.
- [x] Run `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/domain/assessment-policy.spec.ts src/learning-sessions/domain/assessment-state.spec.ts src/learning-sessions/application/assessment-state.service.spec.ts`; require intended RED.
- [x] Implement strict schemas/pure transitions and the one additive state table/FK from policy §6; no legacy rows/backfill or snapshot mutation. Run `pnpm --filter @worklingo/api exec prisma generate`. Migration files stay isolated from public/preview execution.
- [x] Add isolated DB tests for ownership FK/cascade, two clients competing for state locks, rollback-before-disclosure, state disappearance and cross-session lock ordering. Use existing disposable-schema helpers; no ad hoc public migration command.
- [x] Run the focused unit command plus `pnpm --filter @worklingo/api exec vitest run test/integration/assessment-state.integration.spec.ts`; require PASS. Inspect generated migration: only the new table/ownership constraint, no legacy DDL/data updates. Record red/green and migration evidence; no commit inferred.

### Task 1: Policy binding and complete learner projection

**Files:**

- Create: `apps/api/src/learning-sessions/application/learner-activity-projector.ts`, `learner-activity-projector.spec.ts`.
- Create: `apps/api/src/learning-sessions/domain/assessment-manifest.ts`, `assessment-manifest.spec.ts` for private manifest validation/eligibility and group mappings.
- Modify: `packages/contracts/src/learning-session.contracts.ts`; new `learning-session.contracts.spec.ts` if absent; export additions through existing `index.ts`.
- Modify: `apps/api/src/learning-sessions/application/session-creation.service.ts`/`.spec.ts`, `learning-sessions.service.ts`/`.spec.ts`, `learning-session.types.ts`, `dto/create-learning-session.dto.ts`.
- Test: `apps/api/test/integration/learning-sessions.integration.spec.ts`, `program-context-api.integration.spec.ts`, `session-ownership.integration.spec.ts`.

**Interfaces (proposed):**

`ReviewedAssessmentManifest` is a strict, private version-1 object with `revision`, `programId`, `levelCode`, `missionId`, `lessonVersionId`, `policyVersion`, `sourceDigest`, `review:{method:'ai'|'human',reviewer:string,reviewedAt:string}`, `relatedMissionIds`, `relatedLessonVersionIds`, `selectedActivitySets:readonly (readonly string[])[]`, `disclosureGroups` (opaque group ID → member activity/item refs plus delivery paths that expose it), and `audioBindings` (activity/script → artifact ID/checksum/QA reference). All IDs/refs must resolve to the bound snapshot; sets must match actual planner output. Incomplete family/route/media review fails independent eligibility. `selectAssessmentPolicy(input:AssessmentEligibilityInput):SessionAssessmentPolicy|undefined` consumes the server cohort, validated requested mode, snapshot, selected activity IDs and locked learner history. Ineligible explicit independent requests throw the safe policy error; `undefined` is reserved for outside-cohort legacy creation.

```ts
type AssessmentMode = 'independent' | 'practice' | 'accessible';
interface SessionAssessmentPolicy {
  readonly version: 'intermediate-comprehension-v1';
  readonly mode: AssessmentMode;
  readonly manifest: ReviewedAssessmentManifest; // private, never public DTO
}
function projectLearnerActivity(
  activity: CurriculumActivity,
  snapshot: LessonSnapshot,
  policy: SessionAssessmentPolicy | undefined,
  state: AssessmentActivityStateV1 | undefined,
): LearnerActivityDto;
```

Consume Task 0 types/state; projector imports existing snapshot/DTO types. New optional private `assessmentPolicy` in plan snapshot carries exact version/mode/manifest selected by the server; undefined uses the explicit legacy projection. Public session DTO sanitizes the private plan. Inside the server cohort, optional `requestedMode` is validated against the pinned manifest/history; default practice, no silent independent downgrade. Outside the cohort preserve legacy; client cannot enable a cohort. DTO adds optional safe fields (`mode`, `effectiveMode`, `transcriptAvailable`, `browserSpeechAllowed`, `finalized`). Missing state on a bound session is unavailable, never legacy. A complete text-channel and alternate-endpoint inventory is part of the projector test fixtures; block activation if any applicable channel remains unresolved.

- [x] Start with failing projector tests for independent/unfinalized listening: omit transcript and answer-bearing content/Language Block examples, answer indices, rationale/evidence and sample answers; retain safe question/options, IDs and audio capability. Practice/accessible policy returns supported text with honest evidence labels. Reading and required safe question text remain usable.
- [x] Add legacy-plan and server-eligibility tests: old snapshot parses/resumes; non-pilot program/mode injection cannot enable new policy; switching a flag after creation does not change bound policy; another learner/session cannot read content. Include finalized versus incorrect-unfinalized boundaries as chosen in the policy note. Require review provenance for independent content eligibility; no review means no independent activation.
- [x] Add `reading_exposure_prevents_independent_listening`: open Reading before a Listening activity using the same content, then a case with paraphrased answer facts under a different ID/hash. Require safe independent eligibility rejection or supported evidence per the accepted policy; never independent evidence. Also verify reviewed same-topic/different-answer content remains eligible.
- [x] Add history tests: prior same LessonVersion, legacy session in reviewed family (including created later), related-version disclosed group, unavailable history and cross-session concurrent exposure. Unknown family coverage disables independent mode; no synthetic independent history. Policy-private manifest/digests/reviewer details never appear in public `plan`.
- [x] Run focused contracts/projector/session creation specs; require red for the intended new assertions, not unrelated environment failure.
- [x] Implement disabled-by-default policy selection, private snapshot binding and pure allowlist projection. Inventory get activity, get session, drafts, attempts, evaluation polling, media errors, learner curriculum/preview and alternate activity routes; sanitize every applicable channel with shared disclosure policy. Persist permitted text-delivery intent and affected group support before body delivery via Task 0 locks; disallowed disclosure requires explicit support. Use no-store and remove speculative prefetch for protected routes. Preserve ownership/backend evaluation content. The manifest includes all selected duration sets; never infer actual separation from ID/hash differences.
- [x] Run focused specs and affected package typechecks; use isolated DB for the named integration suites. Assert safe response shape, version binding and no leaked original script anywhere in serialized independent responses.
- [x] Review the boundary and record acceptance evidence. Preserve uncommitted W0/W3/W4; commit only if separately authorized.

### Task 2: Independent media and mode-aware listening UI

**Files:**

- Modify: `apps/api/src/learning-sessions/application/learner-audio.service.ts`/`.spec.ts`.
- Modify: `apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx`/`.test.tsx`.
- Modify: `apps/web/src/features/audio/lesson-audio-player.tsx`/`.test.tsx`; `apps/web/src/lib/api/api-client.ts`; appropriate `learningSession` i18n dictionaries.
- Test: `apps/api/test/integration/versioned-learner-audio.integration.spec.ts`; `apps/web/e2e/foundation-session.spec.ts`, `accessibility.qualification.spec.ts`.

**Interfaces:** consumes Task 1 capabilities/policy and existing version-bound audio URL. The player must receive `browserSpeechAllowed=false` and no transcript text in an independent unfinalized assessment. Add the optional capability to player props; default preserves legacy/practice behavior. Audio service returns a safe structured unavailable reason, with no script, when the required published artifact is missing/unacceptable.

- [x] Write failing tests: independent mode never renders transcript or calls `speechSynthesis`; source-preference and media-error fallbacks cannot override this; missing/fake-only media reports independent assessment unavailable; 404/403 do not disclose script or storage keys. A practice/accessibility user can read transcript/replay via keyboard/screen reader.
- [x] Run `pnpm --filter @worklingo/web exec vitest run src/features/learning-session/activity-renderers/listening-activity.test.tsx src/features/audio/lesson-audio-player.test.tsx` and API learner-audio spec; require red.
- [x] Implement mode-aware playback/rendering. Use published server media for independent mode. Do not synthesize new audio, enable a provider or silently treat a fake tone as valid assessment. Expose an explicit supported-mode/error path per the approved policy; no mandatory play/ended gate as proof of comprehension.
- [x] Run both test commands again, i18n/typechecks, and versioned audio integration against isolated data; require PASS. Preserve historical audio binding/preferences in legacy/practice mode.
- [x] Run desktop/mobile session and a11y qualification E2E with independent versus supported fixtures, media failure and keyboard checks. Record manual screen-reader testing as unperformed separately from automation; no native screen-reader assurance is claimed.
- [x] Review explicit task files; commit only if authorized. Availability of independent mode remains gated by actual reviewed audio; a successful UI test does not approve production audio quality. Use a test-only injected synthetic manifest/media QA reference in disposable tests, never a production bypass for fake media.

### Task 3: Feedback timing and durable attempt/support evidence

**Files:**

- Create: `apps/api/src/learning-sessions/domain/attempt-evidence.ts`, `attempt-evidence.spec.ts`.
- Create: `apps/api/src/learning-sessions/application/assessment-support.service.ts`, `assessment-support.service.spec.ts`, `dto/request-activity-support.dto.ts`.
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`/`.spec.ts`, `learning-session.types.ts`; supporting draft/submission services where policy inventory shows disclosure.
- Modify: `apps/api/src/learning-sessions/learning-sessions.controller.ts`, `learning-sessions.module.ts`, `dto/submit-attempt.dto.ts`, `dto/learning-session-response.dto.ts`; `packages/contracts/src/learning-session.contracts.ts` and tests. Support authority stays server-owned.
- Modify: `apps/api/src/teacher-ai/application/evaluation.service.ts`/`.spec.ts` only where the Task 1 inventory requires new-policy safe polling projection; preserve evaluation semantics.
- Test: new `apps/api/test/integration/assessment-attempt-evidence.integration.spec.ts`; existing `learning-sessions.integration.spec.ts`, `placement-isolation.integration.spec.ts`, `progression.integration.spec.ts`.
- Modify: `apps/web/src/features/learning-session/session-shell.tsx`/`.test.tsx`, `evaluation-feedback.tsx`/`.test.tsx`, `activity-renderers/reading-activity.tsx`/`.test.tsx`, `activity-renderers/listening-activity.tsx`/`.test.tsx`, `use-evaluation.ts`/`.test.tsx`, `apps/web/src/lib/api/api-client.ts`, paired learningSession i18n dictionaries. Add only mode/support/result controls; do not redesign the workspace.

**Interfaces:** `AttemptEvidenceV1` is the exact interface in policy §6: `version`, `assessmentPolicyVersion`, `assessmentMode` (initial), `effectiveMode`, `attemptIndex`, `firstAttempt`, `independence`, `supportReasons`, `answerChangedAfterFeedback`, `originalScore` (0..1/null). `buildAttemptEvidence(input:AttemptEvidenceInput):AttemptEvidenceV1` consumes locked server state/prior attempts **before** this response releases feedback. Only new-policy Reading/Listening get this envelope; open-response grading remains unchanged. `AssessmentSupportService.request(input:{learnerId:string;sessionId:string;activityId:string;clientSupportId:string;mode:'practice'|'accessible'}):Promise<LearnerActivityDto>` commits monotonic support via Task 0 before Task 1 projection returns text. `POST /learning-sessions/:id/activities/:activityId/support` consumes that typed DTO; repeated requests are idempotent by monotonic state. A client ID is not a disclosure authority.

Task 0 supplies durable pre-answer support/finalization state. Attempt `normalizedResponse` gets only the additive server-owned `evidence` branch, preserving validated answer fields; no guessed metadata column. First attempt/order comes from locked committed history and stable request identity, not wall-clock timestamps alone. Missing evidence on old attempts means unknown. Private raw client properties never pass through new-policy DTOs. Project immediate, duplicate, full-session and polled results through shared Task 1 allowlists.

- [x] Write failing evidence tests: first complete no-support answer is independent; its response finalizes the independent cycle and marks feedback disclosed for later attempts. Malformed/partial answers create no scored attempt and expose no answers. Support-before-first means supported first answer. A later corrected perfect score advances under existing rules but cannot replace the first independent score. Accessible mode does not lower raw score. Evidence snapshots remain independent after their own feedback is released.
- [x] Add integration assertions for two concurrent submissions, idempotent replay, support-before-submit and replay after support: exactly one first attempt, consistent original score/evidence, stable server support state and no duplicate mastery event. Include Reading opened before Listening: earlier cross-skill fact exposure is persisted/consulted and the resulting evidence remains supported after resume/replay. A late queued/failed speaking/writing result must not be projected as an evaluated success; placement evidence stays isolated.
- [x] Add cross-session support-versus-submit races and legacy-family session created after independent selection. Assert the learner→session lock order, current locked checkpoint/state, first commit wins, safe rollback-before-body, no stale pre-lock state and no duplicate advance. Duplicate ID after advancement replays; new ID obeys existing checkpoint checks. Missing state/unknown policy fails closed after feature rollback.
- [x] Run new domain/service tests and isolated integration spec; require the specific red behavior. Choose transaction ordering with the existing session lock/idempotency model; no unrelated schema changes.
- [x] Implement support endpoint and evidence/finalization inside Task 0 locked transactions, with strict complete-answer validation. Centralize immediate/replayed/session/polled response projection. Preserve raw histories, normalized answer fields, score scale and perfect-score advancement. Commit feedback/group disclosure intent before returning full explanations/transcript. Do not adjust mastery/STABLE/checkpoint weights or claim those existing weights are independent; W6 owns that policy.
- [x] Run the domain/service/new integration specs plus existing learning-session, progression and placement-isolation regressions, then affected contracts/web tests and typechecks. Require PASS; document pending human policy validation.
- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm i18n:check`, targeted desktop/mobile/a11y E2E and `git diff --check` once against the final tree. Preserve passing W0/W3/W4 coverage. One fresh final engineering reviewer checks disclosure/privacy/concurrency and the final diff; record actual results/limits. Commit only under separate authorization. Rollback stops new selection; bound sessions retain policy, manifest and state table. Old sessions/evidence remain untouched.

## Exit criteria and boundaries

The approved mode/version must pass API/UI non-disclosure, media/error/accessibility, durable state and concurrent evidence tests. Practice/accessibility retain support; legacy sessions, placement and non-cohort programs remain isolated. Mastery weighting, adaptive retries, new media/provider generation and pilot rollout remain separate W4/W6/W7 work. D1/D4–D7/D9 are accepted only for this bounded engineering slice by the linked direct approval. Real activation remains off until content/media/history QA is recorded. Manual screen-reader testing remains unperformed; automated keyboard/mobile checks are reported separately.

## Plan self-review (2026-10-16, planning only)

- Policy §§3–4 → Tasks 0/1/3: mode, valid-answer finalization, supported correction, immutable first result.
- Policy §§5–7 → Tasks 0/1/2/3: manifest/history/real-media gate, all-route allowlists and durable disclosure before body delivery.
- Policy §§6/8 → Tasks 0/3: proposed state migration, learner→session locks, concurrency, rollback retaining bound semantics.
- Review Focus cases map to explicit tests above. Names/evidence fields use the policy interface; no `supportLevel` versus `supportReasons` mismatch remains.
- Historical planning self-review above preceded implementation approval. Current execution evidence supersedes its original pending status; this remains the same plan and backlog.
