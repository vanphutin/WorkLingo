# Foundation Learning Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, testable vertical slice where a learner can register, log in, start a seeded 60-minute Foundation session, complete activities, resume after refresh, and view basic progress.

**Architecture:** Use a pnpm TypeScript monorepo with a Next.js responsive web app, a NestJS modular monolith, PostgreSQL through Prisma, and a local filesystem storage adapter. The first slice uses approved seed content and deterministic evaluation; admin import, adaptive mastery, and live AI remain separate increments.

**Tech Stack:** Node.js 20.x, pnpm 10.x, TypeScript, Next.js, NestJS, PostgreSQL, Prisma, Zod, Vitest, Supertest, Playwright, Docker Compose.

**Spec:** `docs/VISION.md`, `docs/PRODUCT.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `docs/TEST_STRATEGY.md`

## Global Constraints

- MVP infrastructure and application data MUST run locally; this plan adds no AWS, S3, Redis, CDN, or managed database.
- The default learning session MUST be exactly 60 minutes and contain four 15-minute blocks: `activate`, `readDecode`, `listenReason`, and `respond`.
- Every generated session MUST include listening, speaking, reading, and writing coverage.
- Published lesson versions MUST be immutable; a session MUST retain the lesson version it started with.
- Session progress MUST be persisted after every activity and block.
- API secrets MUST remain backend-only; this increment uses no live AI provider.
- Desktop is the optimized experience; learner flows MUST remain usable on a mobile viewport.
- `AGENTS.md` is existing user work and MUST not be modified or staged unless the user explicitly requests it.

## Review Focus

- Duplicate register/login or replayed attempt requests must return stable results without creating duplicate records; Tasks 3 and 6 pin this with uniqueness/idempotency tests.
- A learner must never read or mutate another learner's session; Task 6 pins this with an ownership integration test.
- Seed reruns must not create duplicate curriculum or lesson versions; Task 4 pins this with a repeatable-seed test.
- A refresh between answer submission and navigation must restore the persisted checkpoint; Tasks 6 and 7 pin this in API and E2E tests.
- A lesson missing any of the four skills must fail session creation instead of producing a partial session; Task 5 pins this with a planner invariant test.

---

## Target file map

```text
apps/api/src/
├── app.module.ts
├── common/config/               validated environment configuration
├── common/database/             Prisma lifecycle and transaction access
├── auth/                        register, login, logout, current user
├── users/                       learner profile and consent preferences
├── curriculum/                  paths, levels, missions, immutable lessons
├── learning-sessions/           planner, sessions, attempts, checkpoints
├── progress/                    first-slice aggregate progress read model
├── storage/                     ObjectStorage port and local adapter
└── health/                      local dependency health

apps/web/src/
├── app/(auth)/                  register and login
├── app/(learner)/dashboard/     next mission and recent progress
├── app/(learner)/sessions/      session shell and activity flow
├── features/auth/               forms and API mutations
├── features/learning-session/   typed activity renderers and persistence
└── lib/api/                     generated/typed API client

packages/contracts/src/          Zod schemas and inferred API types
packages/test-fixtures/src/      Foundation mission and lesson fixtures
```

### Task 1: Workspace foundation and quality gates

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `infra/docker-compose.yml`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/test/smoke/app.smoke.spec.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/page.test.tsx`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: none.
- Produces: workspace commands `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; API bootstrap on `API_PORT`; web bootstrap on `WEB_PORT`; package `@worklingo/contracts`.

- [ ] **Step 1: Write failing smoke tests for both applications**

Create `app.smoke.spec.ts` asserting a Nest testing module can compile `AppModule`. Create `page.test.tsx` asserting the home page renders the text `WorkLingo`.

- [ ] **Step 2: Run the smoke tests and verify the workspace is not yet runnable**

Run: `pnpm test`

Expected: FAIL because workspace manifests/configuration or application modules do not exist.

- [ ] **Step 3: Scaffold the minimal pnpm workspace**

Pin `packageManager` to the installed pnpm 10 line, set Node engine to `>=20 <21`, and add root scripts that delegate to workspace packages. Configure strict TypeScript without weakening `strict`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes`.

- [ ] **Step 4: Add local infrastructure and environment contract**

