# IELTS Phase 7 — Band-Oriented Curriculum Implementation Plan

**Goal:** Deliver the complete competency map and evidence-based progression engine without creating
mock-test or official band claims.

**Spec:** `docs/superpowers/specs/2026-10-14-ielts-phase-7-band-curriculum-design.md`.

## Vertical slices

1. **Contracts and pure policy** — add seven-stage schemas, validation, learner evidence/progression
   responses, and focused contract/domain tests.
2. **Persistence and migration** — add immutable curriculum/version and owner-scoped learner journey
   models with migration integration coverage.
3. **Admin pipeline** — implement list/save/validate/publish with revision, idempotency, transaction,
   audit, seed, and service/controller tests.
4. **Learner progression** — implement availability/start/target/evaluate using completed Integrated
   Practice evidence, version isolation, and owner tests.
5. **Web journeys** — add API clients, Admin workspace, learner pathway/dashboard links, responsive
   styles, and component tests. Clear stale Phase 6 feedback when moving blocks.
6. **Qualification** — desktop/mobile E2E covers publish, start, insufficient evidence, advancement,
   republish isolation, and no-band boundary; update architecture/data/API/test/decision/roadmap docs.
7. **Final gate** — review the branch, run focused checks during development, run `pnpm verify` once,
   inspect the final diff, then commit/push/integrate only within user-authorized scope.

## Test seams

- Zod contracts and pure progression policy.
- Nest services through injected Prisma public methods; HTTP integration for authorization/ownership.
- React components through visible labels, actions, status, and navigation.
- Playwright through Admin and learner journeys on desktop/mobile.

