# WorkLingo Liquid Glass Implementation Plan — proposed V2 addendum

Approval update2026-10-20: sequential human directives approved **Phase1, Phase2 and now Phase3 Application Shell** on the required isolated branch/worktree. Phase1/2 technical acceptance and Phase3 evidence are recorded in [progress](progress.md), [design system](04-design-system.md) and [Phase3 QA](phase3-qa.md). Phase4–6, merge, push and deployment remain unapproved. The broader proposal below is historical planning, not authorization for later work; current execution rulings preserve committed worktree owners without transferring dirty original UI.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for approved inline execution, or superpowers:subagent-driven-development if the human chooses delegation. Checkboxes below are execution gates, not claims of completed implementation.

**Goal:** Migrate all 34 discovered WorkLingo page routes to a coherent Liquid Glass design language while preserving the real application's behavior.

**Architecture:** Extend the existing tokens/theme and feature components in place. Solid content, distinct controls, restrained glass navigation/overlays; no parallel frontend, competing theme manager or new UI framework.

**Tech Stack:** Actual Next 16.3.8 / React 19.3.0 / TypeScript 5.9.3 / pnpm 10.34.1; existing Vitest and Playwright.

**Spec:** User's Liquid Glass master brief, consolidated here with [audit evidence](01-ui-audit.md) and [route acceptance matrix](03-route-coverage.md). This is an approval-pending **addendum** to [2026-10-14-ui-redesign-v2.md](../superpowers/plans/2026-10-14-ui-redesign-v2.md), linked to [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md). It does not replace the canonical product backlog, create a sprint commitment or reinterpret the Intermediate workload mandate.

## Global Constraints

- Preserve business logic, API contracts, auth/roles/permissions, database/schema/migrations, learning progress/history, scoring, timers, autosave/submission, audio/recording/playback, i18n and URL/deep-link semantics.
- Any necessary business-rule change requires separate human approval. UI focus handling, class composition and presentation preferences are within the proposed UI scope.
- Extend `styles/tokens.css`, `lib/theme.ts` and existing ThemeControl; no parallel token file or theme manager. Keep client/server boundaries and SSR behavior.
- No dependency replacement, new animation/UI framework, SF Pro download, canvas/WebGL decoration or backend workaround for frontend tests.
- Content stays solid/near solid. Glass is limited to selected navigation, grouped controls and overlays; no nested glass layers or blur per repeated table row/card.
- Accessibility target WCAG 2.2 AA: normal text ≥4.5:1, large text ≥3:1, applicable non-text controls ≥3:1; readable composite glass, keyboard/focus, zoom/reflow, reduced motion/transparency and contrast fallback.
- Required visual sizes: **390×844, 768×1024, 1440×900**; retain existing smaller-width tests where valuable. Chromium, Firefox, WebKit must be verified or explicitly blocked in final report.
- Protect the current dirty tree. No automatic commit of unrelated work, push, merge, deploy, data migration or production-data mutation. No blanket staging or reset.
- Proposed branch after approval: `codex/worklingo-liquid-glass-redesign`. Use current working-tree content as the starting design baseline, with reviewed ownership boundaries; a clean HEAD worktree alone would omit existing UI changes. Decide the safe transfer mechanism through the worktree workflow at execution start, without stashing/resetting unknown work.
- User gate: **“Không thay đổi hàng loạt UI trước khi được duyệt kế hoạch.”** Phase 0 delivers reviewable documents/evidence only. Approval covers the chosen addendum scope, not release or publication.

## C. Proposed Design Architecture

### 1. Token migration in the existing source of truth

Three implementation options were considered: replace pages independently (rejected: duplication/regression), add a global CSS override layer (rejected: increases specificity debt), or **extend semantic tokens and migrate shared owners before feature CSS** (recommended). Keep V2 structure and behavior; change visual language deliberately.

`tokens.css` continues to own primitives, semantic aliases, light/dark/system values, typography, spacing and motion. Component CSS may define scoped layout variables, but must consume semantic colors. Editor/media diagnostic palettes are documented exceptions.

