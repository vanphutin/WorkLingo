# Beginner R2.1 access and assessment policy

Date: 2026-11-07. Result: Beginner follows the existing R2 published-release flow in transparent Beta mode.

## Cause and resulting behavior

Beginner was unavailable for several independent reasons: primary had no authored published release/curriculum, the availability policy excluded reserved Beginner, enrollment input rejected its slug, the UI chose legacy activation rather than R2 enrollment, and dashboard SQL omitted release evidence. Changing a catalog status alone could not fix these conditions.

Beginner is now selectable only with BETA/AVAILABLE status, ACTIVITY_COMPLETION policy, nonempty exact curriculum pins and a valid AUTHORED/PUBLISHED snapshot matching those pins. A status-only promotion remains closed. TOEIC remains unavailable; reserved program creation and duplication constraints remain. Existing Intermediate and IELTS readiness paths remain covered by regression tests.

Catalog, enrollment, context resolution and learner dashboard use the same release-aware policy. Authored Beginner activation issues the R2 enrollment POST, not legacy PUT activation. Enrollment pins the exact ProgramVersion and curricula; current enrolled pins are retained after later retirement/archive and do not silently follow a new release. Account role/status, owner checks, stale-revision errors and idempotency controls remain.

The catalog displays backend snapshot-derived counts and curriculum detail: 8 lessons, 64 activities, 32 objectives and 360 minutes. The summary uses one objective to stay readable; expanded detail preserves all objectives and the two-unit sequence. It exposes safe presentation metadata, not the private release snapshot. Admin's existing Beginner workspace links to the R2 Learning Programs workflow.

## Productive practice safety

Historical local automatic-grading result remains **REVISE / NOT_READY**. The 297 historical qualification decisions were preserved; no historical PASS was promoted to new source content or human qualification.

Beginner speaking/writing submissions persist as SUBMITTED with `score: null`; they do not enqueue evaluation/STT jobs. The learner sees an unscored-practice notice and typed-response fallback. The specialized recording route rejects Beginner before storage/provider work. Progression uses completion evidence, not fabricated mastery. Reading/listening keep their deterministic answer handling.

Learner projections remove private rubrics, model answers, listening transcripts and answer keys. A trusted projected practice marker drives the UI. Existing pinned task context, acceptable alternatives, stale evaluation-cache rejection and provider serializers remain tested independently in the dedicated network-denied evaluator suite (60 tests PASS). No external provider calls or spending were used.

## Verification

Backend R2 run: 186 files / 1,230 tests PASS, excluding the evaluator-context file that requires its own strict setup. Dedicated evaluator suite: 2 files / 60 PASS. Additional final presentation/dashboard/vocabulary scope: 3 files / 21 PASS. Contracts: 35 files / 178 PASS. Legacy integration: 6 files / 30 PASS. Placement/onboarding integration: 4 files / 20 PASS.

The real isolated API journey verifies enrollment replay, exact pins, all eight lessons, 24 owner-scoped audio responses, foreign access rejection, stale context errors, persisted completion/relogin and a completed review cycle. Browser evidence and the exact final runtime smoke are recorded in [learner journey](beginner-learner-journey-report.md).

Remaining qualification restriction: no claim of real-learner validation, human expert approval, pronunciation grading or production readiness. Beta publication is authorized by the user mission and is distinct from those external gates.
