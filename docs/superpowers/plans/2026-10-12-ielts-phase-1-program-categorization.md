# IELTS Phase 1 Program Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable four-program catalog above the existing curriculum, preserve all learner history, and expose responsive Learner/Admin program categorization without enabling unfinished IELTS learning flows.

**Architecture:** Introduce `LearningProgram` as the parent of `LearningPath`, backfill every existing path to a stable Intermediate program, and keep the current learning engine untouched. A new NestJS read module exposes a closed learner catalog; existing Admin curriculum commands gain program assignment while defaulting legacy requests to Intermediate; Next.js adds a catalog route and safe status-driven navigation.

**Tech Stack:** PostgreSQL, Prisma 6, NestJS 11, Zod contracts, Next.js 16, React 19, Vitest, Testing Library, Playwright, pnpm workspaces

**Spec:** `docs/superpowers/specs/2026-10-12-ielts-phase-1-program-categorization-design.md`

## Global Constraints

- Preserve every existing path, level, mission, lesson version, session, attempt and related identifier.
- Seed exactly `beginner`, `intermediate`, `toeic` and `ielts` with the approved initial statuses and deterministic order.
- Use stable catalog UUIDs: Beginner `10000000-0000-4000-8000-000000000001`, Intermediate `10000000-0000-4000-8000-000000000002`, TOEIC `10000000-0000-4000-8000-000000000003`, IELTS `10000000-0000-4000-8000-000000000004`.
- Only `AVAILABLE` and `BETA` are selectable; `DISABLED` is absent from learner catalog responses.
- Intermediate remains the only Phase 1 destination and opens `/dashboard`; unfinished programs never create sessions or navigate to placeholder learning routes.
- Preserve existing auth/onboarding redirects and all current Learner/Admin URLs.
- Keep program slugs, status values, icon keys and destinations closed and server-owned; never render arbitrary URLs or markup.
- Use targeted package/file tests during red-green work. Run `pnpm verify` only at the final gate before final review/push, and rerun it only after a fix that invalidates that evidence.
- Do not add cloud services, payment, program enrollment, IELTS activities, band scoring or program metadata CRUD.

## Review Focus

- A database with pre-existing curriculum and learner history must backfill every path to Intermediate without changing any existing ID or relation; Task 1 owns the preservation test.
- Missing or `DISABLED` program IDs in Admin path creation must fail safely, while an omitted ID must retain the legacy Intermediate default; Task 3 owns these tests.
- Idempotent path creation with omitted versus explicit Intermediate assignment must hash the same semantic program and never create duplicates; Task 3 owns this test.
- Unknown icon/destination data or an unavailable status must not become executable navigation; Tasks 2 and 4 own service/schema/render tests.
- Desktop, mobile, keyboard and screen-reader users must see equivalent status and disabled-action behavior with no horizontal overflow; Tasks 4 and 5 own component and E2E tests.

---

### Task 1: Persist and seed the program hierarchy without rewriting history

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261012000100_learning_programs/migration.sql`
- Create: `apps/api/src/learning-programs/domain/program-catalog.ts`
- Create: `apps/api/src/learning-programs/infrastructure/seed-learning-programs.ts`
- Create: `apps/api/src/learning-programs/infrastructure/seed-learning-programs.spec.ts`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/src/curriculum/infrastructure/seed-foundation.ts`
- Create: `apps/api/test/integration/learning-program-migration.integration.spec.ts`
- Modify: `apps/api/test/integration/admin-curriculum-schema.integration.spec.ts`
- Modify: `apps/api/test/integration/curriculum-seed.integration.spec.ts`

**Interfaces:**
- Produces: Prisma `ProgramAvailabilityStatus`, `LearningProgram`, and required `LearningPath.programId` relation.
- Produces: `PROGRAM_CATALOG`, `INTERMEDIATE_PROGRAM_ID`, and `seedLearningPrograms(database): Promise<void>`.
- Requires: deterministic valid UUIDs shared by migration and TypeScript catalog constants; the Intermediate ID is the database default for legacy `LearningPath.create` calls.

- [ ] **Step 1: Write failing persistence and seed tests**

Add tests named:

- `backfills an existing path to Intermediate without changing historical identifiers` in `learning-program-migration.integration.spec.ts`. Apply all prior SQL migrations to an isolated schema, insert a pre-Phase-1 path and descendants with fixed IDs, apply the new migration, and assert those IDs remain unchanged and `programId === INTERMEDIATE_PROGRAM_ID`.
- `creates exactly four stable program rows and remains idempotent` in `seed-learning-programs.spec.ts`.
- `defaults a directly created path to Intermediate` in `admin-curriculum-schema.integration.spec.ts`.
- Extend the existing curriculum seed test to assert the seeded workplace path belongs to Intermediate after two seed runs.

- [ ] **Step 2: Run only the new/affected tests and verify RED**

Run:

```powershell
pnpm --filter @worklingo/api exec vitest run src/learning-programs/infrastructure/seed-learning-programs.spec.ts test/integration/learning-program-migration.integration.spec.ts test/integration/admin-curriculum-schema.integration.spec.ts test/integration/curriculum-seed.integration.spec.ts
```

Expected: FAIL because `LearningProgram`, `programId` and seed interfaces do not exist.

- [ ] **Step 3: Add the Prisma model and additive migration**

Implement `ProgramAvailabilityStatus` and `LearningProgram` exactly as the spec defines. Add `LearningPath.programId String @default("10000000-0000-4000-8000-000000000002") @db.Uuid`, using the same literal UUID stored in `INTERMEDIATE_PROGRAM_ID`, plus the relation with `onDelete: Restrict` and `@@index([programId, status])`.

The SQL migration must create and seed the four programs, add nullable `programId`, backfill all existing rows by the Intermediate UUID, guard against remaining nulls, then add the default, non-null constraint, foreign key and index. It must not update any other table or identifier.

- [ ] **Step 4: Add the canonical catalog and idempotent seed**

In `program-catalog.ts`, export a readonly four-row catalog with exact slugs/statuses/order and closed icon keys. In `seed-learning-programs.ts`, implement:

```ts
export async function seedLearningPrograms(
  database: Pick<PrismaClient, 'learningProgram'>,
): Promise<void>
```

Upsert by slug; preserve database IDs and operator-edited descriptive fields on update, while ensuring a missing catalog can be recreated with canonical IDs. Call it before curriculum seeds in `prisma/seed.ts`; make `seedFoundationCurriculum` explicitly connect its path to Intermediate without changing its stable slug/ID behavior.

- [ ] **Step 5: Generate Prisma and run the targeted GREEN tests**

Run:

```powershell
pnpm --filter @worklingo/api exec prisma generate
pnpm --filter @worklingo/api exec vitest run src/learning-programs/infrastructure/seed-learning-programs.spec.ts test/integration/learning-program-migration.integration.spec.ts test/integration/admin-curriculum-schema.integration.spec.ts test/integration/curriculum-seed.integration.spec.ts
```

Expected: all selected tests PASS; migration test proves historical IDs survive.

- [ ] **Step 6: Commit the persistence slice**

```powershell
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20261012000100_learning_programs/migration.sql apps/api/prisma/seed.ts apps/api/src/learning-programs apps/api/src/curriculum/infrastructure/seed-foundation.ts apps/api/test/integration/learning-program-migration.integration.spec.ts apps/api/test/integration/admin-curriculum-schema.integration.spec.ts apps/api/test/integration/curriculum-seed.integration.spec.ts
git commit -m "feat: add learning program hierarchy"
```

### Task 2: Define the closed catalog contract and learner API