| Existing consumer token | Proposed compatibility target | Notes |
| --- | --- | --- |
| `--background` | `--surface-secondary` | Grouped app canvas |
| `--surface` / `--surface-soft` | `--surface-primary` / `--surface-tertiary` | Solid content and quiet secondary grouping |
| `--foreground` / `--muted` | `--text-primary` / `--text-secondary` | Add separate muted/disabled/placeholder tokens; do not silently lower all muted contrast |
| `--primary` | `--color-primary` | Link/label role, not necessarily button fill |
| `--primary-fill` / `--on-primary` | `--color-primary-fill` / `--color-on-primary` | Preserve distinction between readable text and filled backgrounds |
| `--primary-hover` / `--primary-soft` | `--color-primary-hover` / `--color-primary-subtle` | Add active state |
| `--border` / `--control-border` | `--border-default` / `--border-strong` | Decorative separators and input boundaries have different contrast requirements |
| `--focus` | `--focus-ring` | Keyboard focus must not be hidden by later feature CSS |
| `--success`, `--warning`, `--danger`, `--info` and soft/fill variants | Matching `--color-*`, `--color-*-subtle`, `--color-*-fill` | Keep status text/fill roles distinct |
| `--radius-control/panel/feature` | Alias chosen `--radius-*` scale | Preserve until all consumers mapped |
| `--motion-fast`, `--motion-ease`, `--shadow` | Alias new duration/ease/shadow scales | Retain existing consumers during migration |

Primitive palette from the brief (light/dark):

| Primitive | Light | Dark |
| --- | --- | --- |
| `--ios-red` | #FF383C | #FF4245 |
| `--ios-orange` | #FF8D28 | #FF9230 |
| `--ios-yellow` | #FFCC00 | #FFD600 |
| `--ios-green` | #34C759 | #30D158 |
| `--ios-mint` | #00C8B3 | #00DAC3 |
| `--ios-teal` | #00C3D0 | #00D2E0 |
| `--ios-cyan` | #00C0E8 | #3CD3FE |
| `--ios-blue` | #0088FF | #0091FF |
| `--ios-indigo` | #6155F5 | #6D7CFF |
| `--ios-purple` | #CB30E0 | #DB34F2 |
| `--ios-pink` | #FF2D55 | #FF375F |
| `--ios-brown` | #AC7F5E | #B78A66 |

Neutral primitives: gray #8E8E93 both; gray2 #AEAEB2/#636366; gray3 #C7C7CC/#48484A; gray4 #D1D1D6/#3A3A3C; gray5 #E5E5EA/#2C2C2E; gray6 #F2F2F7/#1C1C1E. Proposed surfaces: primary #FFFFFF/#000000, secondary #F2F2F7/#1C1C1E, tertiary/elevated #FFFFFF/#2C2C2E; semantic grouping may reuse these values. Foregrounds get measured values, not light gray by convention.

**Contrast decision requiring approval with this plan:** raw #0088FF with white normal text is **3.52:1**, below 4.5. Keep the exact primitive, but use a darker semantic primary/fill **#0066CC + white in light mode (5.57:1)**. In dark mode use **#0091FF + black fill text (6.49:1)**, with independent semantic link/hover/active tokens verified on their actual surfaces. These are sRGB pair calculations, not composited glass measurements or certification. Success/warning/destructive fills likewise need separate on-color tokens; primitive color is not permission to use unreadable text.

Additional semantic API: `--surface-elevated`, `--text-muted`, `--text-disabled`, `--text-placeholder`, `--text-inverse`, status labels, `--color-primary-active`, `--color-info`, `--border-strong`. Components prefer semantic values; legacy names alias semantic values until references are migrated and verified.

Typography: system stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", sans-serif`; no font download. Title/body reference 34/28/22/17px, callout 16, subhead 15, footnote 13, caption 12; dense admin may use 14–16 body where readable. Reader stays ~70ch. Spacing 4/8pt; radii xs/sm/md/lg/xl/pill with controls 12–16px, content/dialog 20–28px, pill 999px. Page width ~1200px, mobile padding 16–20px and safe-area insets. Tables use tabular numbers and contained scrolling where necessary.

