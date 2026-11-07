# R2.1 Beginner Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Publish the eight exact Beginner lessons into R2 and verify persisted learner completion.

**Architecture:** Existing official Beginner content/curriculum services feed immutable R2 program versions. A bounded operator importer validates sources/assets/vocabulary, authorizes the exact target and retains idempotent audit receipts. R2 completion supports unscored productive practice.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod contracts, Next.js/React, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-11-07-r21-beginner-publication-design.md

## Global Constraints

- No provider requests or extra spending; productive Beta answers are unscored.
- Preserve 8 lessons, 64 activities, 32 objectives, 41 lexical blocks, 24 scripts/WAV and 297 historical decisions.
- Exact LF source/bundle hashes; no fabricated vocabulary IDs or historical PASS transfer.
- Bounded primary writes require target/schema verification, backup, dry-run, reviewed write set and readback.
- Reuse official publication, immutable pins, account authorization and R2 progression.
- Preserve unrelated main checkout changes; no force push or history rewrite.

## Review Focus

- Status-only Beginner promotion without authored publication must remain closed (Task 2).
- Permission or source change between dry-run and apply must reject without writes (Task 1).
- Partial import retry must preserve immutable identities and unrelated data (Task 1).
- Productive submissions must persist without jobs, scores or private criterion leaks (Task 2).
- Refresh/review must retain enrolled exact release rather than latest release (Task 3).

### Task 1: Exact-source bounded official importer

**Files:** new `apps/api/src/beginner/application/beginner-program-import.service.ts`, `apps/api/src/beginner/domain/beginner-program-source.ts`, operator CLI and specs; extend `packages/contracts/src/beginner-authoring.contracts.ts`, `apps/api/src/beginner/domain/beginner-environment-preflight.ts` for bounded runtime authority.

**Interfaces:** consumes canonical sources, correction/audio bindings and actual vocabulary records; produces validated dry-run write set and `{programId,programVersionId,lessonBindings,curriculumRevisionIds}` persisted receipt. Existing official authoring/publication services own all domain transitions.

- [x] Write failing source/authority tests: reject changed source/audio/bundle, wrong target/expired authority, changed dry-run and unresolved exact vocabulary IDs; accept 8/64/32/41/24 verified source inventory with explicit exceptions.
- [x] Run targeted Vitest; Expected: missing feature assertions fail.
- [x] Implement source reconciler, bounded permission and transactional/import recovery service using official authoring/curriculum/version services and audit receipts; preserve master records.
- [x] Run unit and isolated DB tests for dry-run zero writes, idempotent replay, rollback on failure, exact pins, immutability and unchanged unrelated data; Expected: all pass.
- [x] Commit explicit implementation/tests and reconciliation evidence.

### Task 2: Published Beta access and safe productive practice

**Files:** `apps/api/src/learning-programs/domain/program-availability.ts`, `application/program-release-snapshot.ts`, `application/program-versions.service.ts`, catalog/enrollment callers, `apps/api/src/learning-sessions/application/learning-sessions.service.ts`, relevant contracts and specs.

**Interfaces:** consumes Task 1 official exact published content; produces authenticated selectable Beginner release, complete 45-minute plans and persisted non-scored practice.

- [x] Write failing regressions for no-release denial, valid Beginner release access, unrelated reserved denial, all eight source playability and no queued productive jobs/score.
- [x] Run targeted Vitest; Expected: current Beginner rejection/queued evaluation failures.
- [x] Implement release-aware access and playability using existing Beginner planner; retain safe Beta semantics and private evaluator context.
- [x] Run backend/contracts and isolated API integration including enrollment, stale/idempotency/privacy, all activities and completion; Expected: all pass.
- [x] Commit explicit code/tests.

### Task 3: Actual Admin/Learner UI and full qualification

**Files:** existing catalog/detail/session/Admin components and localized messages as needed; `apps/web/e2e/r21-beginner-publication.spec.ts`; eight `docs/qualification/beginner-*.md` mission reports.

**Interfaces:** consumes published release and Task 2 API; produces actual catalog/detail/enrollment/roadmap/session/review/completion in browser with exact pins and persisted results.

- [x] Add failing component/E2E cases for real snapshot metadata, Beta practice labels and full eight-lesson persistence/resume/review.
- [x] Run cases; Expected: missing behavior fails.
- [x] Fix existing UI minimally and localize; run component/API/DB/E2E, mobile390×844/tablet768/desktop, keyboard/themes/reduced motion, 24 audio and legacy/IELTS/placement regressions; Expected: all pass.
- [x] Verify primary backup recovery and additive migration on clone; dry-run/review/apply official import on configured primary and current runtime, read back exact identities and unchanged master/progress.
- [x] Run independent whole-branch review, fix confirmed important findings test-first, audit every commit, commit actual reports, integrate current main and normal push; Expected: remote SHA equals verified main and unrelated changes preserved.

## Final execution receipt

Implementation and test commits fb502e1, 8afc593, 95276b3, bd0ae8b and d34d1ed were fast-forwarded into D:/Projects/WorkLingo main and normally pushed. Remote implementation SHA readback equals d34d1edce69edb6c2d93cd3eef9af48a1b93fa83. Eight required reports and selected synthetic screenshots accompany this completed plan; final evidence HEAD is verified again after its commit. Production remains unqualified and is not deployed.
