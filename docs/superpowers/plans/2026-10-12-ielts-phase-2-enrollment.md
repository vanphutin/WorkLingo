# IELTS Phase 2 Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist learner program enrollment and active context, and make Intermediate learning consume that context safely.

**Architecture:** A relational enrollment stores the program's current level and revision. LearningProgramsModule exports ProgramContextService to onboarding, sessions, mastery and progression. Existing session mission/version relationships remain authoritative for resuming historical work.

**Tech Stack:** NestJS, Prisma/PostgreSQL, shared Zod contracts, Next.js/React, Vitest, Supertest and Playwright. Reuse existing local harnesses and fake providers.

**Spec:** `docs/superpowers/specs/2026-10-12-ielts-phase-2-enrollment-design.md`

## Global Constraints

- Intermediate remains the only selectable program in this phase. IELTS stays IN_DEVELOPMENT.
- LearnerProfile.currentLevelCode stays as a compatibility mirror for Intermediate.
- Phase 2 must not advertise IELTS learning as available or interpret current levels as IELTS/B2 admission evidence.
- Do not rewrite historical sessions when context changes.
- Use focused checks per task and one final pnpm verify before integration. No new dependencies or live provider calls.
- Execute directly in the existing IELTS worktree. Start a short-lived `codex/ielts-program-enrollment` branch from the verified Phase 1 merge on origin/main; preserve the approved spec.
- Every transaction mutating onboarding, activation or progression locks the same LearnerProfile row before reading context. A mutation must not resolve context outside its transaction.
- Stage explicit files and make independently testable commits. Do not merge a partial enrollment rollout.

## Review Focus

- COMPLETE legacy learner with an invalid or foreign-program level: migration aborts atomically; Task 1 tests it.
- An archived current level: enrollment preserves its identity, but new session availability cannot invent playable content; Tasks 1 and 4 test it.
- Two activation/advancement requests using the same old revision: locking and conditional revision updates preserve one coherent state; Tasks 3 and 5 test it.
- Historical session belonging to another program: resume remains possible, assessment/confirmation cannot advance active context; Tasks 4 and 5 test it.
- Older migration rehearsals and fixture learners bypassing onboarding: migration ordering and fixture enrollment must be updated explicitly; Tasks 1 and 4 test it.

## Task 1: Enrollment schema and additive migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261012000200_learner_program_enrollment/migration.sql`
- Create: `apps/api/test/integration/program-enrollment-migration.integration.spec.ts`
- Modify: `apps/api/test/integration/learning-program-migration.integration.spec.ts`

**Interfaces:** Produce Prisma `LearnerProgramEnrollment` with `learnerId_programId` uniqueness, nullable `currentLevelId`, revision default 1, User/Program/Level relations, and nullable `LearnerProfile.activeProgramId` with a Program relation.

- [ ] Write a migration rehearsal with raw pre-migration fixtures: COMPLETE learner at Intermediate level enrolls at exactly that level and revision 1; PENDING remains null; archived Intermediate level remains linked. Preserve historical session IDs, checkpoints and version bindings. In separate isolated schemas, invalid and foreign-program levels must make deployment fail with no enrollment table/profile-column changes left behind.
- [ ] Run `pnpm --filter @worklingo/api exec vitest run test/integration/program-enrollment-migration.integration.spec.ts`; observe failure because the migration is absent.
- [ ] Implement the schema and SQL migration with explicit BEGIN/COMMIT and a preflight check for COMPLETE LEARNER profiles. Backfill only those learners using the stable Intermediate program ID. Create uniqueness, program index and foreign keys with cascade learner deletion and restricted program/level deletion.
- [ ] Update older migration rehearsal selection to apply only migration directories ordered before its target, then apply the target separately. Generate Prisma using `pnpm --filter @worklingo/api exec prisma generate`.
- [ ] Run both enrollment and LearningProgram migration rehearsals; check affected API types and `git diff --check`, then commit the explicit files as `feat: persist learner program enrollment`.

## Task 2: Strict shared context contracts

