# Increment 5A1 Onboarding and Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every new learner a resumable choice between eligible self-placement and an explainable, confirmable four-skill placement assessment without contaminating learning progress.

**Architecture:** Add an `OnboardingModule` around versioned placement attempts while reusing the existing curriculum, learning-session, recording, draft, jobs, and Teacher AI pipelines. A mission-purpose boundary keeps placement sessions out of learning selection, mastery, review, progression, and progress; recommendation is a pure versioned policy persisted exactly once and confirmation is a locked idempotent transaction.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Zod contracts, Next.js 16/React, Vitest, Supertest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-09-increment-5a-onboarding-placement-engagement-design.md`

## Global Constraints

- Local-first remains the default; placement must run with fake providers and local object storage without cloud credentials.
- New learners start `PENDING`; existing learner profiles migrate to `COMPLETE` with method `MIGRATED`.
- Only a published level with a canonical 60-minute four-skill `LEARNING` mission is eligible for selection or recommendation.
- Placement uses a 45-minute immutable `PLACEMENT` mission and the existing submission/evaluation pipelines.
- Placement evidence must not update mastery, Error Bank, review scheduling, checkpoint progression, ordinary progress, or engagement.
- Missing or pending skill evidence is never converted to zero and can never silently pass.
- `workplace-placement-v1` can initially recommend only `FOUNDATION_1` and makes no CEFR/B2/TOEIC/IELTS claim.
- Every mutation uses owner checks, a client UUID, idempotent replay, and safe conflict responses.
- API responses and logs must exclude raw provider responses, recording bytes, transcript text, writing text, cookies, tokens, and secrets.
- All behavior changes follow strict RED → GREEN → REFACTOR and each task ends in an atomic commit.

## Review Focus

- Two tabs confirm different onboarding choices concurrently: exactly one level/method wins and the other receives a safe `409`.
- Curriculum is withdrawn after recommendation: confirmation is rejected while the immutable recommendation snapshot remains readable.
- A placement session is completed through every submission path: no mastery, Error Bank, progression, normal progress, or future review evidence is created.
- A pending learner calls dashboard/session APIs directly: backend policy and web routing both prevent bypass while allowing only the owned placement session.
- A client UUID is replayed against another level, session, or attempt: return `IDEMPOTENCY_CONFLICT` and preserve the original target.

---

### Task 1: Persist onboarding and placement contracts

**Files:**
- Create: `apps/api/prisma/migrations/20261009000200_increment_5a1_onboarding_placement/migration.sql`
- Create: `packages/contracts/src/onboarding.contracts.ts`
- Create: `packages/contracts/src/onboarding.contracts.spec.ts`
- Create: `apps/api/test/integration/onboarding-schema.integration.spec.ts`
- Create: `apps/api/test/integration/onboarding-migration.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/contracts/package.json`
- Modify: `packages/contracts/src/index.ts`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Produces: `OnboardingStatus`, `OnboardingMethod`, `MissionPurpose`, `PlacementAttemptStatus`; `onboardingStateSchema`, `placementAttemptSchema`, `selfPlacementInputSchema`, `createPlacementAttemptInputSchema`, and `confirmPlacementInputSchema`.

- [ ] **Step 1: Write failing schema and contract tests**

Add `onboarding-schema.integration.spec.ts` cases asserting:

```ts
expect(newLearner.profile.onboardingStatus).toBe('PENDING');
expect(placementAttempt.learningSessionId).toBe(session.id);
expect(placementAttempt.lessonVersionId).toBe(session.lessonVersionId);
```

Add an upgrade rehearsal that applies migrations through `20261009000100_system_seeded_audio` in a temporary schema, inserts an existing learner profile, applies the new migration, and asserts `COMPLETE`, `MIGRATED`, and the unchanged level. Add contract tests that reject a missing onboarding status, an unknown mission purpose, a placement result without all four skill keys, and UUIDs with invalid syntax. Name the production break each test catches.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/onboarding-schema.integration.spec.ts`

Run: `pnpm --filter @worklingo/contracts test`

Expected: FAIL because the enums, tables, profile fields, and schemas do not exist.

- [ ] **Step 3: Add the migration, Prisma relations, and Zod contracts**

