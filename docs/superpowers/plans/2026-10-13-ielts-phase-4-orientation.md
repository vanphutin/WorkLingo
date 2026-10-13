# IELTS Phase 4 — Orientation Implementation Plan

## Slice 1 — Contracts and persistence

1. Add shared Zod contracts for admin drafts, validation, versions, learner-safe slides, status, start, progress, and answer feedback.
2. Add Prisma enums/models and migration for orientation, immutable versions, local media, and progress.
3. Add schema/contract tests for invariants and answer-key redaction.

## Slice 2 — Admin application service

1. Add failing service tests for optimistic draft edits, semantic validation, publish isolation, archive, and media ownership.
2. Implement the NestJS module, DTOs, controller, service, local media upload/streaming, idempotent publish, and audit events.
3. Add focused integration tests for auth, validation, version isolation, media range requests, and migration constraints.

## Slice 3 — Learner application service

1. Add failing tests for Foundation checkpoint eligibility, pinned resume, question gate, concurrent revision conflict, completion, and N/N+1 isolation.
2. Implement learner status/start/progress/media endpoints.
3. Seed one data-driven orientation release with concise slides and transcripts; use browser speech rather than simulated release audio.

## Slice 4 — Admin web

1. Add an Admin navigation entry and orientation authoring page.
2. Implement accessible slide list/editor, add/delete/reorder controls, media upload, validation issues, preview, publish/archive, and version display.
3. Add component tests for authoring behavior and stale-revision recovery.

## Slice 5 — Learner web

1. Add dashboard orientation card and `/ielts/orientation` route.
2. Implement the responsive slide player, transcript/captions, uploaded audio plus browser speech fallback, speed/volume/replay controls, question feedback, saved navigation, and completion state.
3. Add component tests for locked, resume, audio fallback, question gate, and completion.

## Slice 6 — End-to-end and handoff

1. Add desktop/mobile Playwright journeys for Admin publish and learner locked/eligible/resume/completion/version isolation.
2. Update architecture, data model, API contracts, format/admin operation docs, roadmap, decisions, and Phase 4 review.
3. Run touched-package format, typecheck, unit, integration, and E2E checks throughout.
4. Run `pnpm verify` once at the final gate, review the final diff, commit atomically, push, and merge only after all required checks pass.
