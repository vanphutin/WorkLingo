# Phase 3 — Application Shell QA

Date:2026-10-20, Asia/Saigon. Status: implemented and verified with documented limitations; awaiting human acceptance. Phase4 remains unapproved.

## Phase 2 technical acceptance

**ACCEPTED WITH LIMITATIONS.** Verified commits4182515,12de4a4,2395da1 and follow-up429a8d0 against source, Phase2 QA/browser artifacts, design contracts and fresh original preservation. Recorded84 files/383 tests,35 targeted,16 foundation+12 core Chromium and2 production smoke checks remain Phase2 evidence, not rerun claims. Actual native controls and inline EvaluationFeedback retain their contracts; GlassSurface/theme/reduced-transparency remain canonical. No critical foundation blocker found. Limitations: Chromium/fixtures, no real protected API journey, native browser zoom, screen-reader or Web Vitals certification;0/34 fully migrated routes.

## Scope, owners and architecture

Existing learner/admin layouts own auth/role effects, redirects, logout, destinations and child slots. Their business effects and dependencies are unchanged. Shared WorkspaceNavigation owns only presentation/disclosure and segment-aware active state. Learner retains5 destinations; Admin retains13 in existing order and CA/SA guard. Header/navigation are separate GlassSurface siblings, feature content stays solid. Desktop learner/admin sidebar widths differ; small screens use nonmodal in-flow disclosure without overlay, trap, body lock or portal.

Focus-mode presentation covers dynamic session, placement, IELTS bridge, practice and mock attempt routes. Catalog/index routes stay ordinary. Solid compact header/navigation, optional menu and no reveal animation reduce chrome without adding keys or moving player children. Public changes affect existing header, native home link, theme/locale grouping and scoped styles only. Home content, CTA conditions and destinations are unchanged.

Production owners changed:

- `apps/web/src/app/(learner)/layout.tsx`, `(admin)/layout.tsx`, `app/page.tsx`.
- `apps/web/src/components/workspace-navigation.tsx`.
- `apps/web/src/styles/workspace.css`.
- `apps/web/src/i18n/messages/common.ts`:6 paired VI/EN keys.

Tests: existing layout/home tests, new workspace-navigation unit tests, `e2e/liquid-glass-shell.spec.ts`, `e2e/fixtures/shell-contracts.ts`, `playwright.shell.config.ts`. Documentation/evidence are task-owned. No package/backend/API/database/route/auth/learning player implementation changed. Generated Next declarations are excluded from commits.

## Isolation and baseline reconciliation

Branch `codex/worklingo-liquid-glass-redesign`; worktree `D:/Projects/WorkLingo-Liquid-Glass`; Phase3 base429a8d0a79707e7d6f9677502349cfd0b132e9b3. Main remains7a5e383763ccd63c4befa4ab07a5559ba7cabfbe. Pre-edit check found clean isolated worktree, no unfinished Git operations and preserved1,295 original hashes/status. Original layouts/navigation/workspace matched HEAD; dirty original HomePage/globals differ (HomePage824 additions/139 deletions). No dirty source was transferred. Worktree landing styles are inline; `landing.css` exists only in the original untracked work, so no parallel landing owner was invented.

## TDD and regression scenarios

Initial shell behavior RED:10 failures/15 passing, before implementation. Public navigation RED:1 failure/3 passing. Hidden-focus breakpoint regression reproduced and fixed using the last focused descendant when CSS leaves body active. Same-breakpoint media notification regression RED1/7 passing → GREEN8/8. Final targeted run:8 files/45 tests pass, exit0. Full web run:85 files/402 tests pass, exit0 (96.34s). Existing20 SessionShell and7 IELTS Mock tests pass in the same suite.

Real browser exercises the actual IeltsMockPlayer route, DOM and effects with a schema-validated existing reading/answer fixture. UUIDs satisfy the real transport schema; no fake player or route replaces it. Typed answer triggers expected revision1 PUT; shell toggle/Escape/theme/locale/viewport actions keep answer and timer nodes, value and initial GET count, and add no PUT/POST. Explicit Save Progress sends revision2 PUT with the same answer. Deadline remains fixture/server-owned. This is network-fixture integration, not real authentication, exam submission or recording-device certification.