Add `onboardingStatus`, `onboardingMethod`, and `onboardedAt` to the profile, `Mission.purpose` defaulting to `LEARNING`, and `PlacementAttempt` with unique `(learnerId, clientAttemptId)` plus unique `learningSessionId`. The migration must update existing profiles to `COMPLETE`/`MIGRATED` before installing the `PENDING` default for future profiles. Add Vitest to the contracts package using the existing workspace version and extend backup/restore fixture coverage so the new placement table is included in restored relational integrity checks. `weeklyTargetDays` belongs to 5A2 and is not added here.

- [ ] **Step 4: Run GREEN and regressions**

Run: `pnpm --filter @worklingo/api exec prisma generate`

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/onboarding-schema.integration.spec.ts test/integration/onboarding-migration.integration.spec.ts test/integration/backup-restore.integration.spec.ts`

Run: `pnpm --filter @worklingo/contracts test`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma packages/contracts pnpm-lock.yaml apps/api/test/integration/onboarding-schema.integration.spec.ts apps/api/test/integration/onboarding-migration.integration.spec.ts apps/api/test/integration/backup-restore.integration.spec.ts
git commit -m "feat: add onboarding placement persistence"
```

### Task 2: Add purpose-aware curriculum and placement seed

**Files:**
- Create: `packages/test-fixtures/src/placement-mission.fixture.ts`
- Create: `apps/api/src/curriculum/infrastructure/seed-placement.ts`
- Create: `apps/api/src/curriculum/domain/playable-level-policy.ts`
- Create: `apps/api/src/curriculum/domain/playable-level-policy.spec.ts`
- Modify: `packages/test-fixtures/src/index.ts`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/src/curriculum/application/curriculum.service.ts`
- Modify: `apps/api/src/curriculum/domain/curriculum.types.ts`
- Modify: `apps/api/src/curriculum/infrastructure/seed-foundation.ts`
- Modify: `apps/api/src/curriculum/infrastructure/seed-workplace-transfer.ts`
- Modify: `apps/api/test/integration/curriculum-seed.integration.spec.ts`
- Modify: `apps/api/src/learning-sessions/domain/session-planner.spec.ts`

**Interfaces:**
- Consumes: `MissionPurpose` from Task 1 and existing `planFoundationSession`/`computeAvailableDurations`.
- Produces: `CurriculumService.getPublishedMissionsForLevel(levelCode, purpose?: MissionPurpose)` with default `LEARNING`; `CurriculumService.getPublishedPlacementMission()`; `findPlayableLevels(input): PlayableLevel[]` where `PlayableLevel` contains `code`, `name`, `cefrReference`, and `available`.

- [ ] **Step 1: Write failing purpose, seed, and playability tests**

Assert with literal fixtures that normal curriculum selection excludes `PLACEMENT`, placement selection excludes `LEARNING`, the seeded diagnostic plans at 45 minutes with all four skills, and a level is unavailable if its 60-minute mission is missing one skill or cannot form a canonical plan.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/curriculum/domain/playable-level-policy.spec.ts src/learning-sessions/domain/session-planner.spec.ts test/integration/curriculum-seed.integration.spec.ts`

Expected: FAIL because purpose filtering, placement fixture, and playability policy are absent.

- [ ] **Step 3: Implement the placement fixture, idempotent seed, and explicit filters**

The placement fixture must contain independently answerable reading/listening plus speaking/writing activities, valid local WAV audio, and no unsupported activity schema. Reuse `createSeededAudioArtifact`; never mutate a published version. Change every ordinary curriculum consumer to rely on the `LEARNING` default and add an explicit placement query for onboarding.

- [ ] **Step 4: Run GREEN and mutation check**

Run the command from Step 2. Then temporarily remove the `purpose: 'LEARNING'` condition from the curriculum query and confirm the “normal selection excludes placement” test fails; restore it and rerun green.

- [ ] **Step 5: Commit**

```bash
git add packages/test-fixtures apps/api/prisma/seed.ts apps/api/src/curriculum apps/api/src/learning-sessions/domain/session-planner.spec.ts apps/api/test/integration/curriculum-seed.integration.spec.ts
git commit -m "feat: seed purpose-bound placement curriculum"
```

### Task 3: Expose onboarding state and idempotent self-placement