`infra/docker-compose.yml` exposes PostgreSQL only to localhost. `.env.example` defines `DATABASE_URL`, `API_PORT`, `WEB_PORT`, `WORKLINGO_DATA_DIR`, `SESSION_SECRET`, and `NEXT_PUBLIC_API_BASE_URL` with non-secret development examples. `.gitignore` excludes `.env*` except `.env.example`, `node_modules`, build output, coverage, and `/data`.

- [ ] **Step 5: Implement minimal web and API bootstraps**

The Nest app uses a global `/api/v1` prefix and validation pipe. The Next page renders a semantic heading and a link placeholder for learner onboarding; no design system dependency is added yet.

- [ ] **Step 6: Install dependencies and run all foundation gates**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all commands exit 0; both app smoke tests PASS.

- [ ] **Step 7: Commit the foundation**

```bash
git add .gitignore .env.example package.json pnpm-workspace.yaml tsconfig.base.json infra apps/api apps/web packages/contracts pnpm-lock.yaml
git commit -m "chore: scaffold local WorkLingo workspace"
```

### Task 2: Validated config, PostgreSQL, health, and local storage

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_foundation/migration.sql`
- Create: `apps/api/src/common/config/app-config.schema.ts`
- Create: `apps/api/src/common/config/app-config.module.ts`
- Create: `apps/api/src/common/database/prisma.service.ts`
- Create: `apps/api/src/common/database/database.module.ts`
- Create: `apps/api/src/storage/domain/object-storage.port.ts`
- Create: `apps/api/src/storage/infrastructure/local-object-storage.adapter.ts`
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Test: `apps/api/src/common/config/app-config.schema.spec.ts`
- Test: `apps/api/src/storage/infrastructure/local-object-storage.adapter.spec.ts`
- Test: `apps/api/test/integration/health.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: environment variables from Task 1.
- Produces: `AppConfig` validated at startup; `PrismaService`; `ObjectStorage` with `put(input: PutObjectInput): Promise<StoredObject>`, `read(key: string): Promise<NodeJS.ReadableStream>`, and `delete(key: string): Promise<void>`; `GET /api/v1/health`.

- [ ] **Step 1: Write failing config tests**

Assert missing `DATABASE_URL`, `SESSION_SECRET`, or `WORKLINGO_DATA_DIR` fails validation; valid config normalizes ports to numbers and resolves the data directory to an absolute path.

- [ ] **Step 2: Run the config tests and verify failure**

Run: `pnpm --filter api test -- app-config.schema.spec.ts`

Expected: FAIL because `parseAppConfig(env)` is undefined.

- [ ] **Step 3: Implement `parseAppConfig(env: NodeJS.ProcessEnv): AppConfig`**

Use Zod. Reject a production-like run with a known placeholder `SESSION_SECRET`; keep test fixtures explicit rather than reading ambient developer secrets.

- [ ] **Step 4: Write failing storage path-safety tests**

Test round-trip write/read/delete under a temporary directory and assert keys containing `..`, absolute paths, or a path escaping the configured root throw `UnsafeStorageKeyError`.

- [ ] **Step 5: Implement the storage port and local adapter**

Use generated UUID file keys and atomic temp-file rename. Do not expose filesystem paths through the domain interface.

- [ ] **Step 6: Write the failing health integration test**

Start the Nest test app against the test database; assert `GET /api/v1/health` returns `200`, `status: "ok"`, and named checks for `database` and `storage` without returning connection strings or filesystem roots.

- [ ] **Step 7: Add Prisma, the initial migration, and health module**

The initial migration establishes Prisma migration state without domain tables; Task 3 owns the first domain tables. The database health check executes `SELECT 1`. The storage health check writes and deletes a probe object under a reserved `health/` prefix.

- [ ] **Step 8: Run unit and integration tests**

Run: `docker compose -f infra/docker-compose.yml up -d postgres && pnpm --filter api prisma migrate deploy && pnpm --filter api test`

Expected: all config, storage, and health tests PASS.

- [ ] **Step 9: Commit local persistence foundations**

```bash
git add apps/api/prisma apps/api/src/common apps/api/src/storage apps/api/src/health apps/api/src/app.module.ts
git commit -m "feat: add local database and storage foundations"
```