Motion: micro 120–180ms (default 150), standard 200–250ms (default 220), overlay 250–350ms (default 280). Use named duration/ease tokens, explicit properties, transform/opacity for motion; no default ambient infinite animation. No animated timer/recording result shifts. Reduced motion disables nonessential motion. Stack order tokens define content < sticky navigation < backdrop < dialog < toast; no magic 1000 added independently in a feature.

### 2. Shared surface contract and CSS ownership

No existing generic Surface/GlassSurface was found in the current shared components. Add only the primitives consumed by this app; retain native controls and domain state owners.

Proposed file `apps/web/src/components/glass-surface.tsx`:

```ts
type GlassVariant = 'regular' | 'clear' | 'tinted' | 'solid';
type GlassTint = 'none' | 'primary' | 'indigo';
type GlassSurfaceProps = React.ComponentPropsWithRef<'div'> & {
  readonly variant?: GlassVariant;
  readonly tint?: GlassTint;
};
function GlassSurface(props: GlassSurfaceProps): React.ReactElement;
```

Default regular/none. Render a neutral div with scoped class/data attributes, forward native props/className/ref. No `'use client'`, state, event wiring, button role or business assumptions. Wrap existing semantic `nav`, `aside` or toolbar content without replacing semantics. Use native `dialog` or the existing overlay's semantic owner for modal behavior; do not make this div an overlay framework.

`styles/glass.css` owns composition and accessibility overrides, imported once from root immediately after `tokens.css`; existing global/workspace/learning order remains. `--glass-bg/border/highlight/shadow/blur/saturation/tint/opacity` live in tokens. Regular target blur 20px/saturation 180%; clear 6px and only a verified rich-media backdrop; tinted 28px and higher opacity; solid no blur. Start with opaque base CSS, opt into translucency through `@supports` for standard and prefixed backdrop filter. Never default clear on a form/exam.

Scoped `styles/primitives.css` owns only adopted shared presentation classes (surface/action/field/status), imported after globals and before workspace; no broad `button` rewrite. Reuse native elements and current callbacks. Extract shared React components only where repeated markup and accessibility justify them; do not create unused Switch/Datepicker/CommandMenu/Table frameworks. Migrate owner selectors rather than append all new CSS to globals.

### 3. Theme and accessibility integration

Keep `worklingo:theme:v1`, theme cycling, system CSS media query, storage events, SSR locale and existing pre-paint initialization. No route tree keys/remounts on theme or resize.

Add presentation-only `worklingo:reduce-transparency:v1`, values `reduce`/absent, exposed through an accessible checkbox in the existing settings appearance group. Extend the same static initialization and external-store pattern; `data-reduce-transparency="true"` selects solid material. OS `prefers-reduced-transparency` and `prefers-contrast: more` force solid even without preference; `forced-colors` uses system colors and visible boundaries. Storage failure keeps the current page usable, storage clear syncs tabs. This preference is not a backend profile field, schema change or competing theme manager. Add vi/en labels through the existing catalog, not inline ternary translation copies.

Existing feedback topup remains in the same component/state flow. Add UI focus entry, focus containment/restoration and Escape handling, with backdrop/inert behavior consistent with a real modal; keep inline variant, toast triggers, retry/recording deletion and evaluation status logic unchanged. If preserving its floating behavior actually requires modeless semantics, bring that semantic decision back for approval rather than silently relabel the interaction.

Glass contrast acceptance samples **rendered foreground over actual composites**, including scroll under navigation, light/dark and worst-case backgrounds. Increase opacity → tinted → solid until readable. Provide keyboard-only overlay checks, 200% zoom/reflow, visible focus, non-color state labels, safe-area and touch target checks. No blanket WCAG AAA claims in settings.

## Review Focus

