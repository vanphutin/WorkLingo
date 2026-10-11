# Increment 5B Admin Curriculum and Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Content Admins safely create, arrange, publish and archive curriculum while preserving learner/version history and exposing privacy-safe audit evidence.

**Architecture:** Add an Admin-only curriculum module with optimistic-revision commands and canonical playability checks, plus an append-only audit query module with allowlisted serialization. Keep learner curriculum reads and immutable LessonVersion publication as the existing sources of truth.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Zod contracts, Next.js 16/React, Vitest, Supertest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-11-increment-5b-admin-curriculum-audit-design.md`

## Global Constraints

- Every Admin mutation requires `CONTENT_ADMIN` or `SYSTEM_ADMIN`, a client UUID idempotency key and the current `expectedRevision` when updating existing state.
- Successful mutations and their safe `AuditLog` row commit atomically; failed authorization or validation writes no success audit.
- Published LessonVersion rows and existing LearningSession snapshots remain immutable and version-bound.
- Archive never cascades; active published children and playable-session dependencies return bounded blockers.
- Reorder payloads contain every active sibling exactly once and persist contiguous positions starting at one.
- Published/history-referenced slug, level code, mission purpose and parent identity are immutable.
- Audit responses never expose email, credentials, source text, learner content, recordings, provider payloads or arbitrary JSON.
- All changes use RED → GREEN → REFACTOR and preserve existing content-authoring and learner journeys.

## Review Focus

- Two Admins update the same mission revision: exactly one succeeds and the stale writer receives `409 CURRICULUM_REVISION_CONFLICT`.
- A reorder omits, duplicates or imports a foreign sibling ID: the whole transaction rolls back and order remains unchanged.
- A published mission loses its last playable lesson: replacement is rejected and its existing learner availability remains intact.
- An archive targets a parent with published descendants: bounded blocker codes are returned with no implicit cascade.
- Audit metadata contains nested forbidden keys or oversized values: write is rejected or normalized before persistence and never reaches the browser.

---

### Task 1: Persist curriculum revisions and define shared Admin contracts

**Files:**
- Create: `apps/api/prisma/migrations/20261011000100_increment_5b_curriculum_admin/migration.sql`
- Create: `packages/contracts/src/admin-curriculum.contracts.ts`
- Create: `packages/contracts/src/admin-curriculum.contracts.spec.ts`
- Create: `packages/contracts/src/admin-audit.contracts.ts`
- Create: `packages/contracts/src/admin-audit.contracts.spec.ts`
- Create: `apps/api/test/integration/admin-curriculum-schema.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Produces: `AdminCurriculumTreeDto`, path/level/mission command schemas, `ReplaceMissionLessonsInput`, `ReorderCurriculumInput`, `AdminAuditPageDto`, opaque cursor/filter schemas and the error-code union defined by the spec.
- Produces persistence fields `revision Int @default(1)` on `LearningPath`, `Level`, `Mission`, `MissionLesson`, plus `Level.status ContentStatus @default(DRAFT)` and indexes for sibling order and audit cursor/filter queries.

- [ ] **Step 1: Write failing contract and migration tests**

Assert revision defaults to `1`, existing seed rows migrate without identity/order changes, level status defaults safely, UUID idempotency keys are mandatory, expected revisions are positive integers, relationship IDs are unique, page limit defaults to `25` and caps at `100`, and cursors are opaque strings.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/contracts test`

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/admin-curriculum-schema.integration.spec.ts test/integration/backup-restore.integration.spec.ts`

Expected: FAIL because revision/status persistence and contracts do not exist.

- [ ] **Step 3: Add the additive migration, Prisma fields/indexes and Zod contracts**

Keep all current IDs, statuses, relations and session/version references. Do not add destructive delete behavior or duplicate curriculum tables.

- [ ] **Step 4: Generate Prisma and run GREEN**

Run: `pnpm --filter @worklingo/api exec prisma generate`

Run both commands from Step 2; expected PASS.

- [ ] **Step 5: Checkpoint**

Inspect only the migration, schema and contract diff. When running under the Increment 5 master prompt, record the checkpoint and do not commit.

### Task 2: Implement playability, archive, reorder and audit-safety policies

**Files:**
- Create: `apps/api/src/admin-curriculum/domain/curriculum-mutation-policy.ts`
- Create: `apps/api/src/admin-curriculum/domain/curriculum-mutation-policy.spec.ts`
- Create: `apps/api/src/admin-curriculum/domain/curriculum-reorder-policy.ts`
- Create: `apps/api/src/admin-curriculum/domain/curriculum-reorder-policy.spec.ts`
- Create: `apps/api/src/audit/domain/audit-metadata-policy.ts`
- Create: `apps/api/src/audit/domain/audit-metadata-policy.spec.ts`