**Files:**
- Create: `packages/contracts/src/program-context.contracts.ts`
- Create: `packages/contracts/src/program-context.contracts.spec.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:** Export `programContextSchema`, `ProgramContextDto`, `activateProgramSchema`, `ActivateProgramInput`. Context is `{ activeProgram: { id, slug, name } | null, enrollment: { id, revision, currentLevel: { id, code, name } | null } | null }`. Input is strict `{ programSlug: string, expectedRevision: positive integer | null }`.

- [ ] Write the first test accepting `{ activeProgram: null, enrollment: null }`; run the focused file to confirm missing export failure, then implement that schema.
- [ ] Add populated Intermediate context and activation cases one at a time. Reject unknown fields, invalid UUIDs, revision 0/fractions, absent expectedRevision and half-populated context. Each case gets a red/green cycle. Trim programSlug and reject empty or more than 100 characters.
- [ ] Export both contracts using the shared package's existing import-extension convention. Run `pnpm --filter @worklingo/contracts exec vitest run src/program-context.contracts.spec.ts` and contracts typecheck/lint; commit as `feat: define learner program context contracts`.

## Task 3: Context resolution and authenticated activation

**Files:**
- Create: `apps/api/src/learning-programs/application/program-context.service.ts`
- Create: `apps/api/src/learning-programs/program-context.controller.ts`
- Create: `apps/api/src/learning-programs/dto/activate-program.dto.ts`
- Modify: `apps/api/src/learning-programs/learning-programs.module.ts`
- Create: `apps/api/test/integration/program-context-api.integration.spec.ts`

**Interfaces:** Export `ProgramContextService`. Implement `getContext(learnerId: string): Promise<ProgramContextDto>`, `resolve(learnerId: string, transaction?: Prisma.TransactionClient): Promise<ResolvedProgramContext>`, `activate(learnerId: string, input: ActivateProgramInput): Promise<ProgramContextDto>` and `initializeIntermediate(transaction: Prisma.TransactionClient, learnerId: string, levelCode: string): Promise<void>`.

`ResolvedProgramContext` contains `programId`, `programSlug`, `enrollmentId`, `revision`, `levelId`, `levelCode`. `resolve` requires COMPLETE onboarding, matching active enrollment and level/program relationship; it never reads the legacy level as a fallback. Initialization validates Intermediate membership, upserts one enrollment and sets profile.activeProgramId in the caller's locked transaction.

- [ ] Write GET `/api/v1/me/program-context` for a registered PENDING learner and expect both fields null. Run the integration file to observe 404, then implement GET and strict DTO mapping.
- [ ] Add sequential red/green tests for COMPLETE context, inconsistent COMPLETE state (409 PROGRAM_CONTEXT_INVALID), unauthenticated (401), admin role (403), another learner's isolated context and rejected learnerId body injection (400).
- [ ] Add PUT tests: PENDING (409 ONBOARDING_REQUIRED), unknown/disabled (404 PROGRAM_NOT_FOUND), IELTS/TOEIC/Beginner (422 PROGRAM_UNAVAILABLE), stale revision (409 PROGRAM_CONTEXT_STALE), valid same-program activation (200 with unchanged revision), concurrent same-program no-ops and persisted GET after activation. Every rejected mutation must leave GET context unchanged.
- [ ] Implement activation inside one profile-locked transaction. Reuse `deriveProgramAccess`, validate context and expectedRevision before writing, and emit ID/revision-only audit metadata for an actual context mutation. Do not log activation bodies. Keep LearningProgramsModule independent of consumer modules to avoid a DI cycle.
- [ ] Run the focused HTTP file plus existing learning-programs API integration, API typecheck and targeted ESLint on added files. Commit as `feat: expose learner program context`.

## Task 4: Initialize onboarding and scope learning reads

**Files:**
- Modify: `apps/api/src/onboarding/application/onboarding.service.ts`
- Modify: `apps/api/src/onboarding/application/placement-attempts.service.ts`
- Modify: `apps/api/src/onboarding/onboarding.module.ts`
- Modify: `apps/api/src/curriculum/application/curriculum.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.module.ts`
- Modify: `apps/api/src/mastery/application/mastery-map.service.ts`
- Modify: `apps/api/src/mastery/mastery.module.ts`
- Extend the existing onboarding, placement, sessions and mastery integration tests; update only fixture/unit-test constructors affected by required context injection.

**Interfaces:** Consume Task 3's resolver and initialization. Extend `getPublishedMissionsForLevel(levelCode, purpose, database, programId?)` with an explicit optional program filter, preserving existing placement callers. Ordinary session/mastery callers always pass resolved programId and levelCode. Require published level and path for ordinary content.

- [ ] Add a self-placement HTTP test that confirms onboarding then GET context returns Intermediate at the selected level; observe red, initialize in the existing confirmation transaction, then verify green. Repeat for scored placement confirmation and idempotent replay.
- [ ] Restrict self-placement and placement recommended-level candidates to Intermediate so an admin-authored foreign program level cannot be selected by existing onboarding. Add a foreign-program candidate regression test.
- [ ] Add session availability/new-session and mastery-map cases verifying active enrollment overrides the compatibility mirror, a wrong-program level cannot produce content, and archived/unpublished current levels cannot start new sessions. Implement context resolution and curriculum filtering.
- [ ] Add a historical-session case: mutate active context in a controlled fixture, then GET/resume/submit the original owned session successfully with the same frozen plan/version. Its ordinary session actions use session identity, not current context.
- [ ] Update seeded COMPLETE learners and affected fixtures to initialize explicit enrollment. Update unit test constructor dependencies without introducing optional/fallback context behavior in production.
- [ ] Run only the changed onboarding/placement/session/mastery suites and affected API typecheck/lint. Commit as `feat: scope learning reads to learner program context`.

## Task 5: Enrollment-backed progression

**Files:**
- Modify: `apps/api/src/progression/application/progression.service.ts`
- Modify: `apps/api/src/progression/application/checkpoint-evidence.ts`
- Modify: `apps/api/src/progression/progression.module.ts`
- Extend: `apps/api/test/integration/progression.integration.spec.ts`
- Extend focused checkpoint-evidence tests if already present.

**Interfaces:** Consume resolved context within profile-locked assessment/confirmation transactions. Extend checkpoint evidence/next-level helpers to accept programId and ensure the successor remains in the same path/program. Assessment/session ancestry identifies the originating program; legacy persisted assessments retain existing shape.

- [ ] Add a completed owned session in another program and expect assessment/confirmation 409 PROGRAM_CONTEXT_MISMATCH, while session resume remains valid. Observe red, implement ancestry/context checks, then verify green. Check mismatch before idempotent replay so replay does not bypass active-program isolation.
- [ ] Add summary cases where legacy mirror differs from enrollment; summary must use enrollment level and only its evidence. Implement context-backed summary and eligibility queries.
- [ ] Add confirmation advancing enrollment.currentLevelId and revision by exactly 1, with Intermediate mirror updated atomically. Confirm replay returns current summary without another advancement. Implement conditional enrollment update matching ID, level and revision, then legacy mirror update and confirmation creation.
- [ ] Test stale assessment, unavailable immediate successor, simultaneous confirmation requests, activation racing confirmation and transaction rollback after a failed write. Reuse existing prerequisite/frozen-evidence tests; no failed or pending snapshot can be promoted by later evidence.
- [ ] Run progression integration plus changed checkpoint helper tests and API typecheck/lint. Commit as `feat: isolate progression by program enrollment`.

## Task 6: Learner activation UI, journeys and integration

**Files:**
- Modify: `apps/web/src/lib/api/learning-program-client.ts` and its test
- Modify: `apps/web/src/features/learning-programs/program-catalog.tsx` and its test
- Modify: `apps/web/src/features/learning-session/dashboard-view.tsx` and its test
- Extend: `apps/web/e2e/program-catalog.spec.ts`
- Extend: `apps/web/e2e/onboarding-placement.spec.ts` if needed for both entry methods
- Update: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/API_CONTRACTS.md`, `docs/USER_FLOWS.md`, `docs/DECISIONS.md`

