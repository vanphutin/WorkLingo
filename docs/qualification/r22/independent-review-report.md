# R2.2 independent engineering review

Reviewed 2026-11-07 by a fresh-context independent agent (`cx/gpt-6-astra`, high reasoning), against the mission, design, plan, ledger and actual branch diff from baseline 66af136. This is an independent code review by an AI agent, not human assessment validation. HUMAN_VALIDATED: NOT_RUN. AI_QUALIFIED: BLOCKED.

The review evaluated correctness, readability, architecture, security and performance, including exact context pins, concurrent ownership, private feedback, acoustic evidence and legacy compatibility. Original verdict: **With fixes, pending final verification**. No Critical finding. The coordinator accepted all six Important categories and fixed them in one review remediation pass; final suite receipts are in test-execution-report.md.

| Important finding | Resolution and regression evidence |
|---|---|
| Empty/out-of-bounds text evidence could support a score | Enforce nonempty bounded spans and quote equality. Observed RED then GREEN in scoring tests. |
| Evidence IDs could carry private answer text into public results | Remap retained public evidence and criterion references to opaque evidence-N IDs. Observed RED then GREEN. |
| Long valid objective answers exceeded evidence contract limits | Bound generated quote and matching span to 1,000 characters. A 1,001-character accepted answer reproduced RED, then GREEN. |
| Semantic agreement could override objective answers | Independently require exact objective correctness for mixed tasks. Regressions cover wrong choices, auxiliary semantic criteria and 9/10 answers that round to level 3. Each reproduced RED before fix. |
| Source authoring could not publish the new comprehension formats | Extend the existing DSL/parser/validator/normalizer and Foundation metadata. Eleven format tests pass. Actual Admin source validation/audio/publication to immutable snapshot, learner projection/submission and semantic Reading/Listening assessment passes through six localhost HTTP fixture calls. |
| Stale recovered worker removed its replacement's cancellation controller | Finally removes the map entry only if it still owns that controller. Deterministic actual-DB regression observed three unexpected calls after cancellation (expected 3 total, received 6), then GREEN. All six recovery tests pass. Earlier HTTP barrier timeouts were inconclusive and are not claimed as valid RED evidence. |

The independent reviewer ran 47 targeted API tests, another 16 history/orchestration/legacy compatibility tests, 45 frontend tests, 11 content-format tests and a final nine-test orchestration check. A temporary isolated acoustic-guard mutation caused two expected test failures; original source was restored. The reviewer inspected database/browser/build receipts but did not independently rerun those complete gates. Root subsequently ran the final suites listed in the execution report. No second review is claimed; regression proofs and full suites verify the remediation.

Minor documentation discrepancies about polling, replay after unavailable source audio, migration rehearsal and adjudicator wiring were reconciled. No deferred code-polish finding was requested by this review.

## Matters reserved for the coordinator

| Reviewer declined to judge | Coordinator ruling and consequence |
|---|---|
| Actual accuracy, accent fairness, calibration, psychometric validity | BLOCKED: no actual-model benchmark proves the mission thresholds. Local fixtures establish engineering behavior only. Wrongly enabling a policy would risk misleading scores, so qualified policies remain empty. |
| Account quota, endpoint privacy, production activation | Unverified. External semantic assessment remains disabled by default; no purchase/top-up/limit increase or real learner transmission occurred. |
| Human validation | NOT_RUN; no participants, consent study or expert validation fabricated. |
| Production deployment | NOT_DEPLOYED: target/configuration/backup/health/rollback gates were not established. |
| Final remote integration | Coordinator-owned Git gate; consult commit-inventory.md and final-acceptance-report.md for actual outcome. |
| Restored R2.1 journey | Required guarded regression is recorded separately in the execution/acceptance receipts, never inferred from fixture or unit success. |
| Unsupported acoustic dimensions | Explicitly unscored. Transcript confidence/alignment cannot establish pronunciation or intelligibility. Missing mandatory dimensions keep total null. |

## Architecture and operational limitations

AssessmentHistoryService extends the existing TeacherAiModule, provider port, attempt identity, storage and speech jobs while leaving legacy EvaluationService/results intact. This division preserves legacy scoring semantics rather than forcing 0–100 results into 0–1 records. Recovery requires replay of an expired idempotency key; no scheduled recovery worker is asserted. POST awaits provider execution despite HTTP 202. History is bounded to 50 records and mastery to 500, without a complete archive export. Restrictive immutable history requires a separate production erasure policy. These are documented limits; production activation cannot be inferred from an engineering merge.