**Files:**
- Create: `packages/contracts/src/learning-program.contracts.ts`
- Create: `packages/contracts/src/learning-program.contracts.spec.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `apps/api/src/learning-programs/domain/program-availability.ts`
- Create: `apps/api/src/learning-programs/domain/program-availability.spec.ts`
- Create: `apps/api/src/learning-programs/application/learning-programs.service.ts`
- Create: `apps/api/src/learning-programs/application/learning-programs.service.spec.ts`
- Create: `apps/api/src/learning-programs/learning-programs.controller.ts`
- Create: `apps/api/src/learning-programs/learning-programs.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/integration/learning-programs-api.integration.spec.ts`

**Interfaces:**
- Produces: `programAvailabilityStatusSchema`, `programIconKeySchema`, `learningProgramCatalogItemSchema`, `learningProgramCatalogSchema`, `LearningProgramCatalogItemDto`, and `LearningProgramCatalogDto` from `@worklingo/contracts`.
- Produces: `deriveProgramAccess({ slug, availabilityStatus }): { isSelectable: boolean; destination: '/dashboard' | null }`.
- Produces: `LearningProgramsService.listCatalog(): Promise<LearningProgramCatalogDto>`.
- Produces: authenticated learner route `GET /api/v1/learning-programs`.

- [ ] **Step 1: Write failing contract and policy tests**

Contract tests assert all five statuses, exactly four icon keys, nullable closed destination `/dashboard`, integer non-negative published counts, and strict rejection of unknown keys/extra fields. Policy table tests assert Intermediate `AVAILABLE`/`BETA` maps to `/dashboard`, unavailable statuses map to `null`, and any selectable status without an approved destination remains non-selectable rather than producing a URL.

- [ ] **Step 2: Run contract/policy tests and verify RED**

```powershell
pnpm --filter @worklingo/contracts exec vitest run src/learning-program.contracts.spec.ts
pnpm --filter @worklingo/api exec vitest run src/learning-programs/domain/program-availability.spec.ts
```

Expected: FAIL because schemas and policy do not exist.

- [ ] **Step 3: Implement the contracts and pure availability policy**

Define one strict catalog response `{ programs: LearningProgramCatalogItemDto[] }`. Each item contains `slug`, `name`, `description`, `learningGoal`, `proficiencyLabel`, `iconKey`, `availabilityStatus`, `isSelectable`, `destination`, `publishedPathCount`, and `publishedLevelCount`.

Keep destination mapping in `program-availability.ts`; do not persist or accept arbitrary route strings.

- [ ] **Step 4: Write failing service and HTTP integration tests**

Service tests assert deterministic `displayOrder`, `DISABLED` omission, published-only aggregate counts, policy-derived destination, and a redacted `503 PROGRAM_CATALOG_UNAVAILABLE` when database rows violate the closed output contract or the query fails. HTTP integration tests assert learner success, unauthenticated `401`, and non-Learner denial under the existing role policy.

- [ ] **Step 5: Implement and register `LearningProgramsModule`**

Implement:

```ts
export class LearningProgramsService {
  async listCatalog(): Promise<LearningProgramCatalogDto>
}
```

Query non-disabled programs ordered by `displayOrder, id`; count only published paths and published levels under published paths. Parse the assembled response with the shared Zod schema. Convert all query/parse failures to `ServiceUnavailableException` with safe body `{ code: 'PROGRAM_CATALOG_UNAVAILABLE', message, statusCode: 503 }` and no raw database error.

Register a `@Roles('LEARNER')` controller at `learning-programs` and import the module in `AppModule`.

- [ ] **Step 6: Run the targeted API slice**

```powershell
pnpm --filter @worklingo/contracts exec vitest run src/learning-program.contracts.spec.ts
pnpm --filter @worklingo/api exec vitest run src/learning-programs test/integration/learning-programs-api.integration.spec.ts
```

Expected: all selected tests PASS.

- [ ] **Step 7: Commit the learner catalog API**

```powershell
git add packages/contracts/src/learning-program.contracts.ts packages/contracts/src/learning-program.contracts.spec.ts packages/contracts/src/index.ts apps/api/src/learning-programs apps/api/src/app.module.ts apps/api/test/integration/learning-programs-api.integration.spec.ts
git commit -m "feat: expose learning program catalog"
```

### Task 3: Make Admin curriculum program-aware and legacy-safe

**Files:**
- Modify: `packages/contracts/src/admin-curriculum.contracts.ts`
- Modify: `packages/contracts/src/admin-curriculum.contracts.spec.ts`
- Modify: `apps/api/src/admin-curriculum/dto/curriculum-command.dto.ts`
- Modify: `apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts`
- Modify: `apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts`
- Modify: `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.ts`
- Modify: `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.spec.ts`
- Modify: `apps/api/test/integration/admin-curriculum-commands.integration.spec.ts`
- Modify: `apps/api/test/integration/admin-curriculum-query.integration.spec.ts`
- Modify: `apps/web/src/lib/api/admin-curriculum-client.test.ts`
- Modify: `apps/web/src/features/admin-curriculum/curriculum-workspace.tsx`
- Modify: `apps/web/src/features/admin-curriculum/curriculum-workspace.test.tsx`
- Modify: `apps/web/src/features/admin-curriculum/curriculum.css`

**Interfaces:**
- Consumes: Prisma `LearningProgram`, `INTERMEDIATE_PROGRAM_ID`, and shared program status contract from Tasks 1–2.
- Produces: optional `CreateLearningPathInput.programId?: string`.
- Produces: `AdminProgramOptionDto`, required `AdminLearningPathItemDto.program`, and `AdminCurriculumTreeDto.programs`.
- Preserves: all existing path command routes, idempotency, revision and audit semantics.

- [ ] **Step 1: Write failing contract and command tests**

Assert that path input accepts an optional UUID `programId` but rejects malformed IDs. Command tests cover explicit IELTS assignment, omitted assignment defaulting to Intermediate, missing/disabled program rejection with `422 INVALID_CURRICULUM_RELATIONSHIP`, safe audit metadata, and semantic idempotency: omitted and explicit Intermediate with the same key/payload replay one result rather than conflict.

- [ ] **Step 2: Run targeted contracts/API tests and verify RED**

```powershell
pnpm --filter @worklingo/contracts exec vitest run src/admin-curriculum.contracts.spec.ts
pnpm --filter @worklingo/api exec vitest run src/admin-curriculum/application/admin-curriculum-command.service.spec.ts src/admin-curriculum/application/admin-curriculum-query.service.spec.ts test/integration/admin-curriculum-commands.integration.spec.ts test/integration/admin-curriculum-query.integration.spec.ts
```

Expected: FAIL on missing program-aware contracts and behavior.

- [ ] **Step 3: Extend Admin contracts and DTO validation**

Add the optional UUID to the create schema/DTO. Define a strict program option containing `id`, `slug`, `name`, `availabilityStatus`; embed it in every path item and return the ordered options at tree root.

- [ ] **Step 4: Implement program-aware query and command behavior**

Before checking the create receipt, normalize `input.programId ?? INTERMEDIATE_PROGRAM_ID`; include the normalized ID in the request hash. In the transaction, require the program to exist and not be `DISABLED`, create the path with that ID, return the nested program summary, and record only stable program ID/slug in audit metadata.

Load/return the relation in update, publish and archive path responses. `getTree()` returns all non-disabled program options in display order and includes each path's program.

- [ ] **Step 5: Write failing Admin UI tests**

Update fixtures to include programs. Assert the New Path form defaults to Intermediate, lists all non-disabled options with status text, sends the selected `programId`, preserves selection after a recoverable error, and renders each path's program label.

- [ ] **Step 6: Implement the Admin selector and path labels**

Add one accessible labeled `<select>` to the existing path form and a visible program/status line in each path card. Do not add program CRUD or status mutation controls.

- [ ] **Step 7: Run the Admin slice**

```powershell
pnpm --filter @worklingo/contracts exec vitest run src/admin-curriculum.contracts.spec.ts
pnpm --filter @worklingo/api exec vitest run src/admin-curriculum/application/admin-curriculum-command.service.spec.ts src/admin-curriculum/application/admin-curriculum-query.service.spec.ts test/integration/admin-curriculum-commands.integration.spec.ts test/integration/admin-curriculum-query.integration.spec.ts
pnpm --filter @worklingo/web exec vitest run src/lib/api/admin-curriculum-client.test.ts src/features/admin-curriculum/curriculum-workspace.test.tsx
```

Expected: all selected tests PASS.

- [ ] **Step 8: Commit the Admin compatibility slice**

```powershell
git add packages/contracts/src/admin-curriculum.contracts.ts packages/contracts/src/admin-curriculum.contracts.spec.ts apps/api/src/admin-curriculum apps/api/test/integration/admin-curriculum-commands.integration.spec.ts apps/api/test/integration/admin-curriculum-query.integration.spec.ts apps/web/src/lib/api/admin-curriculum-client.test.ts apps/web/src/features/admin-curriculum
git commit -m "feat: categorize admin curriculum by program"
```

### Task 4: Build the responsive learner program catalog

**Files:**
- Create: `apps/web/src/lib/api/learning-program-client.ts`
- Create: `apps/web/src/lib/api/learning-program-client.test.ts`
- Create: `apps/web/src/features/learning-programs/program-catalog.tsx`
- Create: `apps/web/src/features/learning-programs/program-catalog.test.tsx`
- Create: `apps/web/src/features/learning-programs/program-catalog.css`
- Create: `apps/web/src/app/(learner)/programs/page.tsx`
- Create: `apps/web/src/app/(learner)/programs/layout.tsx`
- Modify: `apps/web/src/app/(learner)/layout.tsx`
- Modify: `apps/web/src/app/(learner)/layout.test.tsx`
- Modify: `apps/web/src/features/learning-session/dashboard-view.tsx`
- Modify: `apps/web/src/features/learning-session/dashboard-view.test.tsx`

**Interfaces:**
- Consumes: `learningProgramCatalogSchema` and DTOs from Task 2.
- Produces: `LearningProgramClient.getCatalog(): Promise<LearningProgramCatalogDto>`.
- Produces: `ProgramCatalog` client component and authenticated `/programs` route.

- [ ] **Step 1: Write failing client tests**

Assert authenticated `GET /api/v1/learning-programs`, strict response parsing, safe `ApiError` for non-OK responses, and rejection of an arbitrary destination/icon/status payload.

- [ ] **Step 2: Implement the focused catalog client and run it GREEN**

```powershell
pnpm --filter @worklingo/web exec vitest run src/lib/api/learning-program-client.test.ts
```

Expected: PASS after `getCatalog()` is implemented with `credentials: 'include'` and shared schema parsing.

- [ ] **Step 3: Write failing catalog component and navigation tests**

Component tests assert:

- Loading status and retryable error preserve a usable page heading.
- Four seeded cards render in API order with visible status text.
- Intermediate renders a real `/dashboard` link.
- Beginner, TOEIC and IELTS render non-interactive unavailable actions; Enter/Space cannot navigate.
- Beta label is explicit when supplied by a fixture.
- Accessible names do not rely on color or icon.

Layout/dashboard tests assert a Programs navigation link and dashboard discovery link while preserving existing Audio settings, Mastery and auth behavior.

- [ ] **Step 4: Implement the page, component and responsive styles**

Use semantic `main`, heading hierarchy, list/cards, text status badges and at least 44px actions. Use the closed icon-key component map; do not use remote images or `dangerouslySetInnerHTML`. Include loading, empty, error and retry states. Respect reduced motion and prevent horizontal overflow at 320px.

- [ ] **Step 5: Run the focused web tests**

```powershell
pnpm --filter @worklingo/web exec vitest run src/lib/api/learning-program-client.test.ts src/features/learning-programs/program-catalog.test.tsx 'src/app/(learner)/layout.test.tsx' src/features/learning-session/dashboard-view.test.tsx
```

Expected: all selected tests PASS.

- [ ] **Step 6: Commit the learner catalog experience**

```powershell
git add apps/web/src/lib/api/learning-program-client.ts apps/web/src/lib/api/learning-program-client.test.ts apps/web/src/features/learning-programs 'apps/web/src/app/(learner)/programs' 'apps/web/src/app/(learner)/layout.tsx' 'apps/web/src/app/(learner)/layout.test.tsx' apps/web/src/features/learning-session/dashboard-view.tsx apps/web/src/features/learning-session/dashboard-view.test.tsx
git commit -m "feat: add learner program catalog"
```

### Task 5: Prove the cross-surface journey and record the architecture decision

**Files:**
- Create: `apps/web/e2e/program-catalog.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/e2e/admin-curriculum-audit.spec.ts`
- Add: `docs/superpowers/specs/2026-10-12-ielts-phase-1-program-categorization-design.md`
- Add: `docs/superpowers/plans/2026-10-12-ielts-phase-1-program-categorization.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/USER_FLOWS.md`
- Modify: `docs/DECISIONS.md`

**Interfaces:**
- Consumes: completed API, Admin and Learner slices.
- Produces: desktop/mobile Playwright coverage and permanent architectural documentation.

- [ ] **Step 1: Write the failing learner E2E journey**

Register a learner, complete self-placement, open `/programs`, assert the four cards and no horizontal overflow, open Intermediate to `/dashboard`, then return and prove the three unavailable actions do not change URL or create a session. Run the same test under Desktop Chrome and Pixel 5 projects.

- [ ] **Step 2: Extend the Admin E2E journey**

Select IELTS while creating a new draft path and assert the path is labeled IELTS. Keep unique project-qualified slugs/codes and existing audit privacy checks.

- [ ] **Step 3: Register and run only the new/changed Playwright projects**

```powershell
pnpm --filter @worklingo/web exec playwright test e2e/program-catalog.spec.ts e2e/admin-curriculum-audit.spec.ts --project=programs-desktop --project=programs-mobile --project=admin-desktop --project=admin-mobile
```

Expected: the named projects run the intended desktop/mobile journeys. If an assertion fails, preserve the trace and fix only the exposed integration gap; if all pass, do not manufacture a failure.

- [ ] **Step 4: Complete only wiring exposed by E2E**

Fix route selectors, API proxy assumptions, responsive CSS or seed ordering exposed by the journeys. Do not add IELTS content, enrollment or unrelated redesign.

- [ ] **Step 5: Document the accepted boundary**

Add the program layer and data flow to Architecture/Data Model, document `GET /learning-programs` and Admin `programId`, add catalog selection to User Flows, and record a new accepted decision: `LearningProgram` is the durable parent of `LearningPath`; existing content is Intermediate; enrollment and IELTS-specific activity contracts are deferred.

- [ ] **Step 6: Rerun the targeted cross-surface gate**

Run the same Playwright command plus:

```powershell
pnpm --filter @worklingo/api exec vitest run test/integration/learning-program-migration.integration.spec.ts test/integration/learning-programs-api.integration.spec.ts test/integration/admin-curriculum-commands.integration.spec.ts
```

Expected: all selected tests PASS.

- [ ] **Step 7: Commit E2E and documentation**

```powershell
git add apps/web/e2e/program-catalog.spec.ts apps/web/e2e/admin-curriculum-audit.spec.ts apps/web/playwright.config.ts docs/superpowers/specs/2026-10-12-ielts-phase-1-program-categorization-design.md docs/superpowers/plans/2026-10-12-ielts-phase-1-program-categorization.md docs/ARCHITECTURE.md docs/DATA_MODEL.md docs/API_CONTRACTS.md docs/USER_FLOWS.md docs/DECISIONS.md
git commit -m "test: verify program categorization journey"
```

### Task 6: Final review, full verification and integration

**Files:**
- Review: all branch changes against `docs/superpowers/specs/2026-10-12-ielts-phase-1-program-categorization-design.md`
- Modify only if findings require fixes.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: one fully verified branch with no unresolved Critical/Important finding, pushed and merged to `main` through a PR.

- [ ] **Step 1: Run the final repository gate once**

```powershell
pnpm verify
```

Expected: format, setup-local tests, lint, typecheck, unit/integration tests, build and all Playwright projects PASS.

- [ ] **Step 2: Review the complete branch**

Invoke `code-review-and-quality` and `superpowers:requesting-code-review`. Review migration safety, authorization, contract strictness, Admin idempotency/audit behavior, accessibility, responsive layout, old URL/session regression and scope boundaries. Record findings by severity.

- [ ] **Step 3: Fix valid findings with targeted tests**

For each fix, first add or tighten the smallest failing test, run only that file/package, implement the fix, and rerun the same test. If any fix changes behavior covered by the full gate, rerun `pnpm verify` once after all fixes; otherwise retain the existing full-gate evidence.

- [ ] **Step 4: Inspect final scope and repository state**

```powershell
git diff origin/main...HEAD --check
git status --short --branch
git log --oneline origin/main..HEAD
```

Expected: no whitespace errors, no unrelated/untracked runtime files, and only approved Phase 1 scope.

- [ ] **Step 5: Commit any final review fixes explicitly**

Stage only reviewed files and use an atomic message such as:

```powershell
git commit -m "fix: harden learning program categorization"
```

Skip this step when review produced no changes.

- [ ] **Step 6: Push, open/attach PR, and merge after checks**

Push `codex/ielts-learning-system`, open a PR to `main`, attach the PR artifact, confirm the PR diff/checks, merge without rewriting history, and verify `origin/main` contains the merge commit. Do not delete or archive the IELTS worktree because subsequent IELTS phases continue from this program foundation.
