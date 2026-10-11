# Increment 5D Pilot Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible accessibility, performance, security and recovery evidence, fix exposed defects and record an honest controlled-pilot release decision.

**Architecture:** Add deterministic qualification fixtures/scripts around public product interfaces and existing backup/restore tooling, then consolidate evidence in versioned reports and a release checklist. 5D adds no new product subsystem; every code change must repair a demonstrated qualification failure.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Next.js/React, Vitest, Supertest, Playwright, PowerShell, Docker Compose

**Spec:** `docs/superpowers/specs/2026-10-11-increment-5d-pilot-qualification-design.md`

## Global Constraints

- A failing gate remains visible until fixed or recorded as a release blocker; never delete or weaken the assertion to obtain green.
- Qualification uses isolated PostgreSQL schemas and data directories and never resets or overwrites user data.
- Reports contain no credentials, personal learner content, raw recordings or provider payloads.
- Test-only controls require `NODE_ENV=test` and explicit E2E mode and must fail closed in production.
- `CONTROLLED_PILOT_APPROVED` requires named human calibration, content and operations approvals; repository automation can establish at most `TECHNICALLY_QUALIFIED`.
- No release state implies CEFR, B2, TOEIC, IELTS, employment or academic certification.
- Live-provider and human-calibration checks stay opt-in and are reported separately from deterministic `pnpm verify`.

## Review Focus

- Qualification runs twice against fresh isolated locations: no leaked process, schema, file or test-only state changes the second result.
- A migration starts from the previous merged schema with realistic records: IDs, sessions, attempts, versions and files survive.
- Browser is zoomed to 200% or mobile keyboard opens: core actions remain reachable without horizontal loss or obscured controls.
- A performance budget fails: report and release checklist remain failed until measured optimization passes the same assertion.
- Technical gates pass while human calibration is pending: release status is exactly `TECHNICALLY_QUALIFIED`, never pilot-approved.

---

### Task 1: Build deterministic qualification datasets and performance gates

**Files:**
- Create: `apps/api/test/qualification/qualification-seed.ts`
- Create: `apps/api/test/qualification/performance.qualification.spec.ts`
- Create: `apps/web/e2e/performance.qualification.spec.ts`
- Create: `scripts/qualification/run-performance.ps1`
- Create: `docs/PERFORMANCE_REPORT.md`
- Modify: `package.json`
- Modify: `apps/web/playwright.config.ts`

**Interfaces:**
- Produces: idempotent isolated seed for 1,000+ mastery records, 10,000 audit/job rows, bounded analytics cohorts and 500 KB valid/invalid lesson source; `pnpm qualify:performance`.

- [ ] **Step 1: Write failing seed determinism and budget tests**

Assert repeat seed has stable counts, uses no production user/content, and measures session availability/creation, engagement summary, Admin cursor pages and lesson parse/validate against the approved budgets with provider latency excluded.

- [ ] **Step 2: Run RED and capture the first measured failure**

Run: `pnpm qualify:performance`

Expected: FAIL until command, fixtures, reports and any necessary optimizations exist.

- [ ] **Step 3: Implement the harness and optimize demonstrated bottlenecks**

Record OS/CPU/RAM/Node/PostgreSQL/browser, cold/warm method, sample count, p50/p95, query count and reviewed query plans. Change product code/indexes only when a measured failure proves the need and add the narrow regression test first.

- [ ] **Step 4: Run GREEN and write the report from captured aggregate evidence**

Core budgets: API p95 under 750 ms after warm-up, Admin cursor pages under 500 ms, 500 KB parse/validate under 1,000 ms, no unbounded reviewed table scan and desktop LCP under 2.5 s. Report mobile separately and flag interaction-blocking waterfalls.

- [ ] **Step 5: Checkpoint**

Confirm the report distinguishes machine-specific evidence from product guarantees.

### Task 2: Complete accessibility qualification and repairs

**Files:**
- Create: `apps/web/e2e/accessibility.qualification.spec.ts`
- Create: `docs/ACCESSIBILITY_REVIEW.md`
- Modify: affected web components/styles only when a failing test/manual check identifies a defect
- Modify: `apps/web/playwright.config.ts`

**Interfaces:**
- Produces: desktop/mobile keyboard/zoom/reduced-motion journey plus a recorded manual checklist for registration, onboarding, session, mastery, audio settings and Admin content/curriculum/audit/operations.

- [ ] **Step 1: Write failing automated accessibility journey**

