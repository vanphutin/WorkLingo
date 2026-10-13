# IELTS Phase 5 — Bridge Implementation Plan

**Spec:** `docs/superpowers/specs/2026-10-13-ielts-phase-5-bridge-design.md`

## Execution policy

- Work on `codex/ielts-phase5-bridge` from verified `main`.
- Use TDD and commit each green slice.
- Read and test only the changed package/app until the final release gate.
- Preserve `.agents/`, `AGENTS.md` and `skills-lock.json` as untracked user files.

## Slice 1 — Contracts and durable schema

- Add the question taxonomy, ten-stage content schemas and learner-safe DTOs.
- Add module, immutable version and progress Prisma models with migration constraints/indexes.
- Prove contracts and migration behavior with focused tests.

## Slice 2 — Admin authoring and publishing

- Add module list/create, draft save, validate, publish and archive APIs.
- Add optimistic revision, idempotency, immutable snapshots and safe audit events.
- Seed four original local modules, one per skill.

## Slice 3 — Learner access and progress

- Gate new starts on completed Orientation while preserving pinned resumes.
- Add learner catalog, start/status, stage submission and completion APIs.
- Keep answer keys/rubrics server-side and make timed outcomes durable.

## Slice 4 — Admin web experience

- Add taxonomy-aware module editor, stage navigator, validation issues and preview.
- Add confirmation for archive/destructive edits and responsive accessible styling.

## Slice 5 — Learner web experience

- Add dashboard entry, module catalog and ten-stage player.
- Add guided strategy, task renderers, explicit timed start, feedback and resume.

## Slice 6 — Verification and handoff

- Add desktop/mobile Playwright Bridge journey and version-boundary assertions.
- Update architecture, data, API, decisions, roadmap and test documentation.
- Review correctness, security/privacy, accessibility, performance and maintainability.
- Run `pnpm verify` once, then commit, push and fast-forward merge only after all gates pass.