## Independent review and fix

One fresh read-only reviewer found no Critical and one Important issue:ordinary activation of a current-destination link hid its focused anchor. Parent reproduced unit RED1 failed/8 passed, then optimized browser RED2 failed (Learner and Admin). Fix restores trigger focus before hiding an explicitly open panel, while ordinary desktop links retain their own focus. Targeted GREEN45/45 and development browser GREEN2/2 protect actual Enter activation. Full402-test suite, lint, typecheck, build and final production matrix were rerun because production behavior changed. No second reviewer or implementation fanout. All declined-to-judge behaviors and parent scope/evidence rulings are in [review.md](evidence/phase3/review.md).

## Browser/visual evidence

Before:12 native full-page PNGs from retained optimized Phase2 build, baseline429a8d0, with the same actual routes/fixtures, VI, light/dark. Separate baseline Settings CSS200% capture and dimensions retained. After: real Next routes `/`, `/settings`, `/admin/content`, `/ielts/mock-tests/[attemptId]`, light/dark ×390×844,768×1024,1440×900. Development matrix before final review:13/13 pass; post-fix disclosure regression2/2 pass (3 baseline-only cases intentionally skipped). Final optimized production after review fix:13/13 pass,53.8s, with3 baseline-only cases skipped. [12 before/after comparisons and originals](evidence/phase3/README.md) cover public, learner desktop/mobile, admin desktop/mobile and focus-mobile in both themes; all65 PNGs are hashed in the visual manifest.

Chromium full-page capture was instrumented and observed transiently changing viewport1440×900 →1×1 →1440×900. That legitimately closes responsive disclosure. Open-state images therefore use viewport capture; tests still assert menu visibility/link counts after capture, and real breakpoint reset remains tested. This is a capture-tool adaptation, not suppressed product behavior. Diagnostic/filtered runs write separate suffixed JSON; only an explicit `WORKLINGO_SHELL_EVIDENCE_RUN=matrix` writes authoritative results.

Checks include Escape return focus, Enter/Space, Tab without trap, outside interaction without focus theft, same-route close, history, breakpoint focus repair, skip link, touch targets, VI/EN labels, System dark, Reduced Transparency/Motion, Increased Contrast and Forced Colors. Screenshot-pixel probes sample real composite header/sidebar material against computed text; applicable locale boundaries use computed solid colors. Development42 composite samples:minimum9.053:1. Locale-control24 boundary samples:minimum3.672:1. Production has the same42/24 samples and minima, retained separately; these are sampled surfaces/roles, not whole-product WCAG certification.

CSS200% at390px with Vietnamese uses **native keyboard Tab auto-scroll, no explicit scrolling** through5 learner/13 admin links. Scroll margins prevent edge rounding/clipping; fade-only mobile reveal avoids motion displacing focus. This does not certify native browser zoom. Existing Settings feature content overflows in baseline (564px document width) and current shell (596px,32px larger from outer16px shell insets). Shell navigation/header fit390px. Admin content fits. Settings feature grid/card redesign is deferred to Phase4; no overflow-hiding CSS masks it and whole-page zoom acceptance is not claimed.

## Final gates

