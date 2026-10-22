# Admin Sidebar IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the flat admin menu with four primary entries and contextual program navigation, preserving all destinations.

**Architecture:** A typed navigation model owns group/program membership and localized labels. AdminNavigation renders this model inside the existing WorkspaceNavigation disclosure; layout authorization, AdminLink and editor ownership stay unchanged.

**Tech Stack:** Existing Next.js 16, React 19, TypeScript, next-intl preferences, Vitest/Testing Library and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-admin-sidebar-ia-design.md`

## Global Constraints

- Work only in new worktree from local main d2fe1e3, feature branch codex/admin-sidebar-ia.
- No new CRUD, APIs, routes, dependencies, business logic, permissions, main commits, merges, push or deploy.
- Keep Liquid Glass, VI/EN, Light/Dark/System, reduced motion, dirty guards and existing destinations.
- Missing Foundation/Basic/TOEIC authoring is proposed IA only, with no fake links.

## Review Focus

- Active route boundaries and the overlapping topic-groups/topics destinations must resolve to exactly one link.
- Closing mobile/group disclosures cannot strand focus or reset unsaved editor values.
- Browser history and program selection must reopen route context without persisting stale state.
- All 48 templates must remain reachable under existing guards; dynamic slug/category constraints are not arbitrary routes.
- Hidden program destinations must retain guarded links; shared/system must not imply new permissions.

### Task 1: Structured navigation and preserved destinations

**Files:** Create `apps/web/src/features/admin-dashboard/admin-navigation-model.ts`, `admin-sidebar.tsx`, `admin-sidebar.css`, `admin-sidebar.test.tsx`, `apps/web/src/i18n/messages/adminNavigation.ts`; modify `admin-navigation.tsx`, `apps/web/src/components/workspace-navigation.tsx`, `apps/web/src/app/(admin)/layout.tsx` and existing nav/layout tests. Create `docs/admin-sidebar-ia/inventory.md` and `routes.json`.

**Interfaces:** Consumes existing AdminLink, WorkspaceNavigation and message translators. Produces `adminNavigationGroups` configuration, `useAdminNavigationGroups()` localized groups, `useAdminNavigationItems()` flat compatibility list, `AdminNavigation()` shell component. Model includes group id, translated label, program metadata and item arrays; active lookup uses longest complete path segment.

- [x] Record 48 route templates, historical 34+14 split, 26 old destinations and exact mapping including missing programs and role evidence.
- [x] Write failing `admin-sidebar.test.tsx` behavior tests: four primary entries, one open group, program selection hides unrelated tools, all old hrefs retained, explicit unavailable programs, active descendants/boundaries, route rerender, Escape focus and retained draft.
- [x] Run targeted tests. Expected: failing assertions against current flat/legacy menu, not import errors.
- [x] Implement typed configuration, localized group/program UI, shell child slot, guarded links and layout integration; preserve breadcrumbs.
- [x] Update obsolete legacy/layout assertions to test new hierarchy while retaining coverage of role redirects and all destinations.
- [x] Run complete web suite, lint and typecheck. Expected: all passing; document baseline blockers if found.
- [x] Commit explicit product/test/documentation files after verification.

### Task 2: Browser coverage, verification and independent review

**Files:** Create `apps/web/playwright.admin-sidebar.config.ts`, `apps/web/e2e/admin-sidebar-ia.spec.ts`, fixture helpers as needed, `docs/admin-sidebar-ia/verification.md` and selected screenshot evidence.

**Interfaces:** Consumes Task 1 UI plus existing `auditRoutes`, `prepareAuditRoute`, authoring/settings/learning fixtures. Produces reproducible route matrix, interaction and screenshot evidence.

- [x] Add Playwright tests covering 34 historical routes plus 14 source additions, all 26 prior nav destinations, active deep links and boundary cases, reload and browser history.
- [x] Cover desktop/mobile VI/EN light/dark; system media changes, reduced motion, native keyboard activation/Escape/Tab, independent scroll, 320px/200% reflow and draft preservation on disclosure changes.
- [x] Run production build, i18n, web regression, lint/typecheck, browser suite. Expected: passing with limits explicitly documented (fixture UI versus live backend).
- [x] Inspect screenshot artifacts and final diff, perform a mutation check of active matching and record results.
- [x] Request fresh independent review of tests then implementation, fix important findings with RED→GREEN regression and rerun affected gates.
- [x] Commit scoped browser/evidence/report files. Verify clean feature worktree, main HEAD unchanged, preserved checkout unchanged. Stop without merge/push/deploy.