1. Blocked/corrupt storage, cleared tabs and system theme changes: readable pre-paint fallback and stable hydration; task 1 pins the preference cases.
2. A learner types in reading/writing/recording or an IELTS attempt while changing theme, language or viewport: same mounted draft, timer, recording and active block; tasks 2–4 pin this.
3. Keyboard opens feedback while an async evaluation completes: focus remains valid, Escape closes, focus returns, no stale callback/double submission; task 2 owns this test.
4. Long Vietnamese labels, 200% zoom and fixed navigation/dialog on a 390px device: focused control and submit remain visible; tasks 3/5 own this.
5. Admin navigates between AI/audio/curriculum with an unsaved editor and later-loaded global CSS: no style leakage or source/revision loss; tasks 4/5 own this.

## D. Implementation Plan

Dependency: Phase 0 approval → task 1 foundation → task 2 core controls/overlays → task 3 shell → task 4 route modules → task 5 consistency → task 6 final QA. Use inline execution by default to reduce context duplication; a bounded independent review at the final gate. There is no permission pause per routine change inside the approved scope.

### Task 1 / Phase 1 — foundation and preferences

**Modify:** `apps/web/src/styles/tokens.css`, `src/lib/theme.ts`, `src/components/theme-control.tsx`, `src/app/layout.tsx`, `src/app/(learner)/settings/page.tsx`, `src/i18n/messages/common.ts`.
**Create:** `src/styles/glass.css`, `src/components/glass-surface.tsx`, `src/components/transparency-control.tsx` and corresponding component tests. No public showcase route by default; fixture isolated in tests to keep production route inventory unchanged.
**Interfaces:** consumes existing THEME_STORAGE_KEY/themeInitScript and locale APIs; produces GlassSurface contract above, semantic aliases and `TransparencyControl(): React.ReactElement` using `worklingo:reduce-transparency:v1`.

- [x] Before implementation, route TDD/worktrees/Next guidance. Read locally bundled Next docs for CSS/layout and Server/Client boundaries; never assume APIs from memory.
- [x] Add failing behavior tests in `components/transparency-control.test.tsx` and extend `theme-control.test.tsx`: keyboard preference, reload/init, blocked/invalid storage, storage-clear sync and an already typed field surviving updates. GlassSurface test asserts native className/ref/children, default and explicit variants.
- [x] Run focused tests to observe the expected missing-feature failure, then implement minimal CSS/component/preferences. Pure reversible color/layout edits need browser verification rather than implementation-mirroring unit tests.
- [x] Verify computed palette and glass fallback in Chromium test fixtures for both themes, system-dark without JS, `@supports` failure, reduced transparency, increased contrast/forced colors; measure composite labels and focus boundaries. Run `pnpm --filter @worklingo/web exec vitest run src/components/theme-control.test.tsx src/components/transparency-control.test.tsx src/components/glass-surface.test.tsx` → all pass; then web lint/typecheck. Interim lint gate means no new diagnostics relative to the recorded baseline; an unchanged `pIndent` failure remains a reported blocker to a green full gate. It does not authorize editing unrelated dirty code. If the approved curriculum slice already touches that scope, resolve the unused variable there as a scoped cleanup; otherwise retain the blocker or obtain owner resolution.
- [x] Record foundation evidence and exact token map in `04-design-system.md`; establish baseline format/lint issue ownership before proceeding. Do not claim route migration complete yet.

### Task 2 / Phase 2 — shared presentation and feedback accessibility

**Modify:** `src/styles/workspace.css`, `src/styles/learning.css`, `src/app/globals.css`, `src/features/auth/auth.module.css`, `src/features/learning-session/evaluation-feedback.tsx` and its existing test.
**Create:** `src/styles/primitives.css` only for adopted shared styles.
**Interfaces:** consumes semantic tokens and GlassSurface; produces consistent existing native button/input/card/status patterns. EvaluationFeedbackProps and all business callbacks remain compatible.

