# Increment 5A2 Engagement and Evidence of Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an idempotent weekly study-day goal, neutral consistency streak, and evidence-of-progress dashboard derived only from ordinary evaluated learning work.

**Architecture:** Add an `EngagementModule` with pure timezone/week and evidence-window policies, a transactional study-day projection invoked only when a `LEARNING` session first completes, and owner-scoped read/update APIs. The dashboard renders the server projection; it never computes streaks or learning improvement in the browser.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Zod contracts, Next.js 16/React, Vitest, Supertest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-09-increment-5a-onboarding-placement-engagement-design.md`

## Global Constraints

- Weekly target is an integer 2–5; default is 3.
- Weeks start Monday in the learner profile timezone and store an immutable timezone/target snapshot.
- Only distinct local dates with a newly completed `LEARNING` session count; placement sessions never count.
- Replaying one session completion must not increment a day or session count twice.
- A target change affects the active week only before its first study day; otherwise it becomes the next-week preference.
- Current incomplete week never breaks the displayed streak before the week ends.
- UI language is neutral and never says the learner lost or failed a streak.
- Numeric skill change requires at least two evaluated samples for that skill in both 28-day windows.
- Evidence responses contain aggregates and counts, never raw answers, transcript, writing, recordings, or provider payloads.
- All behavior changes follow strict RED → GREEN → REFACTOR and each task ends in an atomic commit.

## Review Focus

- One session completion is submitted concurrently twice: one `LearnerStudySession` and one increment result.
- A learner completes sessions around local midnight/year rollover: each session lands in the correct `Asia/Ho_Chi_Minh` date/week.
- A target is lowered after the learner already studied that week: historical/current target is unchanged and the new preference applies next week.
- A placement session completes: engagement, progress comparison, and streak remain unchanged.
- One comparison window has fewer than two evaluated samples: `change` is null and UI reports insufficient evidence instead of improvement.

---

### Task 1: Persist engagement projections and shared contracts

**Files:**
- Create: `apps/api/prisma/migrations/20261009000300_increment_5a2_engagement/migration.sql`
- Create: `packages/contracts/src/engagement.contracts.ts`
- Create: `packages/contracts/src/engagement.contracts.spec.ts`
- Create: `apps/api/test/integration/engagement-schema.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Produces: `LearnerProfile.weeklyTargetDays`; `LearnerStudyDay`, `LearnerStudySession`, `LearnerEngagementWeek`; `engagementSummarySchema`, `weeklyTargetInputSchema`, `evidenceOfProgressSchema`; `EngagementSummaryDto` and per-skill status `IMPROVING | STEADY | NEEDS_ATTENTION | INSUFFICIENT_EVIDENCE`.

- [ ] **Step 1: Write failing schema and contract tests**

Assert unique `(learnerId, dateKey)`, unique `sessionId` projection receipt, unique `(learnerId, weekStartKey)`, default profile target `3`, target schema rejecting `1` and `6`, and evidence schema requiring all four skills with nullable change and explicit sample counts.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/engagement-schema.integration.spec.ts`

Run: `pnpm --filter @worklingo/contracts test`

Expected: FAIL because engagement persistence/contracts are absent.

- [ ] **Step 3: Add migration, Prisma relations, and contracts**

Add `LearnerProfile.weeklyTargetDays` with default `3`. Use `dateKey`/`weekStartKey` strings in validated `YYYY-MM-DD` format to preserve the learner-local calendar identity; retain UTC timestamps for event ordering. Add indexes for learner/date and learner/week queries and include restored rows in backup rehearsal integrity checks.

- [ ] **Step 4: Run GREEN**

Run Prisma generate and both commands from Step 2 plus backup/restore integration.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma packages/contracts apps/api/test/integration/engagement-schema.integration.spec.ts apps/api/test/integration/backup-restore.integration.spec.ts
git commit -m "feat: add engagement projection persistence"
```

### Task 2: Implement deterministic week and progress-evidence policies

**Files:**
- Create: `apps/api/src/engagement/domain/engagement-week.ts`
- Create: `apps/api/src/engagement/domain/engagement-week.spec.ts`
- Create: `apps/api/src/engagement/domain/evidence-of-progress.ts`
- Create: `apps/api/src/engagement/domain/evidence-of-progress.spec.ts`