Assert semantic names/roles/live regions, skip links, logical focus order/restoration, visible focus, keyboard completion, reduced motion, 44px controls, 16px mobile form fonts, 200% zoom without blocked actions and mobile writing controls visible with keyboard viewport changes.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/accessibility.qualification.spec.ts`

- [ ] **Step 3: Reproduce each failure narrowly and repair product UI**

Add a component regression test before each durable fix where practical. Keep the visual language and existing public behavior.

- [ ] **Step 4: Run GREEN and complete manual evidence**

Record browser, viewport, keyboard path, contrast/reduced-motion/zoom result and any remaining issue with severity and owner.

- [ ] **Step 5: Checkpoint**

Ensure automated passes are not presented as substitutes for manual checks.

### Task 3: Execute route, upload, secret and dependency security review

**Files:**
- Create: `apps/api/test/qualification/security.qualification.spec.ts`
- Create: `scripts/qualification/scan-secrets.ps1`
- Create: `docs/SECURITY_REVIEW.md`
- Modify: affected API/web/config files only after a reproducing test
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm qualify:security`, complete route/role matrix and severity-ranked findings/residual risks.

- [ ] **Step 1: Inventory routes and write failing authorization/abuse tests**

Cover learner/Admin IDOR, cookie/session/CSRF assumptions, rate limits, upload MIME/signature/size/path traversal, local storage containment, prompt-injection data, safe errors and production rejection of test controls.

- [ ] **Step 2: Add secret/log and dependency checks**

Scan tracked files and captured logs for known credential/token fixtures without printing secrets. Run the package-manager audit, record exact advisories and distinguish exploitable production paths from dev-only exposure.

- [ ] **Step 3: Run RED and fix Critical/Important findings test-first**

Run: `pnpm qualify:security`

Do not broaden scope to certification work; unresolved Critical/Important issues set release status `BLOCKED`.

- [ ] **Step 4: Re-run GREEN and write the security report**

Document threat surface, controls, evidence, finding severity/status and residual risks using redacted examples only.

- [ ] **Step 5: Checkpoint**

Verify every route has an explicit public/learner/Admin classification and every skip is justified.

### Task 4: Rehearse setup, migration, restart, backup/restore and rollback

**Files:**
- Create: `scripts/qualification/rehearse-recovery.ps1`
- Create: `apps/api/test/qualification/recovery.qualification.spec.ts`
- Create: `docs/PILOT_RUNBOOK.md`
- Modify: `scripts/backup-local.ps1`
- Modify: `scripts/restore-local.ps1`
- Modify: `scripts/setup-local.ps1`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm qualify:recovery` using explicit temporary allowed roots/schemas; runbook setup/start/smoke/Admin/Learner/operations/backup/restore/shutdown and rollback instructions.

- [ ] **Step 1: Write failing recovery rehearsal**

Start from the previous merged schema with representative users, immutable LessonVersions, sessions/checkpoints, jobs, engagement, curriculum/audit/analytics and media checksums. Assert migrate, idempotent seed, API/web restart, job retry, resume, backup/restore identity and rollback compatibility instructions.

- [ ] **Step 2: Run RED in isolated paths/schemas**

Run: `pnpm qualify:recovery`

- [ ] **Step 3: Fix recovery defects without destructive shortcuts**

Preserve path containment, empty-target restore, manifest coverage and checksums. Do not use reset, broad recursive deletion or the user's normal data directory.

- [ ] **Step 4: Run GREEN twice and complete the runbook**

Record commands, expected signals, recovery point limits, rollback decision points and cleanup of only verified temporary resources.

- [ ] **Step 5: Checkpoint**

Confirm a new operator can follow the runbook without undocumented local knowledge.

### Task 5: Run the full pilot journey and record the release decision

**Files:**
- Create: `apps/web/e2e/pilot-journey.qualification.spec.ts`
- Create: `docs/RELEASE_CHECKLIST.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/TEST_STRATEGY.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: all Increment 5 features and Tasks 1–4.
- Produces: one deterministic desktop/mobile pilot journey, consolidated evidence links and final `BLOCKED` or `TECHNICALLY_QUALIFIED` repository status.

- [ ] **Step 1: Write the failing cross-system journey**

Cover registration, test/self-placement onboarding, ordinary learning/save/resume, Teacher AI retry, mastery/Error Bank, engagement, Admin content/audio publication, curriculum/audit, operations/analytics and immutable version isolation through public interfaces.

- [ ] **Step 2: Run RED and fix demonstrated regressions test-first**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/pilot-journey.qualification.spec.ts`

- [ ] **Step 3: Run every deterministic qualification command**

Run `pnpm qualify:performance`, `pnpm qualify:security`, `pnpm qualify:recovery`, accessibility E2E and finally `pnpm verify`. Save command/result/count/environment references in the checklist; do not paste secrets or raw learner content.

- [ ] **Step 4: Perform final five-axis review and close findings**

Review correctness, maintainability, architecture, security/privacy and performance over the complete uncommitted Increment 5 diff. Fix every Critical/Important finding and rerun the affected narrow check plus the final full gate.

- [ ] **Step 5: Write the honest release decision and handoff**

Set `BLOCKED` if any deterministic gate/recovery/artifact/Critical/Important requirement fails. Otherwise set `TECHNICALLY_QUALIFIED` and list human Teacher AI/placement calibration, Foundation content quality and pilot operations approvals still required. Never assign `CONTROLLED_PILOT_APPROVED` automatically. Leave all work uncommitted for Codex review.