- [x] Inspect actual interaction contract before changing semantics. The Phase2 execution directive supersedes the older modal assumption: committed EvaluationFeedback is inline, with no opener/close/variant or aria-modal. Preserve inline Tab/Shift+Tab/Escape and async draft/focus continuity; no invented modal. Add RED→GREEN busy-action tests and retain retry/deletion assertions. Any future overlay requires its own approved contract.
- [x] Implement existing native presentation patterns and scoped field/action states; keep feedback/forms/tables solid. No unused primitives or glass-button API. Disabled/loading/error/success/empty/selected states checked within the adopted controls; full route-specific states remain later work.
- [x] Run `pnpm --filter @worklingo/web exec vitest run src/features/learning-session/evaluation-feedback.test.tsx src/features/learning-session/session-shell.test.tsx src/features/auth` →35 pass; full web84files/383tests,12 core Chromium checks,16 foundation regressions,2 production smoke checks. Scoped hover regression RED→GREEN, controlled async completion and outline geometry after explicit scrolling. See `phase2-qa.md` for evidence, review and limits. Phase3 remains unapproved.

### Task 3 / Phase 3 — application shells

**Modify:** learner/admin layouts, `components/workspace-navigation.tsx`, `styles/workspace.css`, shell tests; public header in `app/page.tsx`/`landing.css` only for presentation.
**Interfaces:** consume existing NavigationItem href/label and role/locale state unchanged; use one regular glass navigation layer per visible navigation group. Solid page container at ~1200px; learner <=5 primary destinations; admin responsive disclosure retains all 13 links including learner view.

- [ ] Extend shell tests for same URLs/current route/role filtering/skip-link and exam presentation on actual IELTS dynamic routes; assert no player remount or changed API request payload after theme/navigation disclosure changes.
- [ ] Implement responsive shell, safe-area spacing and clear theme controls. Avoid glass nesting between header/nav; grouped controls share a material surface. Quiet exam content with no decorative animation.
- [ ] Run `pnpm --filter @worklingo/web exec vitest run "src/app/(learner)/layout.test.tsx" "src/app/(admin)/layout.test.tsx" src/components` → pass; Playwright at all 3 required sizes and 200% zoom/reflow, long vi/en labels, keyboard focus and scroll. Record shell coverage without closing unreviewed feature rows.

### Task 4 / Phase 4 — migrate real product modules

**Files:** page sources/imported feature owners and CSS are enumerated per row in `03-route-coverage.md`/source-inventory.json. Keep tests adjacent; no backend/client-contract changes.
**Interfaces:** consume unchanged domain props, typed clients, version IDs and route params; produce visual changes with existing state lifetime. Apply each row's module checks, not a token-only completion flag.

| Ordered slice | Files / owners | Regression gate |
| --- | --- | --- |
| Public/auth + error boundaries | `app/page.tsx`, `landing.css`, `features/auth/*`, login/register wrappers, `app/error.tsx`, `not-found.tsx` | Auth validation/destination; motion controls; vi/en; error recovery integration; accessibility qualification |
| Dashboard/programs/evidence | learning-session/dashboard-view, learning-programs, curriculum-roadmap, engagement, mastery | Mission/resume priority, active/disabled programs, real evidence, checkpoint/error-bank filters |
| Onboarding + learning/media | onboarding, sessions page, SessionShell/renderers, audio and feedback | Placement-only route guard, all 4 skills, draft/resume, microphone consent/tracks, source fallback, failed/pending evaluation |
| IELTS orientation/bridge | ielts-orientation, ielts-bridge and page wrappers | Version/stage progress, media, teacher feedback, admission and locked catalog |
| IELTS integrated/pathway/mock | ielts-integrated, ielts-band-curriculum, ielts-mock | Pinned version, duration/difficulty, server timer/reload, expiry/submission and results; no target-as-score misrepresentation |
| Admin authoring | admin-content, admin-curriculum, all admin-ielts-* owners | Unsaved editors, optimistic conflict 409, validate-before-publish, immutable versions, destructive confirmation and role denial |
| Admin operations/settings + learner settings | admin-audit, admin-observability, ai, audio, settings pages/CSS | Real metrics, filters/pagination, safe provider states, persistence; audio↔AI↔learner style isolation |