**Files:**
- Create: `apps/api/src/onboarding/onboarding.module.ts`
- Create: `apps/api/src/onboarding/onboarding.controller.ts`
- Create: `apps/api/src/onboarding/application/onboarding.service.ts`
- Create: `apps/api/src/onboarding/dto/self-placement.dto.ts`
- Create: `apps/api/test/integration/onboarding-self-placement.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/users/application/users.service.ts`
- Modify: `apps/api/src/auth/application/auth.service.ts`
- Modify: `apps/api/src/auth/dto/auth-user.dto.ts`
- Modify: `packages/contracts/src/auth.contracts.ts`
- Modify: `apps/api/test/integration/auth.integration.spec.ts`
- Modify: `apps/api/src/auth/infrastructure/roles.guard.spec.ts`
- Modify: `apps/web/src/app/(admin)/layout.test.tsx`
- Modify: `apps/web/src/app/(learner)/layout.test.tsx`
- Modify: `apps/web/src/features/auth/auth-form.test.tsx`
- Modify: `apps/web/src/features/auth/auth-page.test.ts`
- Modify: `apps/web/src/features/auth/submit-auth.test.ts`

**Interfaces:**
- Consumes: Task 1 contracts, Task 2 playable-level policy, `MutationReceipt`, and `AuditLog`.
- Produces: additive required `AuthUser.onboardingStatus: 'PENDING' | 'COMPLETE' | null`; `OnboardingService.getState(learnerId): Promise<OnboardingStateDto>` and `confirmSelfPlacement(learnerId, input: SelfPlacementInput): Promise<OnboardingStateDto>`; routes `GET /api/v1/me/onboarding` and `POST /api/v1/me/onboarding/self-placement`.

- [ ] **Step 1: Write failing auth and self-placement integration tests**

Cover new registration `PENDING`, admin onboarding status `null`, eligible-level reasons, successful confirmation, foreign/admin rejection, unplayable level `422 LEVEL_NOT_PLAYABLE`, same UUID replay returning the original result, different-target replay `409 IDEMPOTENCY_CONFLICT`, and two concurrent different confirmations yielding one success and one `ONBOARDING_ALREADY_COMPLETE`.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/auth.integration.spec.ts test/integration/onboarding-self-placement.integration.spec.ts`

Expected: FAIL at the missing profile-aware auth response and onboarding routes.

- [ ] **Step 3: Implement profile-aware auth and the locked confirmation transaction**

Introduce a typed `UserWithProfile` projection in `UsersService`; do not make callers assemble onboarding state. In `confirmSelfPlacement`, hash the canonical request for mutation-receipt comparison, acquire a profile row lock, re-evaluate playability inside the transaction, update `currentLevelCode` plus onboarding fields, and write a safe audit record containing method and from/to level only.

- [ ] **Step 4: Run GREEN and module smoke test**

Run the Step 2 command plus `pnpm typecheck` and `pnpm --filter @worklingo/api exec vitest run test/smoke/app.smoke.spec.ts`.

Expected: all selected tests PASS and Nest dependency graph compiles.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/onboarding apps/api/src/app.module.ts apps/api/src/users/application/users.service.ts apps/api/src/auth packages/contracts/src/auth.contracts.ts apps/api/test/integration/auth.integration.spec.ts apps/api/test/integration/onboarding-self-placement.integration.spec.ts apps/web/src/app/'(admin)'/layout.test.tsx apps/web/src/app/'(learner)'/layout.test.tsx apps/web/src/features/auth
git commit -m "feat: add self-placement onboarding flow"
```

### Task 4: Create atomic resumable placement sessions

**Files:**
- Create: `apps/api/src/learning-sessions/application/session-creation.service.ts`
- Create: `apps/api/src/learning-sessions/application/session-creation.service.spec.ts`
- Create: `apps/api/src/onboarding/application/placement-attempts.service.ts`
- Create: `apps/api/src/onboarding/dto/create-placement-attempt.dto.ts`
- Create: `apps/api/test/integration/placement-attempt.integration.spec.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-session.types.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.module.ts`
- Modify: `packages/contracts/src/learning-session.contracts.ts`
- Modify: `apps/api/src/onboarding/onboarding.controller.ts`
- Modify: `apps/api/src/onboarding/onboarding.module.ts`
- Modify: `apps/api/test/integration/learning-session-test-harness.ts`

**Interfaces:**
- Consumes: Task 2 placement mission and existing `planFoundationSession`.
- Produces: `missionPurposeSchema`; additive API `LearningSessionDto.purpose: 'learning' | 'placement'`; `SessionCreationService.create(tx, input: { learnerId; clientSessionId; mission; durationMinutes; reviewItems }): Promise<LearningSessionDto>`; `PlacementAttemptsService.create(learnerId, input)` and `getOwned(learnerId, id)`; route `POST /api/v1/me/onboarding/placement-attempts`.

- [ ] **Step 1: Write failing service and HTTP tests**

