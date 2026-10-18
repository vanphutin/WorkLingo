# Intermediate W2 assessment policy — accepted v1

Date: 2026-10-16 (Asia/Saigon).
Status: Accepted for isolated implementation and disposable test-schema migration by direct human “duyệt”; live activation and public/preview migration remain outside scope. See [approval](../../../mandate/reports/2026-10-16-intermediate-approval.md) and [execution evidence](../../../mandate/reports/2026-10-16-intermediate-assessment-integrity.md).
Policy identifier: `intermediate-comprehension-v1` (not placement or CEFR certification).
Canonical scope: [master design](2026-10-16-intermediate-learning-quality-design.md), W2; [existing implementation plan](../plans/2026-10-16-intermediate-assessment-integrity.md).
Mandate: MND-20261015-001; no new register item or competing sprint board.

## 1. Intent and authority

Show the difference between a learner's first unassisted comprehension answer and later supported correction. Keep practice and accessibility useful. Protect independent Listening on the server rather than hiding its transcript in the browser.

The initial “ok, tiiene hành” authorized policy refinement. The later direct “duyệt” approved this concrete W2 policy, code in the existing worktree and the additive migration only in disposable test schemas. The exact exchange is retained in the approval record. Audio generation, public/preview data changes, publication and live activation require separate scope. Existing W0/W3/W4 approvals remain intact.

Success is honest, durable evidence and a usable support path. It is not a higher score, more attempts, proof that a learner never saw similar language elsewhere, or a new mastery/admission rule.

## 2. Evidence and architectural constraints

Examined checkout: isolated `intermediate-quality-baseline/WorkLingo`, HEAD `efa2fd99b5373a644a011af3787bf81f737a51a7`, including uncommitted W0/W3/W4. Findings are static inspection, not a new runtime test.

| Observed boundary | Source | Consequence |
| --- | --- | --- |
| Activity projection returns referenced content and Language Blocks | `apps/api/src/learning-sessions/application/learning-sessions.service.ts`, `getActivity` | Protect every answer-bearing channel, including other activities |
| Wrong comprehension attempts immediately receive explanations; only perfect scores advance | Same service, `evaluate` | Define assessment-cycle finalization separately from checkpoint completion |
| Session creation stores a plan snapshot; attempts store response JSON | `session-creation.service.ts`; `apps/api/prisma/schema.prisma`, `LearningSession` / `ActivityAttempt` | Keep bound policy immutable; do not hide mutable support state in the plan |
| No dedicated support-before-attempt state exists | Same Prisma models | Attempt JSON alone cannot record transcript disclosure before any attempt |
| Session and direct attempt DTO helpers serialize attempts separately | `session-creation.service.ts`, `learning-sessions.service.ts` | Centralize new-policy projection for immediate, replay and session responses |
| Audio service already excludes `fake-tts` READY artifacts | `application/learner-audio.service.ts` | Artifact existence is necessary but does not establish reviewed media quality |
| Drafts are mutable Writing drafts with expiry | `application/activity-drafts.service.ts` | Never repurpose draft retention for assessment disclosure state |

Preserve published/archived versions, enrollment/program selection, IN_PROGRESS/PAUSED snapshots, five durations, item identities, old normalized response fields, scores and existing mastery/checkpoint weighting. Legacy sessions remain legacy with unknown support provenance. D-023/D-024 continue to govern them and supported practice.

## 3. Modes and learner behavior — D4 recommendation

The immutable session policy records its initial mode. Durable per-activity state records effective support; mode names alone never determine independence.

| Initial mode | Available support | Evidence label |
| --- | --- | --- |
| `practice` | Transcript, replay, explanations and existing browser speech | `supported` from the start; preserve raw score |
| `accessible` | Same text/audio support, keyboard and screen-reader access | `supported`; no score penalty or diagnostic disclosure required |
| `independent` | Safe prompts/options, reviewed published audio, unlimited audio replay | First accepted complete answer may be `independent`; every known disclosure is consulted |

