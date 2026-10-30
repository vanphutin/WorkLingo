# R2 Full Learning Program & Progression Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. One implementer at a time, task review plus final independent review.

**Goal:** Deliver safe program releases, enrollment administration and deterministic evidence-backed learning progression end to end.

**Architecture:** Extend the existing modular monolith with release snapshots, enrollment history, progression projections and review history. Existing curriculum, session/evaluation and vocabulary services remain authoritative.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod, Next.js/React, Vitest and Playwright.

**Spec:** docs/superpowers/specs/2026-10-30-r2-full-learning-program-platform-design.md

## Global Constraints

- Published releases and curriculum snapshots are immutable.
- Existing learners remain bound to their enrolled version.
- Completion, mastery and readiness are separate; absent evidence stays unknown.
- Primary DB is read-only; all migrations/mutations use disposable schemas.
- Beginner A1–A2 vocabulary is permitted; source IDs/CEFR/provenance are preserved.
- Production deployment and provider/human qualification are excluded.
- Preserve canonical Beginner and IELTS gates and EvaluationService.

## Review Focus

- Archiving authoring hierarchy must not hide an enrolled release.
- Duplicate enrollment and concurrent commands must not overwrite revision pins.
- Foreign/unpublished references and invalid prerequisite order fail closed.
- Missing or unqualified AI evidence cannot become mastery.
- Analytics must not leak learner identity or cross-program counts.

### Task 1: Release contracts and persistence

**Files:** `packages/contracts/src/program-platform.contracts.ts`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261030000200_r2_full_platform/migration.sql`, `apps/api/test/integration/r2-full-platform.integration.spec.ts`.

**Interfaces:** `programVersionInputSchema`, `programVersionSchema`, `programPolicySchema`; ProgramVersion, ProgramVersionCurriculum, EnrollmentEvent, ProgressionSnapshot, ProgramReview models.

- [ ] Write failing strict-contract tests: unknown fields, duplicate pins, cyclic/order refs, invalid thresholds and review intervals.
- [ ] Run contracts test, confirm missing exports/validation failure; implement schemas with bounded inputs.
- [ ] Add additive schema/migration including nullable enrollment version ID/status and compatibility backfill for existing generic pins. Preserve legacy enrollment IDs and evidence.
- [ ] Run Prisma validation/generate against explicit disposable config; integration test creates/readbacks version and history and checks foreign keys/indexes.
- [ ] Commit explicit files after diff/typecheck checks.

### Task 2: Program release and enrollment use cases

**Files:** `apps/api/src/learning-programs/application/program-versions.service.ts`, `program-enrollments.service.ts`, controllers/module, existing `admin-programs.service.ts` and `program-context.service.ts`.

**Interfaces:** createDraft/saveDraft/transition/preview/listVersions/duplicate/archive/rollback; assign/transition/listMine/listAdmin/history. All commands carry actor ID, expectedRevision and idempotencyKey; assignment pins exact version.

- [ ] Add one API behavior test at a time for draft→review→approve→publish, edit denial, unauthorized service caller, stale revision and idempotent replay.
- [ ] Implement authorization inside service transaction plus controller roles, shared actor/profile/program locks, receipts and atomic audit/events.
- [ ] Test assignment, self-enrollment, suspend/reactivate, completion/withdrawal, version mismatch, cross-user privacy and concurrent duplicate enrollment.
- [ ] Run focused isolated API tests and legacy program tests; commit.

### Task 3: Deterministic progression and review

**Files:** `apps/api/src/learning-programs/domain/program-progression.ts`, `program-review.ts`, application projection service; existing curriculum eligibility/progress and learning-session selection.

**Interfaces:** `projectProgramProgress(snapshot,evidence,now)`, `scheduleProgramReview(policy,history,now)`; application getProgress/recalculate/history/reviews. Projection contains completion/mastery/readiness, stages, items, workload and nextAction.

- [ ] Write failing pure tests for two sequential units, explicit prerequisites, incomplete/pending mastery, review requirement, retry/remediation, deterministic ties and resume priority.
- [ ] Implement pure rules; test exact dates for review algorithm version, bounded configurable intervals and history.
- [ ] Test pinned release after hierarchy archive and unchanged enrollment after republish through authenticated API.
- [ ] Bind session start/selection and projectSession to pinned release eligibility; record completion, review and progression snapshots without accepting client scores.
- [ ] Verify R2 unqualified AI evidence stays pending while deterministic reading/listening can contribute. Run mastery/Beginner/IELTS regressions; commit.

### Task 4: Analytics and vocabulary authoring integration

**Files:** `apps/api/src/learning-programs/application/program-analytics.service.ts`, platform contracts/controller; existing vocabulary library service/client.

**Interfaces:** aggregate(programId,{from,to,versionId?}) with bounded UTC range, definitions, version/stage/lesson/skill/review/assessment aggregates; authoringOptions(programId) with exact revisions and existing vocabulary references.

- [ ] Add failing DB/API tests for half-open date boundaries, counts across versions, empty evidence and program isolation/privacy.
- [ ] Implement database aggregates/indexes and bounded detail paging; preserve existing pilot analytics.
- [ ] Test real lexical/sense IDs and source/CEFR provenance selection, duplicate associations and invalid references without modifying vocabulary master records.
- [ ] Run focused tests/typecheck; commit.

### Task 5: Admin and learner UI

**Files:** existing `features/admin-learning-programs/`, new program-platform components/client; existing curriculum workspace/roadmap/catalog; EN/VI messages.

**Interfaces:** typed platform client matching Tasks 1–4. UI consumes authoritative projection, never computes unlocks or mastery.

- [ ] Write failing component tests for version forms/lifecycle, revision selector order, enrollment controls, loading/error/stale state and unknown mastery.
- [ ] Implement accessible responsive Liquid Glass panels with curriculum authoring links, vocabulary selection/provenance, release preview and version analytics.
- [ ] Add enrolled-programs/progress/reviews/recommendation/resume display; preserve old dashboards for legacy enrollments.
- [ ] Run component tests, i18n/typecheck/lint and production build; commit.

### Task 6: Actual qualification, review and integration

**Files:** `apps/web/e2e/r2-full-learning-program-platform.spec.ts`, isolated runner/config, canonical architecture/decisions/roadmap, `docs/qualification/r2-full-learning-program-platform-final-report.md`.

- [ ] Run disposable DB migration/backfill tests and real Admin authoring→publish→Learner discovery/enroll→activity completion→unlock→pause/reload/resume→analytics→new version journey.
- [ ] Check desktop/tablet/mobile overflow/accessibility and retained browser evidence, synthetic participant/provider limits explicit.
- [ ] Run safe full API/Web/shared/root regression, lint/typecheck/build, mandate validate and diff/secret checks.
- [ ] Obtain fresh independent whole-branch review and fix actionable findings with failing regression tests before fixes.
- [ ] Record actual commands/results, every commit, starting/final hashes, deferred qualifications and gates. Update mandate through real tooling.
- [ ] Merge and normal push only after required engineering gates; verify remote SHA. No deployment.
