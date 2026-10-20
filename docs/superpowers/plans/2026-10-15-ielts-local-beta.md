# IELTS Local Beta Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for disjoint backend/content work and inline frontend work. Follow RED→GREEN and a final independent review.

**Goal:** Publish curated local IELTS content and make the Beta card open a usable gated pathway.
**Architecture:** Existing immutable publishers plus a read-only catalog readiness check; `/ielts` navigates existing phase engines while preserving Intermediate evidence.
**Tech Stack:** NestJS/Prisma, shared Zod contracts, Next/React, Windows offline speech, local storage, Vitest/Playwright.
**Spec:** `docs/superpowers/specs/2026-10-15-ielts-local-beta-design.md`.

## Global Constraints
- User authorization is local Beta content selection/publication; no public release, paid calls or evidence fabrication.
- Preserve all existing learner context, progress, historical versions and teacher-review gates.
- Exact catalog destinations: `/dashboard` and `/ielts`; no fake IELTS generic path/level counts.
- Release utility dry run is default; loopback DB and existing local admin actor required; private snapshot before mutation.

## Review Focus
- Partial/archived publications or fake/missing mock audio must relock the catalog.
- Direct IELTS context activation must never change Intermediate evidence/context.
- Draft edits must not invalidate an existing usable published version unless explicitly archived.
- Release interruption/rerun must not silently republish or corrupt learner version pins.
- Objective content answer keys must be supported by actual original text/audio.

### Task 1: Backend catalog readiness
**Files:** `packages/contracts/src/learning-program.contracts.ts` and tests; API `learning-programs/**` and scoped integration tests.
**Interfaces:** Existing catalog shape; destination union includes `/ielts`; actual BETA + complete published content yields selectable IELTS. No changes to learning-progress APIs.
- [x] Write contract/readiness/direct-activation regressions and verify RED.
- [x] Implement bounded current-publication/media checks, destination policy and explicit non-context IELTS entry; verify affected suites/typecheck/lint.

### Task 2: Content curation and reversible release
**Files:** `apps/api/src/ielts-beta-release/**`, `apps/api/scripts/release-ielts-beta.ts`, `docs/IELTS_LOCAL_BETA_CONTENT.md` and supporting local-only assets/snapshots.
**Interfaces:** Dry-run/execute utility using existing publishing services and actual LocalObjectStorage; metadata BETA update after all checks.
- [x] Inspect authored local drafts and schema, write safety/quality regressions and verify RED.
- [x] Choose/improve original Beta content, prepare offline speech and publish workflow with snapshot/idempotency/provenance.
- [x] Verify tests and read-only dry run; parent reviews before executing the already-authorized local release.

### Task 3: Learner entry and hub
**Files:** web `features/learning-programs/program-catalog*`, new `app/(learner)/ielts/page.tsx`, feature hub/tests, bilingual messages, focused E2E.
**Interfaces:** `/ielts` is navigation only; server APIs preserve eligibility. Existing dashboard phase components may be reused.
- [x] Reproduce missing navigation, write RED tests for IELTS entry without activateProgram, five phases and localized prerequisite states.
- [x] Implement accessible hub/card copy and navigation with existing design; run web suites/typecheck/lint.

### Task 4: Publish and qualify
- [x] Independent code/content review, fix important findings with regressions.
- [x] Execute reviewed local release utility, retain private rollback snapshot, verify current published versions and real audio.
- [x] Verify Programs→IELTS browser journey and unchanged context, complete affected package gates and record exact evidence.
- [x] Update roadmap/readiness report and mandate record with this explicit local authorization; leave live servers running.