**Interfaces:**
- Produces: `toLocalDateKey(instant: Date, timezone: string): string`; `toWeekStartKey(dateKey: string): string`; `calculateConsistency(input: ConsistencyInput): ConsistencyResult`; `compareEvidence(input: EvidenceWindowInput): EvidenceOfProgressDto`.

- [ ] **Step 1: Write failing table-driven week tests**

Use hand-derived literal date/week keys for Monday/Sunday, local midnight, December/January rollover, missing-week gaps, met active week, and incomplete current week protection. Invalid timezone must fail with a typed safe domain error rather than silently using server timezone.

- [ ] **Step 2: Write failing evidence-window tests**

Prove two samples in both windows yield a literal signed change; one sample returns `INSUFFICIENT_EVIDENCE` and `change: null`; placement-purpose samples are excluded; empty windows return zero counts without NaN; raw responses never appear in output.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/engagement/domain/engagement-week.spec.ts src/engagement/domain/evidence-of-progress.spec.ts`

Expected: FAIL because policy functions do not exist.

- [ ] **Step 4: Implement pure policies using `Intl.DateTimeFormat`**

Do not add a date dependency. Hoist/cache formatters by validated timezone, parse date keys explicitly, and keep database access out of these files.

- [ ] **Step 5: Run GREEN and mutation checks**

Run Step 3. Then mutate minimum sample count from 2 to 1 and Monday offset by one day; verify the corresponding tests fail, restore, and rerun green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/engagement/domain
git commit -m "feat: calculate weekly consistency and progress evidence"
```

### Task 3: Project completed learning sessions exactly once

**Files:**
- Create: `apps/api/src/engagement/engagement.module.ts`
- Create: `apps/api/src/engagement/application/study-day-projector.service.ts`
- Create: `apps/api/src/engagement/application/study-day-projector.service.spec.ts`
- Create: `apps/api/test/integration/engagement-projection.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.module.ts`

**Interfaces:**
- Consumes: Task 2 calendar functions and Task 5A1 session purpose.
- Produces: `StudyDayProjectorService.recordCompletion(tx, input: { learnerId; sessionId; purpose; completedAt; timezone }): Promise<void>`.

- [ ] **Step 1: Write failing projection tests**

Cover ordinary completion, duplicate replay, two sessions same local day, concurrent duplicate calls, local-midnight separation, placement exclusion, and transaction rollback. Assert database rows/counts, not calls to mocks.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/engagement/application/study-day-projector.service.spec.ts test/integration/engagement-projection.integration.spec.ts`

Expected: FAIL because no projection is connected to session completion.

- [ ] **Step 3: Implement transactional projection and call it at the single completion boundary**

Upsert the zero-or-existing study-day row without incrementing it, then insert `LearnerStudySession` with `createMany({ skipDuplicates: true })` on unique `sessionId`; only a returned count of one increments `completedSessionCount` and reconciles the weekly snapshot. Refactor deterministic submission to call the existing `advanceSubmittedActivity` boundary, then invoke the projector from that single common completion transaction used by text and recording submission, not separately from each controller path.

- [ ] **Step 4: Run GREEN and submission-path regressions**

Run Step 2 plus learning-session, speaking-submission, and Teacher AI pipeline integration tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/engagement apps/api/src/app.module.ts apps/api/src/learning-sessions apps/api/test/integration/engagement-projection.integration.spec.ts
git commit -m "feat: project completed learning days once"
```

### Task 4: Add owner-scoped engagement and evidence APIs

**Files:**
- Create: `apps/api/src/engagement/engagement.controller.ts`
- Create: `apps/api/src/engagement/application/engagement.service.ts`
- Create: `apps/api/src/engagement/application/engagement.service.spec.ts`
- Create: `apps/api/src/engagement/dto/update-weekly-target.dto.ts`
- Create: `apps/api/test/integration/engagement-api.integration.spec.ts`
- Modify: `apps/api/src/engagement/engagement.module.ts`

**Interfaces:**
- Produces: `EngagementService.getSummary(learnerId, now?): Promise<EngagementSummaryDto>`; `EngagementService.updateWeeklyTarget(learnerId, targetDays, now?): Promise<EngagementSummaryDto>`; routes `GET /api/v1/me/engagement` and `PATCH /api/v1/me/engagement/weekly-target`.

- [ ] **Step 1: Write failing HTTP and query-behavior tests**