Assert atomic session/attempt creation, purpose `placement`, fixed duration 45, immutable version binding, same-target UUID replay, different-target conflict, one active attempt per learner under concurrent requests, owner isolation, pending learners rejected from ordinary session creation, and rollback leaving neither row when attempt persistence is forced to fail. Extend the integration harness with an explicit `registerPendingLearner`; keep its normal learning helper self-placing through the public endpoint so existing learning tests retain their intended precondition.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/application/session-creation.service.spec.ts test/integration/placement-attempt.integration.spec.ts`

Expected: FAIL because session creation is embedded in `LearningSessionsService` and no placement lifecycle exists.

- [ ] **Step 3: Extract reusable transactional session creation and add placement orchestration**

Move only mission-bound planning/persistence into `SessionCreationService`; keep ordinary curriculum selection and public session state operations in `LearningSessionsService`. Placement creation locks the pending learner profile, rechecks that no active attempt exists, opens one database transaction, creates the 45-minute session through the new service, then creates `PlacementAttempt` before commit. Ordinary session creation requires onboarding `COMPLETE`; the internal placement path requires `PENDING`.

- [ ] **Step 4: Run GREEN and learning-session regressions**

Run the Step 2 command plus `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/application/learning-sessions.service.spec.ts test/integration/learning-sessions.integration.spec.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/learning-sessions apps/api/src/onboarding packages/contracts/src/learning-session.contracts.ts apps/api/test/integration/placement-attempt.integration.spec.ts apps/api/test/integration/learning-session-test-harness.ts
git commit -m "feat: create resumable placement sessions"
```

### Task 5: Isolate placement evidence and calculate recommendations

**Files:**
- Create: `apps/api/src/onboarding/domain/placement-policy.ts`
- Create: `apps/api/src/onboarding/domain/placement-policy.spec.ts`
- Create: `apps/api/src/onboarding/application/placement-recommendation.service.ts`
- Create: `apps/api/src/onboarding/application/placement-recommendation.service.spec.ts`
- Create: `apps/api/test/integration/placement-isolation.integration.spec.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-session.types.ts`
- Modify: `apps/api/src/teacher-ai/application/evaluation.service.ts`
- Modify: `apps/api/src/teacher-ai/application/evaluation.service.spec.ts`
- Modify: `apps/api/src/progression/application/progression.service.ts`
- Modify: `apps/api/src/progress/application/progress.service.ts`
- Modify: `apps/api/src/mastery/application/mastery-map.service.ts`

**Interfaces:**
- Consumes: evaluated activity attempts, mission purpose, playable levels.
- Produces: `recommendPlacement(input: PlacementPolicyInput): PlacementPolicyResult`; `PlacementRecommendationService.refresh(learnerId, attemptId): Promise<PlacementAttemptDto>` using policy version `workplace-placement-v1`.

- [ ] **Step 1: Write failing pure-policy tests**

Use literal four-skill inputs to prove: null/pending evidence returns not-ready; an average cannot compensate for one below-threshold skill; the highest eligible candidate wins; only `FOUNDATION_1` is in v1; explanations contain scores/counts but no raw response.

- [ ] **Step 2: Write failing isolation integration tests**

Complete deterministic, writing, and speaking placement paths and assert literal zero counts for new mastery events, Error Bank entries, checkpoint assessments, normal progress attempts/sessions, and review-queue evidence. Also assert a normal `LEARNING` session still creates its existing evidence.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/onboarding/domain/placement-policy.spec.ts src/onboarding/application/placement-recommendation.service.spec.ts test/integration/placement-isolation.integration.spec.ts`

Expected: FAIL because placement currently follows ordinary mastery/progress side effects and no policy exists.

- [ ] **Step 4: Implement explicit purpose guards and recommendation persistence**

Carry mission purpose in `CurrentActivitySubmission` and session DTO. Skip mastery writes for placement in both deterministic submission and `EvaluationService`; filter placement from progression/progress/mastery curriculum reads. `refresh` persists `RECOMMENDED` once only after all four skill scores exist, otherwise returns `PROCESSING` or `ACTION_REQUIRED` without inventing scores.

- [ ] **Step 5: Run GREEN plus relevant regressions**