- [ ] For each slice: inspect current state/dirty ownership; reproduce meaningful behavior via existing fixtures; add failing regression tests only for changed UI behavior; implement smallest owner-scoped patch; run its existing targeted Vitest files first.
- [ ] Run corresponding E2E project in a disposable schema, for example `pnpm --filter @worklingo/web e2e --project=ielts-full-mock-desktop --project=ielts-full-mock-mobile`. Use projects in current config; avoid dependency fan-out when a focused run suffices.
- [ ] For each route, inspect loaded/empty/loading/error/disabled and actual interactions at required viewports/themes; test one representative overlay state where present. Record fixtures, screenshots and gaps against each row. No fake data replacing real controls.
- [ ] After the slice's checks pass, review explicit changed files and make an atomic commit for only owned changes if approved Git execution scope permits. Keep unrelated dirty work out; no push/merge. Update progress/coverage once per slice.

#### Phase 4 execution contract — approved 2026-10-20

Source: human master attachment `e5a41d65-254b-4b8e-9246-71c3e78f82f2/Pasted text.txt`. Execute the seven slices above, in order, on the existing isolated branch. Phase3 technical acceptance is recorded in `phase4-qa.md`; Phase5/6 and publication remain unapproved.

For each slice, inspect its actual page/feature owners and original dirty overlaps; retain domain handlers, effects, state, keys and API contracts. Redesign the actual page hierarchy, spacing, solid content and control grouping. Reuse the existing tokens, native controls and GlassSurface. No unused parallel component system, fake metrics or feature additions. Public landing may extract its existing inline styles into an owner stylesheet; the original untracked landing.css is not a dependency and must not be copied wholesale.

Test changed behavior before implementation. Browser RED for reflow/focus defects; existing contract tests for unchanged behavior; no tests that merely assert class names. Compare the committed baseline2d9ba79 with the resulting slice under identical fixtures, viewport, locale and appearance. For each route, cover important loaded/empty/error/disabled states, actual interactions, Light/Dark, 390×844,768×1024,1440×900, and narrow/CSS200 where risky. Keep screenshots and machine results under `evidence/phase4/slice-N/`. Fixture-backed checks are separate from live API certification.

Seven slice checkpoints: public/auth(3 routes +2 boundaries); dashboard/programs/mastery(3); onboarding/placement/session(3); IELTS orientation/bridge(3); integrated/pathway/mock(5); admin authoring(9); operations/settings(8). Each checkpoint requires targeted tests, browser evidence, diff review, scoped atomic commit, coverage/progress/QA update. Use statuses Discovered/In progress/Implemented/Verified/Blocked/Approved exception; no invented human exceptions and no route verification from token adoption alone.

P0 review focus: draft/answer/media node identity across theme/locale/resize; server-owned timer and autosave/reload/submit payloads; admin unsaved/version/conflict/publish guards; CSS owner isolation; Settings whole-page reflow. Fix P4-SETTINGS-REFLOW-001 at its feature owner in Slice7 without hiding overflow. Bounded independent review after important P0 slices and once at the end; do not duplicate review or full suites per file. Final gates: web test/lint/typecheck/build, i18n and whitespace, affected Chromium journeys; report unavailable engines, hardware, live services and native assistive testing honestly.

### Task 5 / Phase 5 — consistency/accessibility audit

**Files:** the migrated owners, `03-route-coverage.md`, `04-design-system.md`, targeted Playwright visual checks in existing `e2e/ui-redesign.spec.ts` or a scoped additional spec.
**Interfaces:** consumes completed row evidence; produces no unsupported exceptions.

- [ ] Scan actual frontend styles once for legacy colors/radii/type/spacing, `transition: all`, surplus blur, undocumented hardcode and `!important`; compare to static baseline, then inspect rendered route transitions. Do not replace every rgba or legitimate editor literal blindly.
- [ ] Check representative controls/shared surfaces with stable visual regression assertions; freeze animations/time only in fixtures, not production. Add no hundreds of arbitrary snapshots. Actual composite contrast and keyboard overlay tests accompany pixels.
- [ ] Inspect light/dark/system, no-JS readable surfaces, reduced motion/transparency, increased contrast/forced colors, zoom 200%, long Vietnamese text, overflow and safe areas. Finish audio→AI→curriculum transition test and preserved source/draft cases.

### Task 6 / Phase 6 — regression and handoff

**Files:** `05-qa-report.md`, `06-migration-summary.md`, progress/coverage/design-system docs; only redesign-caused regression fixes in source.

