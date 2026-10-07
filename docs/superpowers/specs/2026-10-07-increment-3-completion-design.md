# Increment 3 completion design

## Scope and existing work

Complete the approved Increment 3 roadmap on local PostgreSQL and responsive web. Preserve and review the existing uncommitted Task 16 changes. Existing mastery events, deterministic scheduler and error evidence remain the source of truth. No provider calls or invented speaking/writing scores.

## Session selection and transfer

Use the learner's persisted current level (default FOUNDATION_1). Select published missions deterministically: preserve scheduler priority for due/weak Language Blocks, prefer a different workplace document context for that item, then an uncompleted mission, then normal ordered curriculum. A context is content type plus whitespace-normalized document text; slug/version changes alone are not a new context. Match the stable Language Block ID and the skill. Never add an activity to multiple blocks or fabricate questions. If no new context exists, retain same-context review and expose that limitation rather than claiming transfer. Only review items included in the frozen plan are recorded, with transfer/fallback metadata. Sessions retain their original lesson version.

## Checkpoint and reinforcement

Policy `workplace-checkpoint-v1` uses score >= 0.7 separately for all four skills, all published missions at the current level completed, and evaluated mastery for all Language Blocks required by activities for each skill. A checkpoint explicitly evaluates a completed mission session: server reads its immutable plan and latest attempts, never client scores. The first evaluated attempt per activity is the checkpoint score, so repeated answer retries cannot erase a weak assessment. Any missing or submitted/unscored evidence produces `pending_evaluation`; known weak evidence creates reinforcement actions even while other skills await evaluation. Persist the assessment's per-skill evidence, policy, source session/version, status and reinforcement snapshot. Idempotent request UUIDs; cross-user, incomplete or wrong-level sessions are rejected. Reassessment after provider evaluation uses a new request UUID and never rewrites the original snapshot.

Incomplete curriculum/mission prerequisites produce `not_ready`, with readiness reasons and reinforcement shown separately. At this increment, a mission's first eligible published lesson is its playable unit; later linked lessons are not selected and cannot grant advancement or introduce unreachable mastery requirements. This matches the current session selector.

Only `passed` with every prerequisite met can unlock the immediate next level on the same path with published playable content, and advancement requires learner confirmation. No next content means successful current-level completion without a fabricated unlock. Confirm is transactional, idempotent, rechecks current curriculum prerequisites and cannot downgrade or skip a level. Speaking/writing remain pending until Increment 4 provides actual evaluated evidence.

## Learner APIs and UI

- `GET /learning-sessions/availability`: same mission selection as creation, five supported durations, only content-backed durations enabled.
- `GET /me/mastery-map`: `{ items: [{ languageBlockId, slug, canonicalForm, meaning, skills: { reading, listening, speaking, writing } }], reviewQueue }`. Each skill is null when unassessed, otherwise `{ state, score, confidence, nextReviewAt, lastEvidenceAt }`; queue contains stable block ID, skill, priorityReason and ISO nextReviewAt/null. Include only learner's current published curriculum blocks and their own evidence.
- `GET /me/progression`: `{ currentLevelCode, nextLevelCode, eligibleSessionId, canAssess, reasons, latestAssessment }`.
- `POST /me/checkpoint-assessments`: `{ sessionId, clientAssessmentId }` returns `{ id, sessionId, levelCode, policyVersion, status, createdAt, skills, reinforcement, canAdvance, nextLevelCode }`. Skills contain `{ score: number|null, threshold: 0.7, pendingCount, evaluatedCount, passed }`. Reinforcement contains `{ skill, languageBlockIds, reason, action }`.
- `POST /me/checkpoint-assessments/:id/confirm`: returns progression summary; checks ownership and policy decision.

Dashboard supports all durations with server-authoritative availability (including empty list), distinct repeated block occurrences, Memory Health and Mastery Map, filtered/paginated Error Bank, checkpoint result and actionable reinforcement. Show unavailable/unassessed/pending honestly, with loading, retry and empty states. Responsive keyboard-accessible UI follows existing styling.

## Verification

TDD for transfer selection and four-skill checkpoint policy. Integration tests for ownership, idempotency, immutable version, pending speech, weak skill, level confirmation and review recurrence with injected clock. Desktop/mobile Playwright journeys cover duration selection, reload/resume, mastery/error display and pending checkpoint. Full `pnpm verify`, independent code review, fixes and local demo startup form the final gate.