Cover empty learner, current/best streak, missing-week reset, active-week protection, immediate target change before study, next-week target after study, `2`/`5` boundaries, `1`/`6` rejection, learner isolation, per-skill window comparison, sample counts, placement exclusion, and no raw sensitive fields.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/engagement/application/engagement.service.spec.ts test/integration/engagement-api.integration.spec.ts`

Expected: FAIL because service/routes are absent.

- [ ] **Step 3: Implement bounded aggregate queries and target update transaction**

Fetch only the two 28-day windows and the weeks needed for current/best streak; do not load raw response columns. Lock current week/profile when changing target. Persist past-week `MISSED` reconciliation without creating unlimited empty rows.

- [ ] **Step 4: Run GREEN, lint, and API typecheck**

Run Step 2, `pnpm --filter @worklingo/api lint`, and `pnpm --filter @worklingo/api typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/engagement apps/api/test/integration/engagement-api.integration.spec.ts
git commit -m "feat: expose weekly engagement evidence"
```

### Task 5: Render supportive engagement on the learner dashboard

**Files:**
- Create: `apps/web/src/features/engagement/engagement-panel.tsx`
- Create: `apps/web/src/features/engagement/engagement-panel.test.tsx`
- Create: `apps/web/src/lib/api/engagement-client.ts`
- Modify: `apps/web/src/app/(learner)/dashboard/page.tsx`
- Modify: `apps/web/src/features/learning-session/dashboard-view.tsx`
- Modify: `apps/web/src/features/learning-session/dashboard-view.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 engagement contracts and Task 4 APIs.
- Produces: weekly mission, target selector, consistency, and four-skill evidence cards with retryable independent loading.

- [ ] **Step 1: Write failing component/page tests**

Assert `2 of 3 learning days`, neutral `2-week consistency`, target option range 2–5, immediate versus next-week confirmation copy, four skill sample counts, signed change only when non-null, insufficient-evidence copy, keyboard labels, retry that reloads only engagement, and dashboard remaining usable if engagement fails.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/engagement/engagement-panel.test.tsx src/features/learning-session/dashboard-view.test.tsx`

Expected: FAIL because engagement UI/client are absent.

- [ ] **Step 3: Implement independent engagement loading and responsive panel**

Load progress, availability, and engagement concurrently. Keep the existing mission launcher usable when engagement fails. Use text/icon plus color, 44px controls, and 16px mobile select font; do not add celebratory/punitive animation.

- [ ] **Step 4: Run GREEN, lint, typecheck, and build**

Run Step 2 plus web lint/typecheck/build.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(learner)'/dashboard/page.tsx apps/web/src/features/engagement apps/web/src/features/learning-session/dashboard-view.tsx apps/web/src/features/learning-session/dashboard-view.test.tsx apps/web/src/lib/api/engagement-client.ts apps/web/src/app/globals.css
git commit -m "feat: show weekly learning evidence"
```

### Task 6: Qualify 5A2 and close Increment 5A

**Files:**
- Create: `apps/web/e2e/engagement-progress.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `docs/INCREMENT_5A_DEMO.md`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/TEST_STRATEGY.md`

**Interfaces:**
- Consumes: complete 5A1 and Tasks 1–5.
- Produces: desktop/mobile evidence that onboarding leads into accurate supportive engagement.

- [ ] **Step 1: Write failing desktop/mobile E2E**

Add `engagement-desktop` and `engagement-mobile` projects. Complete and replay ordinary learning in the current week, verify one distinct study day, target behavior, current-week protection, insufficient-evidence sample copy, placement exclusion, no overflow, keyboard access, and touch targets. Multi-date, midnight, and year-rollover behavior remains deterministic integration/domain coverage rather than introducing a production clock-control endpoint.

- [ ] **Step 2: Run RED and fix only exposed product wiring**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/engagement-progress.spec.ts`

Expected: first run FAILS before final wiring; preserve assertions and diagnose the behavior.

- [ ] **Step 3: Update documentation and operational demo**

Document weekly semantics, timezone, target timing, evidence windows, insufficient-evidence policy, local clock control used only by tests, and non-certification limitations.

- [ ] **Step 4: Run full verification and independent review**

Run: `pnpm verify`

Expected: every repository gate and all onboarding/placement/engagement desktop/mobile journeys PASS.

Review correctness, readability, architecture, security/privacy, and query performance. Mutation-check duplicate completion, target timing, placement exclusion, week offset, and minimum evidence count. Resolve all Critical/Important findings.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/engagement-progress.spec.ts apps/web/playwright.config.ts docs
git commit -m "test: qualify Increment 5A learner engagement"
```
