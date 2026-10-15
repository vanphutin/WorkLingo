# IELTS Phase 6 - Integrated Practice Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-13-ielts-phase-6-integrated-practice-design.md`

## Execution policy

- Work on `codex/ielts-phase6-integrated-practice` from verified `main`.
- Use test-first vertical slices and focused package checks; run `pnpm verify` once near completion.
- Preserve `.agents/`, `AGENTS.md`, and `skills-lock.json` as untracked user files.

## Slice 1 - Contracts and allocation policy

- Define durations, independent difficulty, four-skill allocations, immutable plan DTOs, and strict
  sum/coverage validation.
- Seed the approved initial allocations as data and prove custom valid profiles are accepted.

## Slice 2 - Persistence

- Add mutable profile drafts, immutable published profile versions, version-bound integrated sessions,
  block progress, optimistic revision, and supporting indexes/triggers.

## Slice 3 - Admin workflow

- Add read/save/validate/publish profile APIs with optimistic revision, idempotency, and safe audit.

## Slice 4 - Learner workflow

- Gate new starts on Bridge completion; plan four skills, due review, and non-repetition; persist one
  immutable snapshot; add owner-scoped resume/progress/completion.

## Slice 5 - Web experience

- Add Admin allocation editor and learner duration/difficulty selector, session player, feedback,
  resume, responsive states, and accessible timers/controls.

## Slice 6 - Qualification

- Add desktop/mobile E2E for eligibility, every duration, exact allocation, reload resume, republish
  isolation, and no-band-score boundary; update docs; review and run the final gate once.
