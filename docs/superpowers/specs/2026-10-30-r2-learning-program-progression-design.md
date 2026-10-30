# R2 Learning Program & Progression — first vertical slice

Date: 2026-10-30. Baseline: 0f8b83acbc8ad79ec095f9c6c2384042dc2706f4.

## Intent and authority

The owner directly ordered continuous autonomous implementation in the current master mission (attachment SHA256 4ec19c27440a0fa5b6e2b363017a7dfdbc64409d100a6607692ef40d21cc6e6f). This is a bounded successor to the existing R1–R4 plan, not approval to open Beginner or deploy unqualified grading. Routine design/plan confirmation is superseded by that explicit delegation.

Deliver a real local Admin → Learner journey using the existing Program → Path → Level → Mission → Lesson hierarchy, immutable CurriculumRevision and LessonVersion, enrollment, sessions, attempts, roadmap and completion receipts. No duplicate curriculum system.

Beginner vocabulary may use sourced A1 and A2 items: A1 is the default foundation and A2 is allowed when the lesson objective and learner context justify it. The stored CEFR from the vocabulary master remains authoritative; the slice never relabels A2 as Pre-A1 or creates a master record for an authored grammar phrase.

## Builder decisions

Use the existing NestJS/Prisma/PostgreSQL backend and Next.js/React frontend. Add only additive database fields: LearningProgram.revision (1), progressionPolicy (MASTERY by default; ACTIVITY_COMPLETION for new R2 programs), curriculumRevisionIds (empty UUID array by default), and LearnerProgramEnrollment.curriculumRevisionIds (empty UUID array by default). Existing programs keep their current access and mastery behavior. No new dependencies.

Admin creates a draft program (IN_DEVELOPMENT, ACTIVITY_COMPLETION). Existing curriculum authoring attaches published lessons to program-owned paths/missions; Foundation publication pins exact LessonVersion IDs. Admin program publication accepts an ordered, unique nonempty list of published CurriculumRevision IDs from that program, validates published hierarchy, one bound published lesson per revision, required objective evidence, and all prerequisite references inside the selected set without cycles. It freezes that list on the program. New programs route to /dashboard only when AVAILABLE/BETA, ACTIVITY_COMPLETION and a nonempty published list. Reserved beginner/intermediate/ielts/toeic identities cannot be created or promoted through this new API. Beginner remains closed.

Admin commands require ADMIN role, strict shared schemas, optimistic revision and durable actor-scoped idempotency receipts, program row locking and atomic audit. Metadata create/update and publish/list APIs are accessible from a small existing-style Admin page. Publication must fail closed for foreign, archived, empty or multi-lesson bindings. Updating metadata cannot alter enrolled learners' curriculum pins.

Learner enrollment requires completed onboarding and available R2 program. It locks the learner profile and target program, checks expected active context revision, creates at most one enrollment per learner/program and copies the exact published revision list. It selects the first revision's level, activates context and increments revision monotonically when switching. Duplicate requests return the same enrollment without resetting progress. Historical enrollment pins survive program republication.

Roadmap/eligibility for pinned R2 enrollment uses its frozen revision list and exact prerequisites. Legacy empty arrays retain the existing latest-published policy. A learner can explicitly start a mission with expected curriculum revision, duration and client session UUID. Server checks active program, enrollment pin, availability and stale revision; cross-target idempotency reuse conflicts. Session creation serializes on learner profile. Resume uses frozen session pins.

R2 ACTIVITY_COMPLETION means required objective activity evidence was submitted in completed bound sessions, independent of score/mastery and provider status. Missing activity, foreign learner/version, placement and incomplete sessions never complete curriculum. Completion receipt policy is curriculum-activity-completion-v1. Existing MASTERY completion remains curriculum-objective-v1. Mastery projections remain separate; this slice never promotes unqualified Beginner AI scores. Exact prerequisite completion opens the next mission. Roadmap objective progress follows the program policy.

## Acceptance

An isolated PostgreSQL migration and real API journey creates an Admin program, creates/attaches/publishes two program-owned curriculum revisions with a prerequisite, publishes program, enrolls learner, sees available/locked roadmap, starts exact first lesson, persists attempts and completion, sees second unlocked, starts/resumes it, and reloads dashboard. Browser evidence exercises actual UI/API, not intercepted successful responses. Test unauthorized access, duplicate/concurrent commands/enrollment/start/completion, stale context/revision, foreign/archived bindings, missing evidence, and old pins after republication. All mutations remain on disposable fixtures, never primary DB. No paid provider calls.

## Constraints and rollback

Node >=20 <21; pnpm 10.34.1. No new dependencies. No primary DB writes, public Beginner access, evaluator qualification claims or deployment. Preserve unrelated main files and historical evidence. Migration is additive; rollback disables new program selection while retaining enrollments, versions, sessions and receipts. Tests use explicit no-env configuration and owned disposable PostgreSQL. API/Web/shared checks and independent review are required before safe integration of R2.

## Builder check decisions

Independent builder check completed in the current mission. Admin roles mean existing CONTENT_ADMIN and SYSTEM_ADMIN, never a nonexistent ADMIN role. Persisted ActivityAttempt evidence counts regardless SUBMITTED/QUEUED/PROCESSING/EVALUATED/EVALUATION_FAILED status or score, but only from COMPLETED LEARNING sessions bound to the exact revision/version/activity and learner. Every required objective evidence mapping needs an attempt; no mastery check in ACTIVITY_COMPLETION. The frozen plan must contain that activity.

Publication requires exactly one bound lesson per selected revision and one selected revision per mission; distinct revisions may reuse the same lesson version if valid program-owned attachments permit it. The ordered list defines roadmap display order; prerequisites define unlock order. Publication atomically replaces the program list and increments program revision. Metadata update cannot change slug or progressionPolicy. Archived pinned revisions remain visible as locked/unavailable for fresh starts; existing sessions remain resumable with frozen pins. No archive bypass is added.

Enrollment requires onboarding COMPLETE, so expectedRevision is a positive active-context revision; null cannot activate an onboarded existing context. Enrollment copies the target pin only when first created; replay never replaces it. Switching increments revision above both contexts; reenrolling the current active program is idempotent. New R2 qualification uses compatible legacy lesson content; generic programs do not bypass the Beginner-specific evaluator identity check.