| Check | Result | Evidence | Limitations |
| --- | --- | --- | --- |
| Targeted unit/component |8 files/45 passed |phase3-targeted-final.txt |Actual layouts/navigation plus existing theme/material behavior |
| Full web suite |85 files/402 passed |phase3-web-final.txt |Web scope; no backend suite required for unchanged backend |
| Lint |Pass, exit0 |phase3-lint-final.txt |Original dirty checkout's pre-existing lint issue unchanged |
| Typecheck |Pass, exit0 |phase3-types-final.txt |Run after optimized build; generated Next declaration matches HEAD |
| i18n |Pass,27 namespaces/1671 paired keys/0 errors |phase3-i18n-final.txt |345 candidate-unused keys informational |
| Optimized build |Pass, exit0, existing34 page routes retained |phase3-build-final.txt |Not a deployment |
| Chromium development |13 passed/3 baseline-only skipped, then2 post-fix passed |after-results.json |Network fixtures; real routes/components |
| Chromium production |13 passed/3 baseline-only skipped |production-results.json |Same source, optimized build; not live authenticated E2E |
| Baseline capture |3 passed/13 after-only skipped |before-results.json |RetainedPhase2 optimized build;12 representative captures+Settings zoom |
| Preservation |Main/status/1295 original files unchanged |preservation.json |Read-only snapshot comparison, no dirty-source transfer |
| Independent review |One Important focus defect reproduced and fixed |[review.md](evidence/phase3/review.md), unit/browser RED→GREEN |One fresh bounded reviewer, no fanout; no unresolved Critical/Important |

Logs above are retained under [evidence/phase3/gates](evidence/phase3/gates/). Machine observations are under [evidence/phase3](evidence/phase3/).

All production JS chunks combined:1,908,214→1,917,637 bytes (+9,423,+0.49%); gzip558,633→561,642 (+3,009). CSS143,526→147,561 (+4,035); gzip31,730→32,465 (+735).64 chunks in both builds. This is aggregate build output, not per-route transfer, Web Vitals or FPS profiling. No dependency/framework addition, continuous layout measurement or per-item blur.

Firefox/WebKit executable paths are absent; no engines installed. No FPS, screen reader, live API, media recording/submission, native browser zoom or full34-route qualification claimed. Direct visual inspection includes learner desktop light, admin mobile dark open, actual mock mobile light, and public desktop light/admin desktop dark/learner mobile light/focus mobile dark comparison sheets. Other matrix screenshots are retained and dimension/state checked without claiming individual visual inspection.

## Commits and next phase

- `307829b24b402312897e317b9186933b62359cb3` — `feat(ui): redesign application shells and responsive navigation` (10 source/unit files).
- `80177eb3381d069420647c9e4dcdfb0490a424da` — `test(ui): verify responsive shells and player continuity` (3 harness files).
- `docs(ui): record phase three QA and shell comparisons` — this report/evidence commit; resolve its self-hash with `git log -1 -- docs/ui-redesign/phase3-qa.md`.

[Exact changed-file manifest](evidence/phase3/changed-files.txt) includes every task-owned file. No merge/push/deploy. Route migration stays0/34; Phase4 needs human approval and deliberate original dirty-source reconciliation for feature owners. Keep this branch/worktree for review and continuation.


## SKILL AUDIT

Used: ui-ux-pro-max → shell hierarchy/keyboard/composite contrast; codex-quota-optimizer → reused inventory/baseline, targeted-first checks and one reviewer; executing-plans → Task3 brief/ledger/rulings and task-done45-test gate; test-driven-development → shell/public/media/current-link RED→GREEN; Git worktrees/versioning → isolated ownership and explicit atomic commits; vercel-react-best-practices → stable child placement and unchanged auth/player effects; systematic-debugging → material boundary, hidden breakpoint focus, screenshot1×1 event and zoom evidence; requesting/receiving-code-review + code-review-and-quality → one five-axis reviewer and reproduced Important fix; web-design-guidelines → fetched current scoped UI guidelines; verification-before-completion → final logged gates, hashes and original preservation; finishing-a-development-branch → preserve named branch/worktree according to explicit user policy.

Verification:402 full web tests,45 targeted,13 optimized shell browser checks,2 post-review development regression checks; lint/types/i18n/build/whitespace and1,295 original hashes verified. Historical development13 checks retained separately. Unit current-link click emits a jsdom document-navigation diagnostic; it is not a failed test and real Chromium Enter behavior is independently RED→GREEN tested.

Not used: extra implementation/review fanout, duplicate frontend frameworks/skills, backend/database/Sites/imagegen or a new mandate lifecycle. Existing approved direction/plan governs routine design decisions; no additional skill approval flow or installation was introduced. Keep this plan ledger for later authorized phases rather than deleting ongoing-work context.