Run the Step 3 command plus progression, mastery, Teacher AI pipeline, and learning-session integration suites.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/onboarding apps/api/src/learning-sessions apps/api/src/teacher-ai apps/api/src/progression apps/api/src/progress apps/api/src/mastery apps/api/test/integration/placement-isolation.integration.spec.ts
git commit -m "feat: isolate and score placement evidence"
```

### Task 6: Expose placement status and locked recommendation confirmation

**Files:**
- Create: `apps/api/src/onboarding/dto/confirm-placement.dto.ts`
- Create: `apps/api/test/integration/placement-confirmation.integration.spec.ts`
- Modify: `apps/api/src/onboarding/onboarding.controller.ts`
- Modify: `apps/api/src/onboarding/application/onboarding.service.ts`
- Modify: `apps/api/src/onboarding/application/placement-attempts.service.ts`
- Modify: `apps/api/src/onboarding/onboarding.module.ts`

**Interfaces:**
- Consumes: Task 5 `PlacementRecommendationService.refresh`.
- Produces: `GET /api/v1/me/onboarding/placement-attempts/:id`; `POST /api/v1/me/onboarding/placement-attempts/:id/confirm`; safe next-action and retry references in `PlacementAttemptDto`.

- [ ] **Step 1: Write failing lifecycle and concurrency tests**

Cover `IN_PROGRESS`, `PROCESSING`, `ACTION_REQUIRED`, `RECOMMENDED`, same UUID replay, different-target replay, owner isolation, successful confirmation, two concurrent confirms, and curriculum withdrawal after recommendation preserving the snapshot while returning `LEVEL_NO_LONGER_AVAILABLE`.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/placement-confirmation.integration.spec.ts`

Expected: FAIL at missing routes and confirmation transaction.

- [ ] **Step 3: Implement owner-scoped status and serialized confirmation**

Lock profile and attempt rows, require `RECOMMENDED`, recheck playability, update profile/attempt, create safe audit plus mutation receipt, and return the canonical state. Do not rewrite `skillResults`, `explanation`, `lessonVersionId`, or `policyVersion` during confirmation.

- [ ] **Step 4: Run GREEN and API integration suite**

Run the Step 2 command and `pnpm --filter @worklingo/api test:integration`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/onboarding apps/api/test/integration/placement-confirmation.integration.spec.ts
git commit -m "feat: confirm placement recommendations safely"
```

### Task 7: Route learners through self-placement onboarding

**Files:**
- Create: `apps/web/src/app/(learner)/onboarding/page.tsx`
- Create: `apps/web/src/app/(learner)/onboarding/layout.tsx`
- Create: `apps/web/src/features/onboarding/onboarding-workspace.tsx`
- Create: `apps/web/src/features/onboarding/onboarding-workspace.test.tsx`
- Create: `apps/web/src/features/onboarding/onboarding.css`
- Create: `apps/web/src/lib/api/onboarding-client.ts`
- Modify: `apps/web/src/features/auth/auth-page.tsx`
- Modify: `apps/web/src/features/auth/auth-page.test.ts`
- Modify: `apps/web/src/app/(learner)/layout.tsx`
- Modify: `apps/web/src/app/(learner)/layout.test.tsx`

**Interfaces:**
- Consumes: Task 1 contracts and Tasks 3/6 APIs.
- Produces: `/onboarding` state workspace; `getPostAuthenticationPath(AuthUser)` returning admin, onboarding, or dashboard; pending-learner route guard.

- [ ] **Step 1: Write failing routing and self-placement component tests**

Assert pending learner post-auth route, completed learner dashboard route, admin route, direct dashboard bypass redirected to onboarding, loading/retry states, unavailable level explanation, idempotent confirmation retry with stable client UUID, and successful navigation to dashboard.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/auth/auth-page.test.ts "src/app/(learner)/layout.test.tsx" src/features/onboarding/onboarding-workspace.test.tsx`

Expected: FAIL because onboarding-aware routing and UI do not exist.

- [ ] **Step 3: Implement the state-driven onboarding workspace**

Use semantic radio controls for method/level, explicit availability text, 44px controls, and server-returned `nextAction`; never infer completion from local state. Preserve the client confirmation UUID across uncertain network failures and replace it only after a definitive conflict or success.

- [ ] **Step 4: Run GREEN, lint, and typecheck**

Run the Step 2 command, `pnpm --filter @worklingo/web lint`, and `pnpm --filter @worklingo/web typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(learner)' apps/web/src/features/auth apps/web/src/features/onboarding apps/web/src/lib/api/onboarding-client.ts
git commit -m "feat: add learner onboarding workspace"
```

### Task 8: Reuse the session UI for placement and recommendation review

