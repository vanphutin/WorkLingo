# Admin content CRUD implementation plan

> For agentic workers: execute bounded tasks with TDD and independent final review. The user delegated routine design and execution decisions; proceed within the approved feature scope.

**Goal:** Independent authoring/lifecycle controls for Intermediate and IELTS using their existing content formats.
**Architecture:** Existing domain schemas/version snapshots stay canonical. Add missing lifecycle/create endpoints and improve existing resource editors. Do not migrate production data.
**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, Zod, Vitest.
**Spec:** ../specs/2026-10-18-admin-content-crud-design.md

## Global constraints

- Existing audio-dashboard-v2 worktree; no dependencies, live publishing, schema migration, push or merge.
- Independent files per worker; no staging/commits by workers. Coordinator integrates and commits.
- New API lifecycle endpoint: `POST /admin/content-lifecycle/:kind/:id/remove`, body `{expectedRevision:number,expectedAction:'deleted'|'archived',idempotencyKey:UUID}`. Kinds `topic`, `bridge`, `mock`, `lesson`. Response `{id:string,action:'deleted'|'archived'}`. Reject a changed lifecycle action before mutation, even when publication did not increment the revision. Fixed configuration profiles use existing save/version flows.
- Mock creation: `POST /admin/ielts-mocks`, body `{idempotencyKey:UUID,content:unknown}`, returns existing AdminIeltsMockDto. Existing save/validate/publish contracts unchanged.
- Common web lifecycle client in `lib/api/admin-content-lifecycle-client.ts`, named `adminContentLifecycleClient.remove(kind,id,input)`.

## Review focus

- Concurrent publication/removal and stale revision cannot erase history (Task 1).
- Switching selected items cannot silently discard unsaved content (Tasks 2/3).
- Import retains unknown optional content or rejects explicitly instead of dropping it (Task 2).
- Bridge same-type modules receive distinct stable slugs (Task 1).
- Deferred programs offer no misleading active Admin authoring links (Task 4).

### Task 1: Missing backend create/removal lifecycle

Files: new `apps/api/src/admin-content-lifecycle/` module/controller/service/DTO/tests; AppModule registration; mock admin create/controller; Bridge unique draft slugs. Preserve existing public APIs and snapshots.

- [x] Write failing service/controller tests for all kinds, permissions, revision mismatch, idempotent replay, draft deletion and history-safe archive.
- [x] Run focused API unit files with maxWorkers=2; observe expected missing behavior.
- [x] Implement typed domain dispatch, per-kind locks, audit receipts and transaction protection; add mock create with schema validation and collision-safe slug.
- [x] Run focused tests, API typecheck/lint. No DB fixture migrations.

### Task 2: Topics and mock authoring

Files: `features/ielts-study-admin/`, `features/admin-ielts-mock/`, their API clients/messages, new reusable `features/admin-authoring/` components if useful. Own lifecycle web client defined above.

- [x] Write failing component tests for new topic/mock template, labeled editing, individual selection, delete/archive confirmation, dirty-switch cancellation and invalid import.
- [x] Replace mandatory JSON-only editing with resource-appropriate fields; preserve full paper structures including version 1/2 and media IDs. Advanced import/export remains available with schema validation and per-kind templates.
- [x] Wire lifecycle endpoint and mock creation; refresh list and selected record safely after mutation.
- [x] Run focused component/client tests, web typecheck and scoped lint.

### Task 3: Bridge/orientation and configuration authoring

Files: `features/admin-ielts-bridge/`, `features/admin-ielts-orientation/`, `features/admin-ielts-band-curriculum/`, `features/admin-ielts-integrated/`, corresponding messages; may consume lifecycle client, do not edit it.

- [x] Write failing tests for same-type Bridge creation and lifecycle controls; preserve dirty edits on navigation, keep slide CRUD individual.
- [x] Remove same-type creation restriction, add named delete/archive actions using common lifecycle client. Keep slide add/edit/delete and version boundaries intact.
- [x] Replace band stage raw JSON requirement with structured fields/nested editors; keep fixed seven-stage validation and unchanged content not being edited. Clarify integrated duration profiles are configuration and link actual content.
- [x] Run focused component tests and scoped lint/typecheck. No DB/content mutations.

### Task 4: Intermediate list and navigation integration (coordinator)

Files: `features/admin-content/content-list*`, existing page/client as needed, `features/admin-dashboard/admin-navigation*`, messages. Documentation/evidence.

- [x] Write failing tests for independent lesson removal and deferred Beginner/TOEIC navigation.
- [x] Add named lifecycle action per lesson row, refresh callback/loading/errors; use removal semantics above. Label actual input format near create/editor and ensure focused Intermediate/IELTS links.
- [x] Review combined diff, run full web suite and API focused/domain checks; lint/typecheck/i18n, isolated build.
- [x] Independent review, fix findings with regression tests, record verification, commit explicit files locally.
