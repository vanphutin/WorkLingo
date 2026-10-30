# R2 Learning Program & Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver an isolated working Admin program publication → learner enrollment → pinned roadmap → lesson completion/unlock/resume vertical slice.

**Architecture:** Extend existing program, immutable curriculum revision and enrollment boundaries. Preserve legacy mastery policy; opt new programs into activity completion and immutable enrollment curriculum pins.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, Zod, Vitest and Playwright.

**Spec:** docs/superpowers/specs/2026-10-30-r2-learning-program-progression-design.md

## Global Constraints

Node >=20 <21; pnpm 10.34.1. No new dependencies. No primary DB writes, public Beginner access, evaluator qualification claims or deployment. Existing programs default to MASTERY. New R2 programs use ACTIVITY_COMPLETION. Preserve historical evidence and unrelated files. Use no-env tests and disposable fixtures only.

## Review Focus

- Concurrent enrollment/start must serialize and never reset pins or progress.
- Republishing a program must preserve old enrollment/session revision IDs.
- Required submissions count as completion without promoting scores to mastery.
- Foreign, archived, stale and multi-lesson revisions must fail closed.
- Admin/learner authorization and DTO privacy must hold for direct HTTP calls.

### Task 1: Program authoring, publication and enrollment

**Files:** schema.prisma, additive migration, packages/contracts/src/program-progression.contracts.ts and index.ts, apps/api/src/learning-programs/{application,domain,dto,controllers,module}; test/integration/r2-program-progression.integration.spec.ts.

**Interfaces:** Produces fields LearningProgram.revision:number, progressionPolicy:'MASTERY'|'ACTIVITY_COMPLETION', curriculumRevisionIds:string[]; LearnerProgramEnrollment.curriculumRevisionIds:string[]. Contracts: createProgramSchema, updateProgramSchema, publishProgramSchema, enrollProgramSchema, adminProgramSchema/adminProgramListSchema. APIs GET/POST /admin/learning-programs; PUT /admin/learning-programs/:id; POST /admin/learning-programs/:id/publish; POST /me/program-enrollments. Enrollment returns ProgramContextDto. Admin DTO includes id, slug, metadata, availabilityStatus, revision, progressionPolicy, curriculumRevisionIds. Program access input accepts optional progressionPolicy and curriculumRevisionIds.

- [ ] Write failing real API tests: ADMIN creates/publishes valid program; LEARNER forbidden; foreign/archived/multi-lesson/cyclic prerequisites rejected; stale revision and changed idempotency payload conflict; concurrent enrollment yields one unchanged pin; republication preserves old pin.
- [ ] Run isolated Vitest; expect missing endpoint/behavior failures.
- [ ] Implement additive migration, schemas, locked receipt/audit commands, validated ordered publication, generic access and learner enrollment.
- [ ] Run targeted tests/typecheck; expect all pass. Commit explicit paths.

### Task 2: Pinned eligibility, completion and targeted start

**Files:** curriculum-foundation/application/{curriculum-progress,curriculum-eligibility}.service.ts; learning-sessions service/controller/dto; packages/contracts/src/learning-session.contracts.ts; focused tests.

**Interfaces:** Consumes Task 1 pin/policy fields. Produces POST /learning-sessions/curriculum with {missionId,expectedCurriculumRevisionId,durationMinutes,clientSessionId}; LearningSessionDto response. Existing POST remains compatible. Read enrollment pin by resolved enrollment ID. Completion policy curriculum-activity-completion-v1 is independent from mastery; legacy policy preserved.

- [ ] Write failing tests: queued submitted evidence completes only R2; absent/foreign/incomplete evidence fails; old enrollment resolves old revision; locked/stale/foreign target fails; concurrent replay does not create extra session; reused key for another target conflicts.
- [ ] Run safe unit/isolated integration tests; expect intended failures.
- [ ] Implement pinned roadmap/eligibility, separate completion policy and target-bound session creation with profile lock and exact revision checks.
- [ ] Run API suite/typecheck; expect green. Commit explicit paths.

### Task 3: Admin and learner UI

**Files:** features/admin-learning-programs, app/(admin)/admin/learning-programs/page.tsx; learning-program client/catalog; curriculum roadmap/dashboard/session navigation; API clients/messages/tests.

**Interfaces:** Consumes Task 1/2 shared contracts and routes. Admin form creates metadata and publishes ordered revision UUIDs from existing curriculum authoring. Learner catalog enrolls available R2 programs with current expected revision. Roadmap available item offers target start; in_progress offers resume; locked has no start.

- [ ] Write failing UI/client tests: valid Admin create/publish, invalid/error state keeps edits, enrollment navigation, available start payload, locked exclusion and resume.
- [ ] Run web Vitest; expect missing behavior failures.
- [ ] Implement accessible existing-style forms and actions with loading/retry handling, strict response parsing and no client progress writes.
- [ ] Run web tests/lint/typecheck/build; expect pass. Commit explicit paths.

### Task 4: Full vertical slice qualification and integration

**Files:** isolated R2 test configuration/runner, real API/browser journey, docs/qualification/r2-learning-program-progression-report.md; source-of-truth and Git integration reports; mandate lifecycle.

**Interfaces:** Consumes all above. Produces actual versioned receipts and truthful limitations.

- [ ] Create failing isolated API/browser journey for two published revisions; require actual durable attempts/completion/unlock/resume and dashboard reload.
- [ ] Run journey, fix root causes test-first, and run API/Web/shared tests, lint/typecheck/build, migration and secret checks.
- [ ] Independent whole-branch review; fix Critical/Important findings with RED→GREEN tests.
- [ ] Validate mandate, write real results, commit explicit artifacts and integrate only verified safe changes. No deploy while release gates remain incomplete.

## Interface decisions after builder check

Use CONTENT_ADMIN and SYSTEM_ADMIN for all Admin routes. `AdminProgramDto` includes id, slug, name, description, learningGoal, proficiencyLabel, iconKey, displayOrder, availabilityStatus, revision, progressionPolicy, curriculumRevisionIds. Create input: those metadata fields plus slug and idempotencyKey; update input: metadata plus expectedRevision/idempotencyKey (slug/policy immutable); publish input: curriculumRevisionIds, expectedRevision, idempotencyKey. Enroll input: programSlug and expectedRevision (positive number). Target start duration uses existing supported duration schema. Publication rejects more than one selected revision per mission. Archived pinned revisions block fresh starts; existing sessions continue to resume. Qualification uses legacy-compatible lessons and preserves Beginner evaluator guard.