**Files:**
- Create: `apps/web/src/app/(learner)/onboarding/placement/[sessionId]/page.tsx`
- Create: `apps/web/src/app/(learner)/onboarding/placement/[sessionId]/layout.tsx`
- Create: `apps/web/src/features/onboarding/placement-status.tsx`
- Create: `apps/web/src/features/onboarding/placement-status.test.tsx`
- Modify: `apps/web/src/features/learning-session/session-shell.tsx`
- Modify: `apps/web/src/features/learning-session/session-shell.test.tsx`
- Modify: `apps/web/src/features/onboarding/onboarding-workspace.tsx`
- Modify: `apps/web/src/lib/api/onboarding-client.ts`
- Modify: `apps/web/src/lib/api/api-client.ts`
- Modify: `apps/web/src/lib/api/api-client.learner.test.ts`

**Interfaces:**
- Consumes: existing `SessionShell`, placement status/confirm APIs.
- Produces: placement route that passes `completionHref="/onboarding"` and `contextLabel="Placement assessment"`; four-skill status/retry/recommendation UI.

- [ ] **Step 1: Write failing placement-session and status tests**

Assert the shell uses placement copy and completion target without changing ordinary learning copy, refresh restores the session, status displays all four skills as evaluated/pending/action-required, retry invokes the existing evaluation endpoint, recommendation renders explanation/sample counts, and confirmation preserves its UUID after an uncertain failure.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/learning-session/session-shell.test.tsx src/features/onboarding/placement-status.test.tsx`

Expected: FAIL because configurable completion context and placement status UI are absent.

- [ ] **Step 3: Add narrow reusable shell props and placement pages**

Add only `contextLabel` and `completionHref` props with existing-learning defaults. Poll placement status with bounded intervals only while `PROCESSING`; stop on unmount, `ACTION_REQUIRED`, `RECOMMENDED`, or `CONFIRMED`. Reuse `EvaluationFeedback` for retry details instead of duplicating provider logic.

- [ ] **Step 4: Run GREEN, accessibility component checks, and build**

Run the Step 2 command plus `pnpm --filter @worklingo/web build`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(learner)'/onboarding apps/web/src/features/onboarding apps/web/src/features/learning-session/session-shell.tsx apps/web/src/features/learning-session/session-shell.test.tsx apps/web/src/lib/api/onboarding-client.ts apps/web/src/lib/api/api-client.ts apps/web/src/lib/api/api-client.learner.test.ts
git commit -m "feat: complete placement assessment experience"
```

### Task 9: Verify the complete 5A1 journey and document operations

**Files:**
- Create: `apps/web/e2e/onboarding-placement.spec.ts`
- Create: `apps/web/e2e/helpers/learner-onboarding.ts`
- Create: `docs/INCREMENT_5A_DEMO.md`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/e2e/adaptive-learning.spec.ts`
- Modify: `apps/web/e2e/foundation-session.spec.ts`
- Modify: `apps/web/e2e/teacher-ai-learning.spec.ts`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/TEST_STRATEGY.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`

**Interfaces:**
- Consumes: complete Tasks 1–8.
- Produces: desktop/mobile acceptance proof and operator documentation for 5A1.

- [ ] **Step 1: Write failing desktop/mobile Playwright journeys**

Add projects `onboarding-desktop` and `onboarding-mobile`. Cover self-placement, placement refresh/resume, fake-provider processing/retry, recommendation confirmation, existing learner bypass, no horizontal overflow, keyboard navigation, 44px controls, and placement exclusion from progress/mastery. Add a shared public-API onboarding helper and update existing learner E2E journeys to self-place after registration rather than bypassing the new product rule.

- [ ] **Step 2: Run RED and record the first product failure**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/onboarding-placement.spec.ts`

Expected: at least one journey FAIL before final wiring; diagnose rather than weakening assertions.

- [ ] **Step 3: Complete only wiring exposed by E2E and update docs**

Document policy limits, local seed behavior, migration, routes, safe retry, and the explicit “human calibration pending” limitation. Update roadmap status only with tests actually run.

- [ ] **Step 4: Run full verification and review**

Run: `pnpm verify`

Expected: format, setup regression, lint, typecheck, all unit/integration tests, production build, and all desktop/mobile Playwright projects PASS.

Perform the five-axis code review. Mutation-check purpose isolation, concurrent confirmation, and route guard. Resolve every Critical/Important finding before continuing to 5A2.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts docs
git commit -m "test: verify Increment 5A1 onboarding journey"
```