New policy applies only to an explicit server cohort and exact reviewed content manifest. No production cohort is enabled by this design. Outside that cohort, preserve legacy behavior. Client `requestedMode` is a preference validated against server eligibility, never permission. Omitted mode defaults to practice inside the new cohort. An ineligible independent request returns `ASSESSMENT_MODE_UNAVAILABLE` with safe reason/capabilities and an explicit practice/accessibility action; it does not silently downgrade.

During independent work, “Xem hỗ trợ” explicitly switches that activity to practice, or “Dùng hỗ trợ tiếp cận” to accessible, before text is returned. The server commits support state first. The action is monotonic for this activity and any review-mapped affected activities. A later request cannot restore independence. No hint taxonomy in v1: any answer-bearing help counts as support; a generic instruction such as “Chọn một đáp án cho mỗi câu” does not.

No timer, minimum listening duration, playback-ended gate, replay limit, forced wait, adaptive retry or browser-only claim that audio was heard.

## 4. Finalization and retries — D5 recommendation

**One complete, valid server-accepted submission closes the independent assessment cycle for that activity.** The UI says this before “Nộp bài”. This is an explicit one-submission policy recommendation, replacing the earlier open-ended retry-cycle suggestion; an arbitrary malformed request or partial answer does not finalize anything.

Validate exactly one in-range answer per authored question. Reject malformed/partial input without creating a scored attempt or revealing feedback. Network retries reuse `clientAttemptId` and return the same stored attempt. After the first accepted independent submission, persist the first score and finalization atomically, then permit transcript/full rationale. Before that boundary, no per-item correctness, rationale, evidence or sample answer is returned.

Finalizing the independent cycle is distinct from advancing the learning checkpoint. Preserve the current advancement rule: a perfect comprehension score advances; otherwise the learner sees feedback, corrects in supported practice, and a later perfect answer advances. Full feedback is recorded as disclosed before it is returned, so all such later attempts are supported. The original independent score remains visible and immutable; a later 100% does not replace it.

If support is requested before the first answer, that activity has no independent result. Its first submitted answer can still be first chronologically, but it is supported. Practice/accessibility keep educational feedback and the existing completion rule. Reading follows the same first-answer/feedback evidence rule; its necessary reading passage is permitted material, while early answers/rationales are not.

W2 adds no mastery multiplier, STABLE badge, admission threshold or checkpoint assessment policy. Existing mastery events may still consume supported scores under existing rules; W2 labels must not present them as independent proficiency. Pending/queued/failed Speaking or Writing evaluation is never an evaluated result. Free productive Speaking remains a separate design.

## 5. Content separation, history and media — D1/D6 recommendation

The server manifest pins program/level/mission IDs, LessonVersion ID, policy ID, reviewed ordered activity set, private source digest, reviewer method/identity, review date, private disclosure-group mapping and approved audio artifact IDs/checksums. Persist the full validated manifest and its revision in the private plan snapshot at creation; subsequent configuration edits do not replace it. Strip that private branch from learner DTOs. Review covers every selected activity, prompt, question, Language Block example and Reading/Listening answer fact. Every selected set produced by supported durations needs coverage; no hash difference is proof of semantic separation. Same-topic/different-answer facts can pass.

Independent activation requires both reviewed session-wide separation and reviewed real media bound to that version. The existing two B1 drafts and fake-only local curriculum do not qualify. AI review is the user's selected method: an explicitly recorded AI separation/media review may satisfy the method when evidence exists; do not invent human certification. The present content review alone does not attest audio QA or W2 separation.

Disclosure groups are stable opaque IDs assigned by the review across known equivalent facts/versions, not derived solely from text hashes. Prior server-recorded exposure to a matching group makes affected evidence supported, including after resume or in another new-policy session. Unknown legacy exposure is conservative: deny independent eligibility for a learner with any other legacy session for the reviewed mission/lesson family, checking both at creation and before each independent submission. This includes a legacy session created after the independent session; it requires no mutation of legacy sessions. Also deny new independent selection if a prior session used the same LessonVersion, even if no answers were submitted; exclude the current session when rechecking. A manifest must declare the reviewed related mission/version family; absence or incomplete history coverage makes independent mode unavailable. Labels describe tracked assistance, not unseen external study or proctored exam conditions.

