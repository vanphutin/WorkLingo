# IELTS Phase 2 — Learner program enrollment

Status: Design approved by the user on 2026-10-12. Implementation complete; final review and verification in progress.

## Outcome and constraints

Persist a learner's enrollment and active program so future IELTS learning can have independent progression. Preserve existing Intermediate learning, onboarding, session checkpoints and published lesson versions. Run focused checks per implementation slice; run the complete verification gate once before integration.

Phase 1 introduced LearningProgram above LearningPath. Its spec explicitly deferred enrollment. Current session availability, mastery-map and progression services still read the global LearnerProfile.currentLevelCode. Merely adding an active-program selector would leave these services using another program's level.

## Approach

Use a relational LearnerProgramEnrollment and a nullable activeProgramId on LearnerProfile. Introduce one ProgramContextService responsible for resolving learner, program, enrollment and current level. Consumers obtain context through that service rather than independently interpreting profile fields.

Alternatives considered: a profile-only activeProgramId is smaller but cannot retain each program's level; a JSON map of program progress avoids a table but loses relational validation and safe concurrent updates. A relational enrollment provides explicit uniqueness and predictable transactions.

Intermediate remains the only selectable program in this phase. IELTS stays IN_DEVELOPMENT. Program availability alone never establishes exam readiness or B2 proficiency. IELTS admission and calibrated four-skill assessment require a later capability before its selector can be enabled.

## Data model and compatibility

LearnerProgramEnrollment contains id (UUID), learnerId (User UUID), programId (LearningProgram UUID), currentLevelId (nullable Level UUID), revision (integer starting at 1), createdAt and updatedAt. Enforce uniqueness of (learnerId, programId), index programId, cascade learner deletion and restrict program/level deletion. Service writes validate that the selected level belongs to the enrollment's program.

LearnerProfile.activeProgramId references LearningProgram and remains nullable before onboarding. LearnerProfile.currentLevelCode stays as a compatibility mirror for Intermediate; it must never be used as an IELTS placement result. ProgramContextService is authoritative after this phase.

An additive migration enrolls existing COMPLETE profiles into Intermediate, resolving their existing currentLevelCode to its Intermediate level and preserving that level even if subsequently archived. Abort migration if a COMPLETE profile has an unresolved or foreign-program level; do not silently reset progress. Leave PENDING profiles without active context. Backfill does not modify session or assessment records.

Self-placement and placement confirmation create/update the Intermediate enrollment, set activeProgramId and complete onboarding in the same transaction. New registrations remain PENDING. Onboarding retries preserve existing idempotency behavior.

## API and transactions

Add learner-only authenticated GET /me/program-context returning { activeProgram: null | { id, slug, name }, enrollment: null | { id, revision, currentLevel: null | { id, code, name } } }. PENDING learners receive null context. A COMPLETE learner with inconsistent context receives 409 PROGRAM_CONTEXT_INVALID; do not fabricate defaults.

Add learner-only authenticated PUT /me/program-context accepting strict { programSlug, expectedRevision }. expectedRevision is the current active enrollment revision, or null before context exists. Activation and any enrollment creation occur atomically. Repeating activation of the same valid active program at its current revision is a no-op. Stale revision returns 409 PROGRAM_CONTEXT_STALE with no writes. Serialize same-learner changes using a transaction-level learner/profile lock.

Reject PENDING learners with 409 ONBOARDING_REQUIRED, unknown/disabled programs with 404 PROGRAM_NOT_FOUND, and non-selectable programs with 422 PROGRAM_UNAVAILABLE. Reuse the server access policy from Phase 1; changing a database status alone must not open IELTS. For this phase, activation uses the learner's existing Intermediate enrollment and requires a valid current level. Responses contain only the caller's context. Emit existing safe audit metadata containing stable IDs and revision only.

Export strict shared schemas and inferred DTOs in the contracts package. The client never supplies learnerId, levelId, destination or assessment results.

## Learning boundaries

ProgramContextService resolves context in the caller's transaction where a mutation needs a consistent view. Session availability and new ordinary sessions select missions by both resolved level and program, with published level/path requirements. Add explicit program scoping to curriculum lookup; retain existing placement mission behavior until a program-specific placement capability exists.

Session reads, checkpoint resumption and activity submissions continue to use the session's immutable mission/lesson-version relationship and ownership. Existing sessions remain resumable irrespective of later active context. Do not rewrite historical sessions when context changes.

Mastery-map reads use the resolved program's curriculum language blocks. Historical evidence remains tied to its existing activity/block identity. Progression assesses and advances the session's program enrollment; a session outside active context can still be resumed but cannot advance the active program. Reject assessment/confirmation context mismatch with 409 PROGRAM_CONTEXT_MISMATCH.

Advance enrollment.currentLevelId with a conditional revision update in the same transaction as confirmation. Increment revision on advancement. For Intermediate, update the legacy profile level mirror atomically. Next-level selection stays within the same published path/program and retains current prerequisites.

## Learner UI

Reuse the existing program cards and styles. Load catalog and context in parallel. Show an accessible active-program label. For selectable Intermediate, activation completes before navigating to /dashboard. Disable repeated submission while pending; preserve the card on recoverable errors and provide retry. On stale context, reload context and ask the learner to retry the activation rather than silently overwriting state.

Keep unavailable IELTS/TOEIC/Beginner buttons disabled. Ensure activation works by keyboard and on mobile. Dashboard displays the active program returned by the server. Preserve existing onboarding redirects and audio preferences.

## Verification seams and acceptance

1. Migration integration: COMPLETE backfill preserves exact level; PENDING stays null; invalid old level aborts without partial writes; historical session IDs/version bindings remain unchanged.
2. HTTP integration: authentication/role enforcement, context ownership, onboarded activation persistence, repeat no-op, stale/concurrent mutation, missing/disabled/unavailable targets and unchanged state after rejection.
3. Onboarding integration: both entry methods initialize the enrollment atomically; retry does not duplicate it.
4. Curriculum/session/progression integration: context selects the correct program, rejects cross-program level assignments, preserves resume after a context change and cannot advance an unrelated enrollment. Archived/unpublished current content returns the existing unavailable-content behavior without resetting progress.
5. Contract and UI tests: strict parsing, pending activation, retry, stale refresh, active label and unavailable controls. Desktop/mobile E2E: onboarding, activation, refresh persistence, create/resume existing Intermediate session, rejection of direct IELTS activation.

Use existing local PostgreSQL harness and fake providers. No new dependencies or live provider calls. Focused unit/integration/component tests and affected-package type/lint checks precede one final pnpm verify.

## Implementation order

1. Add schema, additive migration and migration rehearsal tests.
2. Add context contracts, resolver and GET/PUT HTTP behavior.
3. Connect both onboarding paths and program-scoped curriculum/session/mastery reads.
4. Move progression writes to enrollment with compatibility mirror and concurrency checks.
5. Connect catalog/dashboard UI, prove desktop/mobile journeys and update architecture/API docs.
6. Review the branch, run final verification and integrate under the existing authorized Git workflow.

## Deferred capabilities

IELTS content, IELTS question taxonomy, band scoring, mock exams, B2 admission, new program activation policies and program metadata administration require separate designs. This phase must not advertise IELTS learning as available.
