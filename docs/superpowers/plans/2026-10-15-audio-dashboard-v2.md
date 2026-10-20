# Audio and Dashboard V2 Implementation Plan

> **For agentic workers:** Use executing-plans for integration and dispatching-parallel-agents for disjoint audio and interface slices. Track steps below; the user explicitly requests autonomous execution.

**Goal:** Deliver reliable voice rotation and program-aware Admin and Learner dashboards using stored data.
**Architecture:** Extend existing audio settings, speech lifecycle, AnalyticsModule, program catalog and enrollment relationships. Add read-only aggregate dashboard endpoints and lightweight accessible charts; retain all existing routes and services.
**Tech Stack:** Next.js 16, React 19, NestJS 11, Prisma 6, PostgreSQL, Zod, Vitest, Playwright.
**Spec:** User attachment `C:/Users/ASUS/.codex/attachments/7d8c10ea-678d-4124-9b2d-82ded58aa9bd/Pasted text.txt`.

## Global Constraints
- Preserve existing learner data, lesson content, program progression, authentication and API contracts.
- Do not introduce mock metrics, fake functionality or destructive database changes.
- Avoid unnecessary audio regeneration and paid TTS requests.
- Reuse existing components, design tokens, services, schemas, dependencies and architectural patterns.
- No publishing, deployment, or remote Git operations are required.

## Review Focus
- Browser voices loading late, disappearing, or differing by device: preserve an eligible selection and expose honest failures.
- Replays, rapid play/stop, multiple players and unmount: prevent stale callbacks and overlapping audio.
- Zero records or no active program: return empty/null metrics, never invented percentages or a Foundation level.
- Switching programs: scope sessions and evaluations through mission.level.path.programId, never the profile's current program alone.
- Unauthorized requests: dashboard routes must use existing session and role guards.

### Task 1: Audio registry and playback
**Files:** `apps/web/src/features/audio/`, related audio contracts/settings/provider services and tests.
**Interfaces:** Existing AudioSettings and AdminAudioSettings remain backward compatible; stable browser IDs preserve saved selections.
- [x] Reproduce current selection/lifecycle behavior with focused existing tests.
- [x] Add failing tests for round-robin without immediate repeats, session replay stability, eligible voice filtering, slow loading and playback cancellation.
- [x] Extend existing infrastructure with registry/rotation and shared playback ownership; expose supported settings and actual metadata.
- [x] Run audio web, API and contract tests; expected PASS.

### Task 2: Read-only dashboard data
**Files:** new `packages/contracts/src/dashboard.contracts.ts`, existing contract index, `apps/api/src/analytics/`, new dashboard integration tests.
**Interfaces:** `GET /admin/analytics/overview` → AdminDashboardOverview; `GET /me/dashboard` → LearnerDashboardAnalytics. Exact shape is defined in the shared Zod contract before UI integration.
- [x] Add failing service/integration tests proving real aggregates, zero denominators, role enforcement and learner/program isolation.
- [x] Implement bounded date-series aggregation and counts with parameterized queries; no per-learner query loops or migrations.
- [x] Run contracts and targeted API tests; expected PASS.

### Task 3: Admin workspace
**Files:** Admin layout, new `/admin` and `/admin/programs/[slug]` pages, new `features/admin-dashboard`, dedicated messages/client, navigation tests.
**Interfaces:** Consume AdminDashboardOverview; link existing CRUD pages rather than duplicate them. Read program context from the URL; unavailable programs have honest states.
- [x] Add failing navigation, filtering, empty/error and real-metric rendering tests.
- [x] Build grouped responsive sidebar, breadcrumbs, overview charts and reusable program workspace with supported management links.
- [x] Keep every existing admin route reachable. Unsupported user/settings functionality is explicitly unavailable rather than a dead control.
- [x] Run focused Admin component/navigation tests; expected PASS.

### Task 4: Learner dashboard
**Files:** Learner dashboard page/view/tests, new dashboard analytics components/client/messages and scoped stylesheet.
**Interfaces:** Consume LearnerDashboardAnalytics alongside existing program context, roadmap and engagement endpoints. Keep existing start/resume handlers and idempotency keys.
- [x] Add failing tests for personalized greeting, resume, program progress, empty scores and scoped chart rendering.
- [x] Add activity, accuracy and assessed-skill charts with text equivalents, milestones, program navigation and honest availability.
- [x] Keep weekly consistency explicitly measured in weeks; avoid calling it a daily streak.
- [x] Run focused Learner tests; expected PASS.

### Task 5: Integration and verification
**Files:** Cross-slice fixes, focused browser coverage, this plan.
- [x] Inspect the full diff and perform an independent review of authorization, program boundaries, lifecycle and accessibility.
- [x] Run format/i18n, lint, typecheck, workspace tests and production build; expected PASS or named environmental blocker.
- [x] Run existing browser coverage for audio, programs and dashboard/Admin responsive layouts against isolated test schemas.
- [x] Fix regressions and report only actual results, changed modules and remaining limitations.