Published audio must match the reviewed artifact/checksum and script, be READY, non-fake, decodable and reviewed for intelligibility, completeness and speaker/answer consistency. No new provider/voice/cost choice is made. On missing/corrupt audio, return `ASSESSMENT_MEDIA_UNAVAILABLE` without scripts, keys or provider payloads; allow retry or an explicit supported switch. Never silently invoke browser TTS in independent mode. If media fails after submission, preserve the original evidence; do not synthesize a new assessment result.

## 6. Durable state and evidence — D7 recommendation

Recommend **one additive `SessionAssessmentState` table**, rather than attempting to encode pre-answer support as an answer attempt or mutating `planSnapshot`. This is a proposed migration, not permission to apply it. No backfill and no row for legacy sessions.

Table shape for the implementation plan:

- `sessionId UUID PRIMARY KEY`, `learnerId UUID`, composite ownership FK to `LearningSession(id, learnerId)` with cascade; `state JSONB NOT NULL`; `updatedAt`.
- `state.version = 1`; `activities` keyed only by bound selected activity UUIDs, each containing `effectiveMode`, enum `supportReasons`, `firstAttemptId: UUID|null`, `independentFinalAttemptId: UUID|null` and `disclosedGroupIds`.
- Reason enum: `practice_mode`, `accessible_mode`, `support_requested`, `feedback_released`, `related_content_exposed`, `prior_exposure`. No raw text/audio, diagnosis or provider payload in state.
- Group IDs and object bounds come from the immutable reviewed manifest; reject unknown versions/keys and missing required state. Preserve state for the lifetime of the session; deleting it while retaining the session must fail closed, never reset support.

Existing `ActivityAttempt.normalizedResponse` retains `answerIndexes` / `text` and gains server-owned `evidence`:

```ts
interface AttemptEvidenceV1 {
  version: 1;
  assessmentPolicyVersion: 'intermediate-comprehension-v1';
  assessmentMode: 'independent' | 'practice' | 'accessible'; // initial bound mode
  effectiveMode: 'independent' | 'practice' | 'accessible';
  attemptIndex: number; // 1-based, this session/activity
  firstAttempt: boolean;
  independence: 'independent' | 'supported';
  supportReasons: readonly SupportReason[];
  answerChangedAfterFeedback: boolean;
  originalScore: number | null; // same 0..1 scale as stored score
}
```

Evidence is an immutable snapshot **before disclosure caused by this submission's response**. The first independent answer stays independent after its feedback is released. Mutable state governs later attempts and current disclosure capabilities. Duplicate/replayed responses preserve the original evidence and score; they never relabel that earlier answer using today's support state. Old attempts have absent evidence, rendered as unknown rather than independent.

For every new-policy submission, support action and answer-bearing content delivery, use a short transaction: lock the owned `LearnerProfile` row first, then the owned `LearningSession` row (`FOR UPDATE`), reload checkpoint/policy/state and prior matching exposure, check duplicate identity, evaluate/persist attempt, update support/finalization and advancement once, then commit. All new-policy disclosure writers use this order, serializing cross-session support and submissions for the learner. Do not assume the current submit transaction already provides this lock. Re-read mutable state inside the lock; do not use a stale pre-transaction session. Provider calls, file streaming and AI grading stay outside this transaction.

Concurrent distinct independent submissions: exactly one may close the independent cycle; any later accepted retry is supported. Concurrent support versus submission uses committed lock order: support first means supported answer; answer first preserves independent evidence then support affects future answers. A retry after advancement obeys existing checkpoint conflict rules; duplicate IDs still replay safely. Wrong activity/session reuse of an idempotency key is a conflict. Rollback of a failed transaction exposes no protected response.

## 7. Projection and support API

Introduce `POST /learning-sessions/:id/activities/:activityId/support` with `{clientSupportId: UUID, mode: 'practice'|'accessible'}`. It verifies ownership, bound activity, state and permitted transition under the locks above. A repeated support request is idempotent by monotonic state (client ID is not a proof of disclosure or a new log table). It returns the safe activity with updated capabilities only after commit. Changing practice to accessible is allowed; returning to independent is not.

