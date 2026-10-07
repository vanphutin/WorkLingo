# Increment 3 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the main implementation. Independent frontend/progression slices may use dispatching-parallel-agents with disjoint write scopes. Steps use checkbox syntax for tracking.

**Goal:** Finish local adaptive learning, progression policy and learner visibility.
**Architecture:** Keep versioned curriculum and immutable session plans; add deterministic context-aware mission selection, persisted checkpoint snapshots and a responsive learner evidence view.
**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, Zod, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-10-07-increment-3-completion-design.md

## Global Constraints

- Local PostgreSQL/filesystem; no provider calls or fabricated scores.
- Durations 45/60/90/120/150; 60 default; four skills and unique activities.
- Keep existing Task 16 changes and user AGENTS.md.
- Checkpoint threshold 0.7 per skill; policy workplace-checkpoint-v1.
- Published content and assessment snapshots remain immutable.

## Review Focus

- Empty availability disables session start (Task 1).
- Renaming/re-publishing identical text does not count as transfer (Task 2).
- Scores submitted by client cannot pass a checkpoint (Task 3).
- Missing speaking/writing scores remain unassessed and block advancement (Task 3/4).
- A stale confirmation cannot downgrade a learner or skip levels (Task 3).

### Task 1: Finish and review Task 16

**Files:** existing availability, API client, dashboard and session-shell changes.
**Interfaces:** consumes server availability; produces content-backed duration controls and order-based progress.
- [x] Add failing empty-availability and typed 422 tests; observe RED.
- [x] Fix only demonstrated behavior; run web unit tests and API availability integration tests. Expected: PASS.
- [x] Review existing diff and commit explicit Task 16 files after checks.

### Task 2: Context-transfer selection and Mastery Map API

**Files:** new `apps/api/src/learning-sessions/domain/context-transfer.ts` and tests; `curriculum.service.ts`, `mastery.service.ts`, `mastery.controller.ts`, session planner/service/types/contracts; integration tests.
**Interfaces:** `selectMissionForReview(missions, reviews, completedMissionIds): PublishedMission`; reviews contain previous context signatures, stable block ID and skill. `GET /me/mastery-map` follows the spec.
- [x] Write failing deterministic selection tests for new context, changed slug/same text, absent transfer and unrelated skill; observe RED.
- [x] Implement context signatures, mission selection and frozen plan review metadata. Availability/creation use same selector and persisted current level.
- [x] Add integration tests for own curriculum map, cross-user isolation and time-travel recurrence; verify PASS.
- [x] Commit this slice after lint/typecheck/tests.

### Task 3: Checkpoint assessment, reinforcement and progression

**Files:** new `apps/api/src/progression/**`, Prisma additive migration/schema, `packages/contracts/src/progression.contracts.ts`, AppModule and ProgressService; integration tests.
**Interfaces:** endpoints and exact shapes in spec. Other slices only read `LearnerProfile.currentLevelCode`, default FOUNDATION_1.
- [x] Test per-skill 0.7 boundary, pending null scores, first-attempt weakness, missing curriculum mastery and incomplete missions; observe RED.
- [x] Implement pure policy plus persisted assessment snapshots and actionable reinforcement; schema defaults preserve existing learners.
- [x] Integration-test ownership, UUID replay/conflict, rejecting client scores, published target level, confirmation transaction and stale requests. Expected: PASS.
- [x] Commit explicit files after checks.

### Task 4: Learner mastery/progression UI

**Files:** new learner mastery feature/page/tests; API client and dashboard links; dedicated CSS. Avoid backend and shared contract edits.
**Interfaces:** consumes mastery-map, existing memory-health/error-bank, progression endpoints from spec.
- [x] Write failing UI tests for unassessed vs zero, empty/error/retry states, skill filtering/pagination, pending checkpoint and confirmation; observe RED.
- [x] Implement accessible responsive UI and server-authoritative duration corrections. Expected: web tests/typecheck/lint PASS.
- [x] Commit only UI slice after integration review.

### Task 5: Full increment verification and handoff

**Files:** Playwright adaptive-learning journey/config; documentation contracts/model/decisions/roadmap/local guide.
**Interfaces:** tests actual learner APIs and DOM on desktop/mobile in isolated E2E schema.
- [x] Write E2E for review recurrence, mastery/errors, pending checkpoint and duration/resume; observe first relevant failure.
- [x] Complete wiring; update docs including pending speech limit and policy calibration.
- [x] Run `pnpm verify`. Expected: all gates PASS. Review branch independently and fix substantive findings with regression tests.
- [x] Commit explicit files, integrate through authorized Git workflow, and run the completed local demo.