**Interfaces:** `LearningProgramClient.getContext(): Promise<ProgramContextDto>` and `activateProgram(input: ActivateProgramInput): Promise<ProgramContextDto>`. Reuse ApiError and strict shared schemas. Catalog independently fetches catalog/context in parallel, activates a selectable program, then navigates to `/dashboard`.

- [ ] Test context/PUT request credentials, strict parsing and safe network/API errors; red/green each behavior.
- [ ] Test active label, pending activation disabling, activation-before-navigation, recoverable retry, stale context refresh with explicit retry and unavailable program buttons. Implement with existing card styles and accessible live status; loading/errors must not cause premature navigation.
- [ ] Test dashboard active-program name from server context. Preserve existing onboarding redirects and audio settings.
- [ ] Extend desktop/mobile program journey: onboard, activate, reload, verify active program, create/resume Intermediate session, directly attempt IELTS activation and verify 422 with unchanged context. Run `pnpm --filter @worklingo/web exec playwright test e2e/program-catalog.spec.ts --project=programs-desktop --project=programs-mobile`.
- [ ] Update architecture/data/API documentation and an accepted enrollment ADR. Mark implementation checklist items only when the tests actually passed.
- [ ] Run affected component/client tests, contracts/API/web typecheck and targeted lint; review the complete branch including migration rollback and transaction boundaries. Fix findings using focused tests.
- [ ] Run `pnpm verify` once at the final gate, inspect explicit staged changes and commit. Push the feature branch, create and attach its PR, inspect checks and merge under the existing user authorization. Confirm origin/main contains the final commit. Preserve the IELTS worktree for subsequent phases.

## Plan self-review

Spec sections map to Tasks 1 (migration/compatibility), 2 (strict contracts), 3 (API/locking/access), 4 (onboarding/session/mastery), 5 (progression), and 6 (UI/docs/end-to-end verification). Review Focus conditions have explicit owning tests. The rollout is intentionally integrated only after all consumers stop using the legacy field as their authoritative context.

Implementation status: Tasks 1–5 implemented and verified with focused checks. Task 6 UI/client tests and desktop/mobile E2E passed; final branch review and full verification pending. Execution method: native/direct, preserving the user's quota preference. The user approved the written plan before implementation.
