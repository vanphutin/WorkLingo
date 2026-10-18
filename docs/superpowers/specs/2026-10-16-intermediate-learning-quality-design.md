# Intermediate learning quality — consolidated proposal

**Date:** 2026-10-16 (Asia/Saigon)
**Status:** Human-reviewed on 2026-10-16; W0 baseline, advisory W3, bounded W4 authoring and W2 isolated assessment implementation have direct scoped approvals. D1 additive B1 direction is D-036. W2 migration is authorized only in disposable test schemas; cohort activation and public/preview upgrades remain separate gates. See [approval boundaries](../../../mandate/reports/2026-10-16-intermediate-approval.md) and [W2 execution evidence](../../../mandate/reports/2026-10-16-intermediate-assessment-integrity.md).
**Mandate:** `MND-20261015-001` (reuse; do not allocate a duplicate).
**Source:** [Full user-supplied consolidation](../../../mandate/reports/2026-10-16-intermediate-consolidated-source.txt), dated 2026-10-15.
**Canonical backlog:** [Increment 5](../../IMPLEMENTATION_ROADMAP.md#increment-5--admin-quality-và-pilot-readiness).

## 1. Intent and authority

Make program level, content, planned workload and assessment evidence agree. Success means independent comprehension, transfer and delayed retention with acceptable abandonment, not longer screen time or more questions alone. Learners need honest evidence; authors need actionable quality feedback before publishing.

The human selected option 2, “Chuẩn hóa báo cáo thành mandate và kế hoạch thực hiện”, then accepted the delivered package with “duyệt” on 2026-10-16. W0 may proceed against the configured local environment with read-only inventory and disposable-fixture verification. Codex coordinates W0; downstream human policy/review owners and sprint remain unassigned. The user delegated an evidence-backed D1 recommendation and accepted it with a second “duyệt”; D-036 records the additive B1 direction. Program/enrollment mutation, W3 timing configuration, assessment policy, public-schema migrations, provider use, publication and pilot remain subject to their gates.

This is a consolidation, not a fresh audit of all claims. S1–S4 are reports described in the supplied text; their original files were not supplied independently. Preserve their attribution without treating four reports as four independent reproductions.

## 2. Evidence boundary and corrections

The [normalization report](../../../mandate/reports/2026-10-16-intermediate-normalization.md) records revision, dirty state, static references and limits. Direct static observations at `efa2fd99b5373a644a011af3787bf81f737a51a7`:

- `session-planner.ts:188` selects counts by block occurrence; Respond retains at least two. This is not unconditional `splice(1)` and unused activities are not deleted from the lesson.
- `learning-session.contracts.ts:30` fixes `targetMinutes` to 15; this is a plan label, not measured active time.
- `learning-sessions.service.ts:187` returns referenced content to the learner. Question answers are omitted from the question projection, while referenced text is retained.
- `listening-activity.tsx:57` derives transcript text and renders it before submission; browser speech consumes that text.
- `learning-sessions.service.ts:544` returns missed explanations on incorrect comprehension attempts and advances on a perfect score. That alone does not prove final checkpoint/mastery always passes.
- `normalizer.ts:180` emits one question for an authored comprehension activity. The curriculum snapshot schema already accepts question arrays; authoring and runtime are different boundaries.
- `session-planner.spec.ts:39` explicitly expects all five durations for the expanded fixture. This is a test assertion read, not a test run or live endpoint result.

The old mandate's “5 questions” and “3–7 minutes” are superseded. The source reports 5 selected activities / 5 MCQ / 3 open tasks for its particular fixture; recount at the execution revision. All estimates of actual session time, overlap percentages and pilot thresholds remain hypotheses. Published Admin content, live CEFR inventory, flags, audio provenance and learner performance remain unknown.

## 3. Non-negotiable compatibility constraints

- Preserve published/archived LessonVersion, rubric, admission and historical mastery evidence.
- Preserve IN_PROGRESS/PAUSED session snapshots and their original version bindings.
- Preserve enrollment, activeProgramId and currentLevelCode semantics; no implicit learner reassignment.
- Keep supported durations 45/60/90/120/150, targetMinutes=15, canonical ordering, four-skill coverage, unique activity IDs and final Respond.
- Preserve Format 1.0/1.1 parsing and legacy plan parsing/resume.
- Keep review scheduling, prerequisites, transfer preferences and skill-specific evidence.
- No filler, repeated IDs, runtime AI question generation or forced waiting to fill a time label.
- Keep modular monolith, local storage and provider adapters; no new service or mandatory cloud dependency.
- No new provider calls, schema migration or telemetry ingestion endpoint without scoped approval.
- Record aggregate/redacted evidence only; no raw learner text/audio, scripts, credentials or provider payloads in logs.

The source proposes stricter assessment handling than accepted D-023/D-024 transcript fallback/browser speech. Update that policy only for an explicitly approved mode/version. Existing practice and accessible playback must remain usable. D-021 currently exposes `INSUFFICIENT_CONTENT_FOR_DURATION` and `availableDurations`; do not silently replace that response with a new error name.

## 4. Proposed architecture and alternatives

**Recommended sequencing (author's recommendation, not human approval):** inventory and policy decisions → assessment integrity and read-only workload visibility → reviewed B1 content/authoring → planner shadow mode → evidence/telemetry → controlled pilot → optimization.

Reuse the current planner for legacy sessions. A pure profiler derives counts, context cost and duration readiness without modifying snapshots. Admin displays warnings and unknowns. A separately versioned planner may later select multiple activities/items using deterministic scoring and hard invariants. Required content shortages stay visible; no automatic duplication.

For pedagogical design use Same Objective – Different Context – Higher Cognitive Demand. Activate retrieves prior learning; Reading includes purpose, inference and next action; Listening asks for information unavailable in Reading; Respond transfers into a third situation through speaking/writing. Shadowing supports pronunciation rather than replacing productive transfer. A common topic or Language Block is allowed; leaking the answer is not.

Three product alternatives remain open: build genuine B1/B2 paths; relabel the present Foundation content accurately; move Foundation under Beginner. The smallest engineering alternative is warnings-only profiling with no planner/assessment change. Merely increasing question counts is insufficient, and hiding transcript with CSS leaves the API exposure unresolved.

## 5. Work packages and dependencies

| Package | Deliverable and boundary | Source backlog | Prerequisites |
| --- | --- | --- | --- |
| W0 Baseline | Redacted inventory, exact counts, five-duration behavior, version/audio provenance, governance baseline | P0-01, P0-07 | Explicit execution/data scope |
| W1 Program/content policy | Named mapping decision, CEFR taxonomy/validator, learner-safe transition design | P0-02 | W0; product owner |
| W2 Assessment integrity | Server-authoritative modes, transcript protection, feedback timing, first-attempt/support evidence | P0-03, P0-04 | W0; D1/D4/D5/D6 below; reviewed session-wide content separation for independent eligibility |
| W3 Workload visibility | Read-only profiler, duration readiness and Admin warnings; proposed deficit diagnostics | P0-05, P0-06 | W0; configuration review |
| W4 Content/authoring | 1–2 expert-reviewed B1 pilot lessons; optional Format 1.2 multi-question metadata; linter | P1-01, P1-02, P1-03, P1-05 | W1; author/reviewer capacity |
| W5 Planner v2 | Pure deterministic selection, optional contract fields, shadow comparisons, pilot-only flag | P1-04 | W3/W4; decision D3 |
| W6 Evidence/audio/telemetry | Attempt evidence, mastery/checkpoint policy, validated audio and calibrated active-time model | P1-06, P1-07, P1-08 | W2/W4; D5–D8 |
| W7 Controlled pilot | Content-controlled comparison; retention/transfer/abandonment and rollback | P1-09 | W5/W6; named release approvals |
| W8 Evidence-led extension | Adaptive branches, item analytics/exposure, calibration, broader B1/B2 and debt cleanup | P2-01–P2-05 | W7 evidence; renewed design/approval |

W2 and W3 are separately reviewable. W4–W8 are phase briefs, not executable permission. Write subsystem designs and detailed plans after their decisions are resolved; preserve this dependency graph and the canonical roadmap instead of starting a second sprint board.

## 6. Proposed workload contract

Distinguish activities, MCQ items and open response prompts. Count each shared context once within the budgeted block; deduplicate by content identity, not “text hash differs therefore independent”. Estimate context reception, question processing, production, feedback, reflection and transitions separately. Audio duration can be unknown; never turn unknown audio duration into zero or claim calibrated timing without data.

Initial priors are versioned configuration, not CEFR facts. Return `calibrated=false`; include configuration version, assumptions, unknown measurements and per-component seconds. Do not fix 12/15 minutes, recall timing, reading WPM, cognitive ratios or ±15% tolerances as product law. A block may be structurally playable but have unknown or inadequate estimated workload.

Later planner v2 scoring can combine due review, mastery gap, objective fit, novelty, cognition and context diversity, with duplication/guessability penalties and stable tie-breaks. A hard invariant failure is never traded off for score. Keep `activityIds`; add `itemRefs` only after defining stable identities and legacy consumption. Plan v2 only affects new sessions; flag rollback does not rewrite v2 sessions already created.

## 7. Assessment and evidence policy proposal

W2 planning refinement (2026-10-16): the user authorized completing a [concrete policy design](2026-10-16-intermediate-assessment-policy-design.md) and updating the existing conditional plan. It proposes one complete accepted independent submission, supported correction with unchanged advancement, private reviewed manifests and one additive support-state table. These details remain proposed, not accepted product/migration decisions; this paragraph does not change the mandate approval hash or activate a cohort. For the bounded review package the concrete policy refines the open alternatives below.

Define separate assessment, practice and accessibility modes bound server-side to the new session, never selected by an arbitrary request field. Before a finalized independent listening assessment, sanitize every learner-visible text channel, including content, Language Block examples, explanations, draft/attempt responses and error bodies. Hiding one transcript component is insufficient.

**Recommended eligibility rule for D4 review:** independent listening additionally requires a reviewer-confirmed, version-bound check of the entire session's Reading–Listening facts/answers, either on existing content during W0 or on W4 content before activation. W2 may be implemented before W4, but independent mode must remain unavailable for unreviewed content. Prior reading, transcript or answer-bearing exposure in the same session cannot be undone by a later sanitized DTO: consult durable disclosure state, classify that evidence as supported and never label it independent. Same IDs and paraphrased facts with different text hashes both need regression cases; no hash-only eligibility shortcut.

Assessment uses an appropriate published media artifact; browser speech requires text and cannot provide transcript secrecy. Fake/tone audio does not establish valid comprehension assessment. Missing playable real media blocks that independent mode with a clear retry/support path; it must not silently reveal the transcript or strand a learner. Practice and accessible modes retain text support and replay. A11y support changes the evidence label, not a punitive score multiplier.

Define the finalization boundary, wrong-answer feedback, retry/variant behavior, permitted hints and scoring evidence before implementation. Store server-derived attempt index, first-attempt, mode, hint/transcript support and original score with idempotency. `ActivityAttempt` currently has rawResponse and normalizedResponse JSON, not a generic metadata column: review a versioned normalized evidence envelope before choosing a migration. Concurrent requests must have one stable first attempt; client support claims are not authoritative.

Separate completed, correct, independent and stable. Pending speaking/writing evaluation is not mastery. Keep existing mastery/checkpoint policies until a named assessment decision authorizes new weighting, spacing/context requirements and policy version. Do not backfill old attempts as unassisted or rewrite historical scores.

## 8. Content, quality and Admin acceptance

- W4 supplies objective/prerequisite maps, skill-specific cognition and realistic distractors; a qualified reviewer confirms CEFR and transfer coverage for 1–2 pilot lessons.
- New format/metadata remains optional and additive; snapshot schema and authoring parser are tested independently. Preserve source errors and legacy parse semantics.
- Linter reports duplicate/guessable/trivial items, objective/level mismatch, cognitive imbalance, audio/workload mismatch and Reading–Listening answer overlap with item locations and repair guidance.
- Semantic/AI heuristics are advisory and require expert review. Hash comparison detects exact duplicates only. No paid provider requirement for linting.
- Admin reuses curriculum/content workspaces and ValidationPanel, shows four-skill counts, words, open tasks, context/audio provenance, cognitive distribution when available, estimates/unknowns and readiness per duration.
- Start with warnings. Structural existing blockers remain. New hard thresholds require calibration, false-positive review and an explicit policy decision; no mass blocking legacy lessons.

## 9. Decisions for the human owners

| ID | Decision and needed evidence | Blocks |
| --- | --- | --- |
| D1 | ACCEPTED 2026-10-16 as D-036: add genuine B1 path; preserve existing Foundation/enrollments; validate new-entry eligibility before activation | Direction resolved; W1 implementation and W2/W5 eligibility still need their scoped gates |
| D2 | User selected AI review on 2026-10-16; Codex authored/reviewed two candidates with rubric worklingo-b1-pilot-review-v1-draft, provisional CEFR and recorded revisions. See W1/W4 review report; this is not human certification. Audio QA and runtime/content release remain separate | W4 content activation still needs its technical/media/release gates |
| D3 | Define duration UX/net budgets and deficit behavior: warn, shorter recommendation or disable; calibrate priors | W3 enforcement, W5 |
| D4 | Define accessible/practice/independent modes and fair evidence labels; resolve D-023/D-024 conflict | W2 |
| D5 | Define assessment finalization/retry/hints, mastery/STABLE/checkpoint version and pending grading semantics | W2/W6 |
| D6 | Approve audio quality/provider/voices/cost limits and media failure policy | Independent W2, W6 audio |
| D7 | Approve JSON evidence versus migration, active-time events, retention and server trust boundary | W2 persistence, W6 telemetry |
| D8 | Approve warnings/error escalation using pilot false positives | W3 enforcement/W4 publish gate |
| D9 | Name implementation/review owners and authorize exact slices, data scope and rollback | Any implementation |
| D10 | Approve pilot design, sample-size justification, success/stop criteria and operations | W7 |

No decision is inferred from the source's sample numbers. D1 is resolved by direct human approval. D2 reviewer method is now selected as AI; the authoring slice is separately authorized in the approval record. D3–D10 and the remaining content/media/release conditions stay scoped to their dependent work. Unresolved decisions block the affected slice, not writing this proposal.

## 10. Verification and rollout proposal

Use meaningful red/green unit tests for new pure logic, DTO/service tests for all text paths, isolated PostgreSQL integration for first-attempt concurrency/version binding, RTL for mode-specific UI, and Playwright desktop/mobile plus axe/manual a11y. Five-duration regressions exercise actual plan creation, not just the availability helper. Preserve v1 sessions and non-pilot programs.

Before learner rollout compare v1/v2 in shadow mode. Store no extra learner raw data. Human content review, provider validation and release approvals remain separate from automated success. Pilot compares independent comprehension, Reading inference, productive transfer, delayed retention at 1/7/14 days, assisted dependency, satisfaction and abandonment, with predicted/observed median/P90 active time as diagnostics. Avoid attributing simultaneous content and planner changes to one cause.

Rollback disables new policy/planner selection for new sessions; resumes use their bound versions. Newly published content remains an immutable version. Schema/provider changes need their own reversible rollout decision. Expand adaptive/IRT/item-exposure work only when the pilot supports it.

## 11. Traceability and handoff

The [master plan](../plans/2026-10-16-intermediate-learning-quality.md) maps every source P0/P1/P2 row and C/P/F/L/M/A/O/G group, including the X01–X22 contradictions. It links two bounded subsystem plans. The source copy retains all original text; hypotheses stay in the report. This draft does not supersede existing accepted architecture decisions.