### Task 3: Authentication and learner profile

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_auth/migration.sql`
- Create: `packages/contracts/src/auth.contracts.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/application/auth.service.ts`
- Create: `apps/api/src/auth/infrastructure/password-hasher.ts`
- Create: `apps/api/src/auth/infrastructure/session-auth.guard.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/application/users.service.ts`
- Test: `apps/api/test/integration/auth.integration.spec.ts`
- Create: `apps/web/src/app/(auth)/register/page.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/features/auth/auth-form.tsx`
- Test: `apps/web/src/features/auth/auth-form.test.tsx`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: `PrismaService`, validated session secret, shared Zod contract package.
- Produces: `register(input: RegisterInput): Promise<AuthUser>`, `login(input: LoginInput): Promise<AuthUser>`, `logout(sessionId: string): Promise<void>`, `getCurrentUser(userId: string): Promise<CurrentUser>`; `POST /api/v1/auth/register`, `/login`, `/logout`; `GET /api/v1/me`.

- [ ] **Step 1: Write failing auth integration tests**

Cover successful registration/login, normalized lowercase email uniqueness, invalid password validation, wrong credentials returning the same public error, session cookie creation, logout invalidation, and duplicate registration producing `409` without a second user.

- [ ] **Step 2: Run the auth integration tests and verify failure**

Run: `pnpm --filter api test:integration -- auth.integration.spec.ts`

Expected: FAIL because routes and tables do not exist.

- [ ] **Step 3: Add auth schema and shared contracts**

Create `User`, `LearnerProfile`, and `UserSession`. User email is unique after normalization. Store only password hashes and hashed session tokens; role defaults to `LEARNER`.

- [ ] **Step 4: Implement the auth service and HTTP boundary**

Use Argon2id. Set an HTTP-only, SameSite=Lax cookie in local mode. The guard attaches an `AuthenticatedUser` containing `userId` and roles; controllers never accept user IDs from learner requests when ownership can come from auth.

- [ ] **Step 5: Run auth integration tests**

Run: `pnpm --filter api prisma migrate deploy && pnpm --filter api test:integration -- auth.integration.spec.ts`

Expected: PASS for all auth and duplicate-request cases.

- [ ] **Step 6: Write failing web form tests**

Assert accessible labels, client-side schema messages, disabled submit while pending, generic invalid-credentials copy, and redirect to `/dashboard` on success.

- [ ] **Step 7: Implement register/login pages using shared contracts**

Use the typed API client and credentials-enabled requests. Do not persist tokens in localStorage.

- [ ] **Step 8: Run web tests and accessibility smoke**

Run: `pnpm --filter web test -- auth-form.test.tsx && pnpm --filter web typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 9: Commit authentication**

```bash
git add apps/api/prisma apps/api/src/auth apps/api/src/users apps/api/test/integration/auth.integration.spec.ts apps/web/src/app/\(auth\) apps/web/src/features/auth packages/contracts/src
git commit -m "feat: add learner authentication"
```

### Task 4: Seeded curriculum and immutable lesson version

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_curriculum/migration.sql`
- Create: `packages/test-fixtures/src/foundation-mission.fixture.ts`
- Create: `packages/test-fixtures/package.json`
- Create: `packages/test-fixtures/src/index.ts`
- Create: `apps/api/src/curriculum/domain/curriculum.types.ts`
- Create: `apps/api/src/curriculum/application/curriculum.service.ts`
- Create: `apps/api/src/curriculum/curriculum.module.ts`
- Create: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/integration/curriculum-seed.integration.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`; Foundation fixture from `@worklingo/test-fixtures`.
- Produces: `getPublishedMissionForLevel(levelCode: string): Promise<PublishedMission>` and a repeatable `pnpm --filter api db:seed`; entities `LearningPath`, `Level`, `Mission`, `Lesson`, `LessonVersion`, `ContentBlock`, `Activity`, `WordBank`, and `LanguageBlock`.

- [ ] **Step 1: Define the approved Foundation fixture**

Create one mission titled `Introduce yourself to a new colleague` with a published lesson version, one small Word Bank, at least four Language Blocks, and activities covering reading, listening, speaking, and writing. Use a local fixture audio file or a deterministic text-only audio placeholder contract; do not call TTS.

- [ ] **Step 2: Write the failing repeatable-seed integration test**

Run the seed twice and assert one path, one Foundation 1 level, one mission, one logical lesson, one version `1`, and stable activity IDs/slugs. Assert a published lesson version cannot be updated through `CurriculumService`.

- [ ] **Step 3: Run the seed test and verify failure**