**Interfaces:**
- Consumes: `findPlayableLevels()` and `computeAvailableDurations()` from existing curriculum/session policies.
- Produces: `assertMutableIdentity(input): void`; `validateCompleteOrder(input): OrderedSibling[]`; `findArchiveBlockers(input): CurriculumBlocker[]`; `sanitizeAuditState(input: AuditStateInput): SafeAuditState`.

- [ ] **Step 1: Write failing table-driven policy tests**

Cover stable identity before/after publish/history reference, purpose/parent immutability, complete contiguous reorder, duplicate/missing/foreign IDs, playable 60-minute four-skill coverage, last-lesson removal, nested forbidden audit keys, cyclic input and size/depth bounds.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/admin-curriculum/domain src/audit/domain`

Expected: FAIL because the policies are absent.

- [ ] **Step 3: Implement pure policies**

Return stable blocker/error codes rather than database messages. Audit serialization uses an action/resource allowlist; it never performs a broad object spread over database or request objects.

- [ ] **Step 4: Run GREEN and mutation checks**

Run Step 2. Mutate contiguous start from `1` to `0`, allow one forbidden key and remove the final-lesson guard; verify the owning tests fail, restore and rerun green.

- [ ] **Step 5: Checkpoint**

Review policy names/types against Task 1 contracts and record the checkpoint.

### Task 3: Add transactional idempotent curriculum commands

**Files:**
- Create: `apps/api/src/admin-curriculum/admin-curriculum.module.ts`
- Create: `apps/api/src/admin-curriculum/admin-curriculum.controller.ts`
- Create: `apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts`
- Create: `apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts`
- Create: `apps/api/src/admin-curriculum/application/mutation-receipt.service.ts`
- Create: `apps/api/src/admin-curriculum/dto/curriculum-command.dto.ts`
- Create: `apps/api/test/integration/admin-curriculum-commands.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: Tasks 1–2 contracts/policies, `PrismaService`, existing `MutationReceipt`, `AuditLog`, `findPlayableLevels()` and published Lesson relationships.
- Produces: `AdminCurriculumCommandService.create/update/publish/archivePath`, equivalent level/mission methods, `reorderLevels`, `reorderMissions`, and `replaceMissionLessons`, all receiving `{ actorId, idempotencyKey, expectedRevision?, ...command }`.

- [ ] **Step 1: Write failing service and HTTP integration tests**

Cover Content Admin success, learner/foreign denial, idempotent replay with the same response, idempotency conflict on changed payload, stale revision, concurrent reorder, complete-sibling validation, immutable identity/purpose/parent, archive blockers, no cascade, only published lessons attachable, last playable lesson protection, one audit event per success and no audit on rollback.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/admin-curriculum/application/admin-curriculum-command.service.spec.ts test/integration/admin-curriculum-commands.integration.spec.ts`

Expected: FAIL because Admin curriculum commands/routes are absent.

- [ ] **Step 3: Implement transactions and controllers**

Lock the mutated row/sibling set with PostgreSQL row locks before checking revision/order. Increment revision exactly once per accepted command. Hash canonical command input for receipt comparison. Write sanitized old/new state and receipt inside the same transaction.

- [ ] **Step 4: Run GREEN and regressions**

Run Step 2 plus `content-publish.integration.spec.ts`, `learning-sessions.integration.spec.ts`, `placement-isolation.integration.spec.ts` and `session-ownership.integration.spec.ts`.

- [ ] **Step 5: Checkpoint**

Inspect transaction boundaries and verify no learner-facing service was duplicated.

### Task 4: Add curriculum tree and privacy-safe audit queries

**Files:**
- Create: `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.ts`
- Create: `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.spec.ts`
- Create: `apps/api/src/audit/audit-query.module.ts`
- Create: `apps/api/src/audit/admin-audit.controller.ts`
- Create: `apps/api/src/audit/application/audit-query.service.ts`
- Create: `apps/api/src/audit/application/audit-query.service.spec.ts`
- Create: `apps/api/src/audit/dto/audit-query.dto.ts`
- Create: `apps/api/test/integration/admin-curriculum-query.integration.spec.ts`
- Create: `apps/api/test/integration/admin-audit-api.integration.spec.ts`
- Modify: `apps/api/src/admin-curriculum/admin-curriculum.controller.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `AdminCurriculumQueryService.getTree(): Promise<AdminCurriculumTreeDto>` and `AuditQueryService.list(filters): Promise<AdminAuditPageDto>`; routes `GET /api/v1/admin/curriculum` and `GET /api/v1/admin/audit-events`.

