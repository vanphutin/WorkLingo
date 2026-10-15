# WorkLingo UI/UX redesign report — 2026-10-14

## Result and scope

Implemented a shared light/dark foundation across the actual frontend, redesigned learner/admin navigation and dashboard hierarchy, refreshed landing/auth, marked active programs and improved the learning workspace. Existing onboarding, mastery, IELTS, audio and authoring journeys use the same semantic surfaces, typography and controls.

The implementation is on `codex/ui-redesign-v2`, based on the existing IELTS Phase 8 branch. No backend, Prisma, contracts, authentication policy, role permission, publication/versioning, enrollment or evaluation logic changed. No commits, push, deployment or new application dependencies. Initial untracked skills/root instructions/skills-lock were preserved.

## Skills and decisions

| Skill | Responsibility and actual contribution |
|---|---|
| skill-installer | Pinned repo-local installation of UI UX Pro Max, Frontend Design and 15 Superpowers workflows; native discovery verified |
| OpenAI Docs | Current skill discovery/app-server guidance; read-only `skills/list` confirmed repo scope/enabled status |
| codex-quota-optimizer | One compact map, targeted source reads, one public/auth worker and one reviewer; focused tests before the broad final gate |
| ui-ux-pro-max | Design-system search with one corrected query, verified keyboard navigation guidance, full relevant accessibility/layout checklists |
| frontend-design | Subject-specific design direction: adult workplace language, quiet navy/teal, a distinctive mission workspace, restrained landing language example; screenshot critique |
| design-taste-frontend | Public/auth worker's initial landing audit and editorial implementation; excluded from dashboard/admin responsibility |
| vercel-react-best-practices | Small theme client island, versioned/minimal storage, pre-paint static initialization, stable hydration snapshot; no added heavyweight dependencies |
| git-workflow-and-versioning | Inspected initial changes, created dedicated branch from current work, reviewed explicit diff and preserved user files |
| code-review-and-quality | Tests-first diff assessment, independent review, correctness/security/architecture/performance checks |
| Superpowers systematic-debugging / verification-before-completion | Root-cause analysis of test mocks, rendered dark-mode contrast and environment failure; evidence-based completion claims |
| Test-first checks for changed behavior | Resume launcher and auth validation focus were exercised failing before their implementation; rendered skip-link failure reproduced and corrected |

See SKILL_INSTALLATION_REPORT.md for licenses, pins, exact locations, activation names and limitations. Superpowers is installed as individual instruction skills, not its marketplace bootstrap plugin. Workflow guidance does not override the existing autonomous-execution directive or actual tool/invocation restrictions. Planning/execution wrappers were not presented as fully followed workflows; the existing authorized plan was continued.

## Audit findings addressed

- Mission now precedes evidence and optional IELTS cards in DOM and visual order. A server-roadmap active session becomes the primary continue action, with genuine saved session ID; creation duration rules/idempotency remain intact.
- Removed the fixed introduction-specific mission description; title and practice availability remain server derived.
- Learner navigation now includes Dashboard, Programs, Mastery, IELTS pathway and Audio, with current-location indication. Admin access appears only for existing admin roles. Session routes disclose navigation to reduce distractions.
- Admin destinations moved from a crowded header to a distinct operational sidebar and native mobile disclosure. No destinations or safeguards were invented.
- Theme tokens replace the repeated exact hex palette and residual `white` backgrounds across 13 existing stylesheets. Separate text/fill roles prevent pale dark-theme labels from being used as button backgrounds.
- Public/auth guidance, button hierarchy, registration password hint and first-invalid-field focus improved. Forms retain autofill, paste, schema validation and generic safe errors.
- Active catalog program is identified; all unavailable/selectable logic remains server controlled.
- Reader measure, line-height, editor/recorder surfaces, objective questions and quiet block progress improved. Support controls expose expanded/controlled state. Drafts, consent, recording cleanup, durable checkpoints and evaluation feedback remain in their existing feature hooks.
- Scoped mastery `.evidence-header` and admin `.audio-browser-fallback` to reduce route stylesheet collisions.

## Implementation map

| Surface | Files / behavior |
|---|---|
| Foundations | `src/styles/tokens.css`, `workspace.css`, `learning.css`; root layout imports; versioned `lib/theme.ts` |
| Shared controls | `components/theme-control.tsx`, `workspace-navigation.tsx`; existing native button/form/alert/media components retained |
| Learner/Admin shell | `(learner)/layout.tsx`, `(admin)/layout.tsx` |
| Public/Auth | `app/page.tsx`, auth-page/form, `auth.module.css` |
| Dashboard/catalog/session | dashboard-view, program-catalog, session-shell plus focused tests |
| Cross-route themes | globals, onboarding, mastery, program catalog, IELTS orientation/bridge/pathway, admin authoring/curriculum/audit/observability CSS |
| Runtime QA | `e2e/ui-redesign.spec.ts`, one dedicated Playwright project |

Complete route/style ownership is in UX_AUDIT.md; token/component rules are in UI_DESIGN_SYSTEM_V2.md.

## Verification

Baseline `pnpm --filter @worklingo/web test`: **68 files / 273 tests passed**.

Focused checks during implementation:

- Shell/theme: 3 files / 12 tests passed; manual storage, blocked storage and cross-tab updates.
- Dashboard/catalog/session/auth: 4 files / 47 tests passed, including resume action, auth focus, submissions, retries, pause and draft behavior.
- `pnpm --filter @worklingo/web lint` and `typecheck`: passed.
- `pnpm --filter @worklingo/web build`: passed, all implemented routes compiled.
- Foundation and catalog desktop/mobile E2E: **4 passed** with real local API/PostgreSQL.
- New UI journey: passed on real APIs at 320, 375, 430, 768, 1024, 1440px and 720px zoom-equivalent reflow. Themes, reload, long Vietnamese name, overflow, skip keyboard focus, writing preservation and pause/resume verified. Browser control-contrast guard added after screenshot/review findings.
- Native Codex discovery: 17 new skills enabled at repo scope, zero discovery errors; all installed SKILL.md manifests and local Markdown references validated.

Final `pnpm verify` ran format/setup/lint/typechecks and workspace tests. Web: **69 files / 277 tests passed**. API: **148 files passed, 2 failed; 701 tests passed, 3 failed, 1 skipped** (705 total). Failing files:

- `apps/api/test/integration/health.integration.spec.ts`: setup/cleanup cannot connect to 127.0.0.1:5432; hook timeout and Prisma initialization error.
- `apps/api/test/integration/backup-restore.integration.spec.ts`: backup records/checksums, rejection of a non-empty restore destination, and complete restore rehearsal fail because the expected Compose `postgres` service is not running. The non-empty-target assertion receives an empty BackupDir after the preceding backup fails.

This gate exited nonzero before its later dedicated API integration/build/E2E stages. Its failures are environment prerequisites, not a passing repository gate. Web build and all web E2E are run separately; their final results follow below. Environment URL overrides were scoped to the shell process and pointed to 55432; no `.env` was changed.

The separate full web E2E command ran **39 passed, 1 failed, 7 did not run**. The failure was a 240-second timeout waiting for the second learner's start action in `admin-content-authoring.spec.ts` after earlier suites had run. The automatic snapshot belonged to the primary page, so it cannot prove the failing secondary page's state. No assertion was weakened and no source fix was inferred from that snapshot. A focused rerun of both Admin projects and both qualification projects completed **10/10 passed**, including authoring/publishing and old/new session version isolation. This covers the skipped downstream projects but does not turn the original full-suite result into a green run. Treat the non-reproduced combined-run timeout as a remaining test-reliability issue.

Theme mutation check: inverted the system-preference branch in a backed-up source file; **2 of 3 tests failed**, then restored the exact source and reran the tests. This demonstrates that the preference tests detect a real broken state transition.

Final focused checks after review/public skip links: auth/learner/admin/theme **16 passed**; homepage/auth/theme **9 passed**; restored theme **3 passed**. Final real-API UI QA **1 passed** (about one minute), including computed contrast for dark form values and the focused skip link. Final lint passed and the final web build compiles current application code. Auth input borders use the control-border token instead of decorative panel borders.

### Independent review

Reviewer found three actionable dark-mode issues: residual white form backgrounds (1.13:1), white evidence cards (1.13:1), and pale skip-link background (1.13:1). Corrected all three. A Chromium CSS fixture reproduced the skip-link foreground/background before correction and verified white text on teal afterwards. Actual-page E2E now measures form/skip contrast. Review also checked authorization, state preservation, real roadmap IDs and admin grid cascade at 320–1440px.

Token measurements are in UI_TOKEN_CONTRAST.json: primary text/surface 6.71:1 light and 8.60:1 dark; body/surface 14.23:1 / 12.91:1; muted/surface 6.22:1 / 7.97:1; control borders 3.59:1 / 4.94:1; focus 4.95:1 / 9.82:1. These are measured token pairs, not a claim that every possible screen-reader/contrast scenario has been manually certified.

### Visual evidence

Baseline: `ui-redesign-baseline-login.png`.

Actual API-backed screenshots: `ui-redesign-landing.png`, `login.png`, `register.png`, `onboarding.png`, `dashboard-light.png`, `dashboard-dark-mobile.png`, `programs.png`, `mastery.png`, `session.png`, `admin-dark.png` (all filenames have prefix `ui-redesign-`). Reviewed dashboard, session and admin renders. Dark-mode screenshots are regenerated by the final QA run after contrast fixes. Screenshots use dedicated E2E accounts/schemas; availability and empty states reflect real test-server responses.

## Limits and remaining work

- `pnpm verify` encounters health and backup/restore integration prerequisites at the default 5432/Compose service. The service is stopped because Windows cannot bind 127.0.0.1:5432. The separate review PostgreSQL container at 55432 supports API/E2E checks but does not satisfy those fixed/default lookups. No scripts/tests were weakened or backend changes made to hide it.
- No Lighthouse score, baseline bundle delta, physical mobile keyboard/assistive-technology certification, or complete human IELTS evaluation-quality claim. Accessibility evidence covers the targeted keyboard, semantic, reduced-motion, contrast and reflow checks. Existing mixed Vietnamese/English instructional copy is preserved.
- Combined E2E run has one non-reproduced admin-secondary-page timeout; focused admin/qualification rerun passed without changing its assertions. Investigate full-suite scheduling/state if it recurs.
- Optional IELTS programs remain gated by published server content and progression; new styling does not enable unavailable functionality.

## Completion status

Implemented: skills installation/verification, audit, V2 foundation/themes, public/auth, shared navigation, dashboard/active programs, learning workspace, cross-route styling and frontend QA evidence.

Environment blocker: complete repository verification depends on the default Compose PostgreSQL service. Resolve that prerequisite and rerun `pnpm verify` before a release claim. No production-ready assertion is made solely from visual implementation.