Run: `pnpm --filter api test:integration -- curriculum-seed.integration.spec.ts`

Expected: FAIL because schema, seed, and service do not exist.

- [ ] **Step 4: Add curriculum schema and migration**

Model the relationships and unique constraints from `docs/DATA_MODEL.md`. Store activity payload as validated JSON tied to an explicit `activityType`; defer generalized admin import fields to Increment 2.

- [ ] **Step 5: Implement deterministic upsert seed and read service**

Seed keys are stable slugs. Only draft content may be changed; published version writes require creating the next version.

- [ ] **Step 6: Run migration, seed, and tests twice**

Run: `pnpm --filter api prisma migrate deploy && pnpm --filter api db:seed && pnpm --filter api db:seed && pnpm --filter api test:integration -- curriculum-seed.integration.spec.ts`

Expected: all commands exit 0; counts remain stable; immutability assertion PASS.

- [ ] **Step 7: Commit curriculum seed**

```bash
git add apps/api/prisma apps/api/src/curriculum packages/test-fixtures
git commit -m "feat: seed the first Foundation mission"
```

### Task 5: Deterministic 60-minute session planner

**Files:**
- Create: `packages/contracts/src/learning-session.contracts.ts`
- Create: `apps/api/src/learning-sessions/domain/session-plan.types.ts`
- Create: `apps/api/src/learning-sessions/domain/session-planner.ts`
- Test: `apps/api/src/learning-sessions/domain/session-planner.spec.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: `PublishedMission` from Task 4.
- Produces: `planFoundationSession(input: PlanFoundationSessionInput): SessionPlan`; `SessionPlan` contains exactly four ordered `SessionBlock`s of 15 target minutes and an immutable ordered list of activity IDs.

- [ ] **Step 1: Write the failing happy-path planner test**

Assert `durationMinutes: 60` returns block types `activate`, `readDecode`, `listenReason`, `respond`; each block has `targetMinutes: 15`; the plan covers the four skills exactly as a set even if an activity covers more than one skill.

- [ ] **Step 2: Write the failing invariant tests from Review Focus**

Assert unsupported duration returns `UnsupportedSessionDurationError`; missing speaking, writing, reading, or listening returns `IncompleteSkillCoverageError` naming missing skills; duplicate activity IDs return `InvalidLessonPlanError`.

- [ ] **Step 3: Run planner tests and verify failure**

Run: `pnpm --filter api test -- session-planner.spec.ts`

Expected: FAIL because planner types and function do not exist.

- [ ] **Step 4: Implement the pure planner**

Keep the planner deterministic and free of database/time access. It assigns seeded activities to the fixed four-block template and deep-freezes or treats the returned plan as readonly data.

- [ ] **Step 5: Run planner tests and mutation/type checks**

Run: `pnpm --filter api test -- session-planner.spec.ts && pnpm --filter api typecheck`

Expected: all planner tests PASS; no mutable contract mismatch.

- [ ] **Step 6: Commit the planner**

```bash
git add apps/api/src/learning-sessions/domain packages/contracts/src
git commit -m "feat: plan complete 60-minute learning sessions"
```

### Task 6: Session persistence, attempts, checkpoints, and ownership

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_learning_sessions/migration.sql`
- Create: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Create: `apps/api/src/learning-sessions/learning-sessions.controller.ts`
- Create: `apps/api/src/learning-sessions/learning-sessions.module.ts`
- Create: `apps/api/src/progress/application/progress.service.ts`
- Create: `apps/api/src/progress/progress.controller.ts`
- Create: `apps/api/src/progress/progress.module.ts`
- Test: `apps/api/test/integration/learning-sessions.integration.spec.ts`
- Test: `apps/api/test/integration/session-ownership.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: authenticated user, `CurriculumService.getPublishedMissionForLevel`, and `planFoundationSession`.
- Produces: `createSession(userId: string, durationMinutes: 60): Promise<LearningSessionDto>`, `submitAttempt(userId: string, activityId: string, input: SubmitAttemptInput): Promise<ActivityAttemptDto>`, `pauseSession`, `resumeSession`, and `getProgress`; endpoints in `docs/API_CONTRACTS.md` for learning sessions, activity attempts, and `/me/progress`.

- [ ] **Step 1: Write failing session creation integration tests**

Assert authenticated creation persists the lesson version and plan snapshot; unauthenticated request is `401`; duration `45` is `422` in this increment rather than silently accepted; repeated creation requests with the same `clientSessionId` return the original session.

- [ ] **Step 2: Write failing attempt/checkpoint tests**

Assert a deterministic seeded question can be submitted, the raw answer persists before evaluation, repeated `clientAttemptId` returns the same attempt, and successful submission advances `currentCheckpoint` exactly once.

- [ ] **Step 3: Write failing ownership and refresh tests**

Create two learners. Assert learner B receives `404` for learner A's session and attempt endpoints. Recreate the HTTP client after submission and assert `GET /learning-sessions/{id}` returns the persisted next checkpoint.

- [ ] **Step 4: Run integration tests and verify failure**

Run: `pnpm --filter api test:integration -- learning-sessions.integration.spec.ts session-ownership.integration.spec.ts`

Expected: FAIL because persistence and endpoints do not exist.

- [ ] **Step 5: Add session schema and migration**

Create `LearningSession`, `SessionBlock`, and `ActivityAttempt`. Store `planSnapshot`, `lessonVersionId`, status, checkpoint, raw response, normalized response, evaluation status, score, and feedback. Add unique constraints for `(learnerId, clientSessionId)` and `(learnerId, clientAttemptId)`.

- [ ] **Step 6: Implement create/start/read/pause/resume**

Use authenticated `userId`, never a learner ID from the body. Persist the complete plan transactionally. State transitions outside `planned → in_progress ↔ paused → completed` return `INVALID_STATE_TRANSITION`.

- [ ] **Step 7: Implement deterministic attempt evaluation and progress summary**

For this increment, evaluate only seeded exact/accepted-answer activities in-process. Speaking/writing attempts store submission and receive `submitted` credit without AI quality scoring; the UI labels them as awaiting advanced feedback, not as correct.

- [ ] **Step 8: Run migrations and integration tests**

Run: `pnpm --filter api prisma migrate deploy && pnpm --filter api test:integration -- learning-sessions.integration.spec.ts session-ownership.integration.spec.ts`

Expected: all tests PASS, including duplicate IDs, ownership, and refresh restore.

- [ ] **Step 9: Commit session persistence**

```bash
git add apps/api/prisma apps/api/src/learning-sessions apps/api/src/progress apps/api/src/app.module.ts apps/api/test/integration
git commit -m "feat: persist resumable learning sessions"
```

### Task 7: Learner dashboard and responsive session shell

**Files:**
- Create: `apps/web/src/lib/api/api-client.ts`
- Create: `apps/web/src/app/(learner)/layout.tsx`
- Create: `apps/web/src/app/(learner)/dashboard/page.tsx`
- Create: `apps/web/src/app/(learner)/sessions/[sessionId]/page.tsx`
- Create: `apps/web/src/features/learning-session/session-shell.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderer.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/reading-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/speaking-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/writing-activity.tsx`
- Create: `apps/web/src/features/learning-session/session-shell.test.tsx`
- Create: `apps/web/e2e/foundation-session.spec.ts`
- Create: `apps/web/playwright.config.ts`

**Interfaces:**
- Consumes: auth and learning-session contracts/endpoints from Tasks 3 and 6.
- Produces: learner dashboard, duration control defaulted to `60`, session block navigation, autosaved answers, pause/resume UI, and exhaustive renderer for the four initial activity types.

- [ ] **Step 1: Write failing component tests**

Assert dashboard defaults duration to 60; session shell shows four named blocks; Continue remains disabled until the current activity satisfies its client completion rule; API failure retains typed text and exposes Retry; mobile viewport uses a single-column landmark order.

- [ ] **Step 2: Run component tests and verify failure**

Run: `pnpm --filter web test -- session-shell.test.tsx`

Expected: FAIL because session components do not exist.

- [ ] **Step 3: Implement the typed API client and protected learner layout**

The client includes credentials, parses responses with shared Zod contracts, and maps the standard error envelope to `ApiError`. Redirect unauthenticated users to `/login` without exposing server details.

- [ ] **Step 4: Implement dashboard and session shell**

Use semantic landmarks, keyboard-operable controls, visible focus, and one primary action per activity. Display block progress rather than a continuous countdown. Desktop may show a collapsible support panel; mobile remains one column.

- [ ] **Step 5: Implement exhaustive initial activity renderers**

`ActivityRenderer` switches on the contract discriminant and has a compile-time `never` assertion. Listening uses the seeded local audio/placeholder contract and never autoplay. Speaking captures a text placeholder response in this increment and clearly states recording arrives in Increment 4.

- [ ] **Step 6: Run component and type tests**

Run: `pnpm --filter web test && pnpm --filter web typecheck`

Expected: all tests PASS and renderer is exhaustive.

- [ ] **Step 7: Write the failing Playwright journey**

The test registers a learner, creates a 60-minute session, submits at least one activity, reloads the page, verifies the checkpoint is restored, completes the seeded flow, and sees a progress summary. Repeat the essential navigation at desktop and mobile viewport.

- [ ] **Step 8: Run E2E and verify failure before final wiring**

Run: `pnpm --filter web e2e -- foundation-session.spec.ts`

Expected: FAIL at the first unconnected API/UI behavior.

- [ ] **Step 9: Complete API/UI wiring and rerun E2E**

Run: `pnpm --filter web e2e -- foundation-session.spec.ts`

Expected: PASS for desktop and mobile projects, including refresh/resume.

- [ ] **Step 10: Commit the learner slice UI**

```bash
git add apps/web/src apps/web/e2e apps/web/playwright.config.ts
git commit -m "feat: add the resumable Foundation learning flow"
```

### Task 8: Local developer workflow and whole-slice verification

**Files:**
- Create: `scripts/setup-local.ps1`
- Create: `scripts/backup-local.ps1`
- Create: `scripts/restore-local.ps1`
- Create: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `README.md`
- Modify: `package.json`
- Test: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Consumes: all previous tasks and `WORKLINGO_DATA_DIR`.
- Produces: documented `pnpm setup:local`, `pnpm dev`, `pnpm verify`, `pnpm backup:local`, and `pnpm restore:local` workflows.

- [ ] **Step 1: Write the failing backup/restore integration test**

Seed the test database and a storage file, invoke backup, delete both test records/file, invoke restore into an isolated test target, and assert the learner/session metadata and file checksum are restored. The test must refuse a backup path outside its temporary root.

- [ ] **Step 2: Run the backup test and verify failure**

Run: `pnpm --filter api test:integration -- backup-restore.integration.spec.ts`

Expected: FAIL because scripts do not exist.

- [ ] **Step 3: Implement safe PowerShell setup/backup/restore scripts**

Resolve and validate explicit absolute paths before file operations. Do not recursively remove broad paths. Backup PostgreSQL and `WORKLINGO_DATA_DIR` into a timestamped directory with a manifest and checksums; restore requires an empty target database/data directory in this increment.

- [ ] **Step 4: Document local setup and recovery**

README gives the five-command quick start. `LOCAL_DEVELOPMENT.md` covers prerequisites, env creation, PostgreSQL startup, migration, seed, data paths, verification, backup, restore, and common provider-free troubleshooting.

- [ ] **Step 5: Add one-command verification and run it**

`pnpm verify` runs format check, lint, typecheck, unit tests, integration tests, builds, and the Foundation E2E journey.

Run: `pnpm verify`

Expected: exit 0 with all required gates PASS.

- [ ] **Step 6: Inspect the final diff and runtime state**

Run: `git diff --check && git status --short && git diff --stat HEAD`

Expected: no whitespace errors, no runtime data or `.env` staged, and only planned files changed.

- [ ] **Step 7: Commit developer workflow and verification**

```bash
git add README.md package.json scripts docs/LOCAL_DEVELOPMENT.md apps/api/test/integration/backup-restore.integration.spec.ts
git commit -m "docs: add local development and recovery workflow"
```

## Final acceptance checklist

- [ ] `pnpm verify` passes from a clean local setup.
- [ ] Register/login/logout and duplicate-account behavior pass integration tests.
- [ ] Seed can run twice without duplicates.
- [ ] A 60-minute session always has four 15-minute blocks and four-skill coverage.
- [ ] Learner B cannot access learner A's session.
- [ ] Duplicate client session/attempt IDs do not duplicate data.
- [ ] Refresh restores the latest persisted checkpoint.
- [ ] Published lesson version remains unchanged after session creation.
- [ ] Desktop and mobile Foundation E2E journeys pass.
- [ ] Backup/restore rehearsal passes in an isolated target.
- [ ] No AI, AWS, S3, Redis, or cloud dependency is required to run this increment.