- [ ] **Step 1: Write failing query/API tests**

Assert deterministic tree/order, revision/status/purpose, computed playability reasons, bounded archive blockers, lesson publication summary, Admin-only access, stable `(createdAt,id)` cursor pagination under equal timestamps, all filters, limit cap and actor display name without email.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/admin-curriculum/application/admin-curriculum-query.service.spec.ts src/audit/application/audit-query.service.spec.ts test/integration/admin-curriculum-query.integration.spec.ts test/integration/admin-audit-api.integration.spec.ts`

- [ ] **Step 3: Implement bounded selected-field queries and opaque cursor helpers**

Calculate readiness with existing domain policy. Select only audit allowlist fields; never return persisted arbitrary JSON directly.

- [ ] **Step 4: Run GREEN, API lint and typecheck**

Run Step 2, `pnpm --filter @worklingo/api lint`, and `pnpm --filter @worklingo/api typecheck`.

- [ ] **Step 5: Checkpoint**

Inspect generated SQL/query shape for bounded selects and indexed ordering.

### Task 5: Build accessible Admin curriculum and audit workspaces

**Files:**
- Create: `apps/web/src/app/(admin)/admin/curriculum/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/audit/page.tsx`
- Create: `apps/web/src/features/admin-curriculum/curriculum-workspace.tsx`
- Create: `apps/web/src/features/admin-curriculum/curriculum-workspace.test.tsx`
- Create: `apps/web/src/features/admin-curriculum/curriculum.css`
- Create: `apps/web/src/features/admin-audit/audit-workspace.tsx`
- Create: `apps/web/src/features/admin-audit/audit-workspace.test.tsx`
- Create: `apps/web/src/lib/api/admin-curriculum-client.ts`
- Create: `apps/web/src/lib/api/admin-audit-client.ts`
- Modify: `apps/web/src/app/(admin)/layout.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3 and 4 contracts/endpoints.
- Produces: responsive curriculum tree/editor, keyboard move controls, publish/archive confirmations, stale-revision reload/reapply flow, audit filters and cursor navigation.

- [ ] **Step 1: Write failing component tests**

Assert readiness/blocker text, purpose labels, add/edit forms, preserved input after recoverable failure, stale revision recovery, publish/archive confirmation, move up/down keyboard access, disabled invalid moves, mobile stacked rendering, audit filters, next/previous cursor behavior and safe empty/error/retry states.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/admin-curriculum/curriculum-workspace.test.tsx src/features/admin-audit/audit-workspace.test.tsx src/app/'(admin)'/layout.test.tsx`

- [ ] **Step 3: Implement focused clients/pages/components**

Use semantic forms and status messages, 44px controls and existing Admin styles/tokens. Do not make drag-and-drop the only reorder method.

- [ ] **Step 4: Run GREEN, web lint, typecheck and build**

Run Step 2 plus `pnpm --filter @worklingo/web lint`, `pnpm --filter @worklingo/web typecheck`, and `pnpm --filter @worklingo/web build`.

- [ ] **Step 5: Checkpoint**

Inspect desktop/mobile layout and ensure the learner launcher remains unaffected.

### Task 6: Qualify the complete Admin curriculum journey

**Files:**
- Create: `apps/web/e2e/admin-curriculum-audit.spec.ts`
- Modify: `apps/web/e2e/helpers/content-admin.ts`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/TEST_STRATEGY.md`

**Interfaces:**
- Consumes: Tasks 1–5 and existing immutable content publication.
- Produces: desktop/mobile evidence for create → arrange → attach → publish → learner availability → blocked archive → audit discovery.

- [ ] **Step 1: Write the failing end-to-end journey**

Use public UI/API behavior. Include keyboard reorder, stale-revision recovery, publish visibility, existing-session version isolation, archive blocker, audit actor/action/resource discovery, mobile overflow and touch targets.

- [ ] **Step 2: Run RED and fix only exposed 5B wiring**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/admin-curriculum-audit.spec.ts`

- [ ] **Step 3: Update architecture, contract, data and test documentation**

Document revision/idempotency semantics, immutable identifiers, blocker codes, audit allowlist/cursor and local Admin operation.

- [ ] **Step 4: Run the 5B gate**

Run focused contracts/API/web/E2E checks, then `pnpm verify`. Resolve every regression caused by 5B and record exact counts/results for handoff.

- [ ] **Step 5: Checkpoint**

Perform a five-axis self-review: correctness, maintainability, architecture, security/privacy and performance. Fix all Critical/Important findings; do not commit under the master prompt.