One allowlist projector covers activity, session/plan/attempt DTOs, immediate/replayed submissions, evaluation polling, drafts, learner preview and errors. Session snapshots/manifest may contain private review data: public `plan` omits that data and carries only safe policy/capabilities. Never pass through arbitrary client response properties in new-policy DTOs; return validated answer fields, score, safe feedback and approved evidence only.

Before independent finalization, safe Listening DTOs omit transcript/script, answer/rationale/evidence, answer-bearing examples, alternate activity content, provider messages and storage keys. Required safe questions/options and Reading passages remain usable only as reviewed. Other activity GET routes cannot bypass disclosure by jumping ahead. If a route would disclose a protected group, omit it or require the explicit support action; do not serve first and record later. Ordinary allowed Reading exposure is recorded conservatively before returning its body, with `Cache-Control: no-store`; disable speculative prefetch for disclosure-bearing routes. Record delivery intent, not a claim that the user actually read the text. The manifest determines affected activities, including already delivered content under a different ID.

Policy/state cannot be inferred from UI controls, localStorage, request booleans, playback telemetry or absence of attempts. Missing state, unavailable required history or unknown policy produces a safe unavailable response, with no silent legacy fallback for an already-bound new-policy session.

## 8. Rollout, rollback and decisions

Proposed implementation owner: Codex, inline in the existing isolated worktree; one fresh final engineering reviewer. No merge, commit, push, paid provider or public release implied. Synthetic manifest/audio fixtures may test logic in disposable schemas, never activate fake audio as learner assessment.

| Decision | Proposed resolution in this document | Remaining gate |
| --- | --- | --- |
| D1 eligibility | Exact reviewed new-session cohort/manifest, no enrollment reassignment | Real IDs/content/history coverage before activation |
| D4 modes | Three initial modes, monotonic supported switch, server protection | Accepted for isolated implementation; real activation separate |
| D5 finalization | One complete accepted independent submission; supported correction retains current advancement | Accepted for this policy; mastery weighting remains W6 |
| D6 audio | Existing reviewed published artifacts only; safe failure/support path | Actual media QA and any provider spending separately |
| D7 persistence | Add one state table; additive attempt JSON, no legacy backfill | Approved in disposable test schemas; no public/preview upgrade |
| D9 scope/rollback | Isolated implementation/tests, disabled live selection | Direct approval recorded; commit/integration and activation separate |

Enable no live cohort until content/history/media gates pass. Rollback disables selection for new sessions; keep code, table and original policy semantics for bound sessions. Do not drop the table or rewrite snapshots/scores. Missing-state recovery requires retained state/backup or a supported-only recovery with an explicit operational decision, never invented independence. The existing local preview stays available; no restart/data upgrade is needed to deliver this design.

## 9. Acceptance matrix and non-goals

| Boundary | Required evidence in the existing plan |
| --- | --- |
| Safe content | All learner routes serialized without protected facts; other-activity and paraphrase bypass cases |
| Initial/changed mode | Client injection rejected; explicit supported switch durable before first attempt and across restart |
| First independent answer | Partial input rejects; complete first answer finalizes once; later assisted perfect answer does not replace it |
| Concurrency/idempotency | Two submissions, support/submit and two sessions serialize; one first attempt, stable replay, no duplicate advancement/mastery |
| History | Same-version, related-version groups and unknown legacy family exposure fail closed; different reviewed facts remain eligible |
| Audio | Reviewed artifact succeeds; fake/corrupt/missing returns safe error; independent never invokes browser speech |
| Accessibility | Practice/accessible transcript and replay usable by keyboard/screen reader; no raw-score penalty |
| Compatibility | Legacy resume/audio policy, five durations, placement isolation, pending grading and version bindings preserved |
| Rollback | Flag stops new selection; bound sessions retain policy/state; missing state cannot become legacy |

Non-goals: planner v2, workload calibration, new B1 admission/path activation, real audio generation/publication, free-speaking executor, telemetry ingestion, attempt retention redesign, mastery/STABLE/checkpoint weighting, human CEFR certification, controlled/public pilot. No new package, service or cloud dependency.