- [ ] Inspect current scripts and run final gates once. When all disposable-service prerequisites are ready, prefer **one `pnpm verify`**: it already includes format/i18n/mandate/tooling checks, monorepo lint/typecheck/tests/build and web E2E. Do not run the same individual full web gates immediately before it. If it stops early, record the stopping command and run only the relevant remaining frontend gates that did not execute. When full-stack prerequisites are unavailable, run `pnpm format:check`, `pnpm i18n:check`, web lint/typecheck/test/build and the feasible focused critical E2E instead, recording the full gate as blocked. New source changes after a check justify a targeted rerun; unchanged baseline failures are never reported as green.
- [ ] Browser matrix: Chromium + Firefox + WebKit. Current repository E2E projects are Chromium/Pixel 5, not cross-engine coverage; add focused named Firefox/WebKit projects for common primitives, auth and critical players after browser availability is arranged. Native recording/API differences need explicit results, not a pretend Chromium equivalence.
- [ ] Measure Web Vitals/render/scroll under a repeatable environment before/after if possible; if no comparable pre-change run exists, record performance as unmeasured. Keep blur off repeated lists/rows and heavy libraries absent regardless.
- [ ] Independent code review and final source diff; compare initial user modifications, i18n and contract/API boundaries. Fix introduced regressions; report baseline failures distinctly. Never skip tests or relax expectations to make the report green.
- [ ] Report total/discovered/migrated/remaining routes; upgraded components/tokens/variants; theme/responsive/accessibility/browser results; all commands/results/blockers/severity; exact own commits and rollback. No complete claim until every route row is verified or has approved exception.

## Rollback and continuation

Before implementation, preserve the reviewed initial dirty snapshot through the safe Git workflow. Every committed slice must be individually revertible without touching backend/schema; any rollback targets only this work's known commits, never `reset --hard` or unrelated changes. Keep alias tokens until the last consumer is migrated. Theme storage key stays backward compatible; removing the optional transparency preference returns to CSS/OS default without affecting learning data.

`progress.md` is the next-session entry point, followed by coverage and this addendum; do not repeat repository-wide discovery when unchanged. The older V2 report remains historical. Later design-system/QA/migration files supplement this same plan, not another backlog.

## E. Approval Gate

Please approve this concrete scope before Phase 1:

1. Blue/indigo Liquid Glass direction, solid learning/admin content, current V2 infrastructure retained.
2. Semantic accessible blue adjustments while preserving exact requested palette primitives; GlassSurface variants and the local reduced-transparency preference described above.
3. All 34 routes and 2 global error boundaries, ordered dependency/verification gates, existing dirty-source ownership protection; baseline lint/format findings remain disclosed until separately included or resolved by their owner.

Recommended execution is inline with targeted checks and one bounded independent final review for quota economy. Routine approved changes do not need individual permission. Business-rule/data changes, destructive Git actions and publication remain outside this approval.

Self-review: brief sections map to foundation/theme/material/typography/motion (task 1), components/states/a11y (task 2), navigation/layouts (task 3), all actual modules (task 4), consistency and visual regression (task 5), full QA/evidence/rollback (task 6). No unsupported reset-password or standalone skill route was added. Interfaces and storage keys are named above. Builder review completed: no consequential design question left; clarified handling of existing lint blockers and avoided duplicate final suites. Reviewer checked these documents, not the original attachment or runtime source; final source-preservation/inventory checks are recorded in progress.

## Task5 execution contract — approved2026-10-20

Continue from cfd7e27; validate prior source/evidence then audit34routes+2boundaries using existing owners/fixtures. Fresh320/360/390/768/1440, Light/Dark/System, CSS200 risks, actual composite/nontext contrast, names/landmarks/focus, glass/cascade/performance samples. Reproduce and fix UI findings with targeted RED/GREEN; keep domain handlers/Orientation409/inline feedback/API unchanged. One final independent review and one set frontend final gates. Record per-route audit dimensions in03-route-coverage and single phase5-qa report/evidence. No Phase6/merge/push/deploy.
