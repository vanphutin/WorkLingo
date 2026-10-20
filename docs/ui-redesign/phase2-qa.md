# Phase 2 QA — core presentation

Date: 2026-10-20. Branch `codex/worklingo-liquid-glass-redesign`; worktree `D:/Projects/WorkLingo-Liquid-Glass`; Phase 2 base `8ad9ba8759c604521d87a6c9f9103b2a917d94bc`.

## Phase 1 technical acceptance

**ACCEPTED WITH LIMITATIONS.** Reviewed both Phase 1 commits, token/material/preference source and tests, QA and machine evidence. The branch was clean before Phase 2; both commits are ancestors. Fresh preservation verification matches main `7a5e383763ccd63c4befa4ab07a5559ba7cabfbe`, status and 1,295 original files. No merge/rebase/cherry-pick or unmerged index entries. Existing foundation evidence:84 files/380 unit tests,16 Chromium checks,3 optimized smoke checks; no critical unresolved foundation defect. Those historical runs are not presented as newly executed acceptance checks.

Limitations carried forward: Firefox/WebKit unavailable, no real API/IELTS E2E, no screen-reader certification or Web Vitals. The old 390px+Vietnamese+200% zoom+focused-bounds gap is exercised by Phase 2 below. It remains **CSS zoom**, not native browser zoom.

Authority: user's “WORKLINGO LIQUID GLASS — PHASE 1 ACCEPTANCE & PHASE 2 EXECUTION” attachment dated this task. It approves technical acceptance followed by Phase 2 implementation, not merge or Phase 3–6.

## Contract and scope rulings

`EvaluationFeedback` in this branch is an inline named section rendered directly by SessionShell. It has no opener, close action, variant, portal, `aria-modal` or dialog role. The original dirty checkout's alternate UI was never transferred. Therefore the older plan's modal steps do not apply: no focus trap, Escape dismissal, scroll lock, inert background or initial-focus side effect was introduced. Changing modality would require explicit product approval. Actual inline Tab/Shift+Tab/Escape and async draft/focus behavior are covered instead. This is a documented contract decision, not a modal accessibility pass.

Reused adopted native classes in existing CSS owners; no unused `primitives.css`, generic Button/Input library, parallel frontend, dependency or production showcase route. Primary/secondary/tinted action, plain icon ThemeControl, destructive recording actions, field states, solid feedback/forms/tables and status badges use existing semantic tokens. No production glass-button consumer exists to migrate; GlassSurface/preferences keep their Phase 1 contract and are verified in the fixture. Shell, all route-specific editors and full route migration stay for later approved phases.

## Implementation

- `workspace.css`: existing shared buttons, explicit transitions, disabled presentation, wrapped labels, native scoped fields/placeholder/error/readonly, radio/checkbox focus and solid admin table base.
- `globals.css`: token radii/actions, tinted secondary action, solid inline feedback with unclipped focus and responsive long headings/dimensions; semantic destructive text/fill, status badge radius.
- `learning.css`: existing writing/speaking textarea radius and vertical resizing.
- `auth.module.css`: scoped token radii, accessible focus and field states; wrapped submit label. Auth validation, requests, redirect, password manager/paste and callbacks unchanged.
- `evaluation-feedback.tsx`: busy semantics on existing disabled retry/deletion buttons and destructive presentation class only. Props and callback behavior unchanged.
- Existing feedback unit test and isolated core browser fixture/config/spec: regression coverage; no API implementation or credentials.

## Verification during implementation

- RED: missing `aria-busy` on pending retry/deletion action; after correcting test cleanup and exact existing translated labels,1 failure/5 passes was observed before production changes. GREEN:6 files/35 targeted tests passed (feedback, SessionShell, auth).
- Characterization: inline processing→evaluated transition retains the same draft node/value/focus; no dialog/Escape dismissal. Pending disabled actions do not invoke callbacks; deletion uses the existing ID and preserves status/errors.
- First browser run:6 fixture hydration errors/5 passes. Root cause was missing UTF-8 declaration in the new Vietnamese fixture HTML, not product code. Adding charset fixed it;11/11 checks passed.
- Chromium light/dark at390×844,768×1024,1440×900: native controls/status/composite contrast, no overflow or console/page errors. Actual Next Login validates without a network submission and retains values. Fixture feedback simulates service outcomes, not real API evaluation.
- Vietnamese390px with200% CSS zoom: focused field, select, checkbox label group, submit, destructive and theme controls fit viewport bounds after explicit centered scrolling; no horizontal overflow. Final checks include outline width/offset, clipping ancestors and center hit-test occlusion. This does not certify automatic native focus scrolling.
- System dark, reduced motion/transparency; readonly/disabled native fields, checked radios, form validation and inline keyboard exit/retry/deletion pass.
- Web lint/typecheck and i18n check pass;27 namespaces/1665 paired keys/0 errors.340 candidate unused keys remain informational.

## Final gate

| Check | Command / method | Result | Evidence |
| --- | --- | --- | --- |
| Full web suite, post-review | `pnpm --filter @worklingo/web test` |84 files/383 tests,64.52s, exit0 | [summary](evidence/phase2/final-qa.json) |
| Targeted task completion | `pnpm --filter @worklingo/web exec vitest run src/features/learning-session/evaluation-feedback.test.tsx src/features/learning-session/session-shell.test.tsx src/features/auth` |6 files/35 tests,5.23s, exit0 | task2 ledger and summary |
| Web lint | `pnpm --filter @worklingo/web lint` |Pass, exit0 | summary |
| Typecheck | `pnpm --filter @worklingo/web typecheck`; final build TypeScript stage |Both pass | summary |
| i18n | `pnpm i18n:check` |0 errors;1665 paired keys | summary |
| Production build | `pnpm --filter @worklingo/web build` |Pass after hover fix;34 page routes retained | summary |
| Foundation regression | `pnpm --filter @worklingo/web exec playwright test --config playwright.foundation.config.ts` |16/16 pass,30.2s | [fresh measurements](evidence/phase2/foundation-regression.json) |
| Core browser, post-review | `pnpm --filter @worklingo/web exec playwright test --config playwright.core.config.ts` |12/12 pass,17.7s | [development matrix](evidence/phase2/development-matrix.json),9 PNGs in this folder |
| Optimized Next smoke | `WORKLINGO_FOUNDATION_PRODUCTION=true pnpm --filter @worklingo/web exec playwright test --config playwright.core.config.ts --grep actual` |2/2 Login light/dark pass,6s | [production observations](evidence/phase2/production-smoke.json) |
| Mutation | Invert new retry aria-busy expression, run feedback tests, restore exact bytes |1 failure/5 passes catches mutation; final suite green | recorded below |
| Format/diff | `pnpm format:check` and explicit staged `git diff --cached --check` |Pass; CRLF notices informational | final Git review |
| Preservation | `node docs/ui-redesign/evidence/verify-phase1.cjs <external-origin-snapshot>` |Main/status/1295 hashes/backend/dependencies unchanged | [preservation](evidence/phase2/preservation.json) |

72 rendered text samples minimum **4.87497:1**;12 input-boundary samples minimum **3.67177:1**;6 screenshot-pixel glass samples minimum **15.62645:1**. These are the measured cases, not universal route/state certification.9 PNGs:6 core theme/size combinations,1 Vietnamese zoom and2 production Login. Direct visual inspection covered core light390 after heading reflow and dark390 before that small reflow refinement; all final captures are tested, not all manually inspected. Native fields/feedback use actual production classes/components in isolated fixtures. Login uses real Next CSS/modules; no real credentials or authentication request were submitted.

Fresh foundation run wrote its normal generated artifacts; its JSON was saved separately above, then only the10 known historical generated Phase1 files were restored to their exact committed bytes using `git show`. Phase1 evidence/commits remain unchanged. The original repository was never restored, reset or rewritten.

## Independent review and fix pass

One fresh read-only reviewer found no Critical or callback/state/security/performance blocker. Three initially Minor observations were regraded required for acceptance: the hover removal regressed four adopted controls; initial zoom evidence omitted outlines; the fixture completion timer could conceal a focus steal. No new reviewer or repeated broad audit was used.

- Hover: new browser assertion failed (`filter:none`, expected enabled feedback), then scoped enabled hover restored for continue/retry/recording-stop/toggle-panel; disabled controls stay unchanged. Final browser12/12 and whole suite383/383 pass.
- Async evidence: fixture now waits for an explicit test-only completion signal. The test establishes processing and focused draft first, then releases completion and checks retained focus without refocusing. Existing product state/callback code is unchanged.
- Focus evidence: adding outline/group assertions exposed the test's scrolling of only a small checkbox, leaving its long labelled group's indicator off-screen. Scroll the actual focus owner before measuring; keep strict outline/ancestor/occlusion assertions. The focused scenario and final suite pass. The result is explicitly limited to geometry **after scrolling**, not automatic focus scrolling.

No unresolved Critical/Important findings and no deferred review minor after this pass. Review did not independently rerun gates; parent execution supplies results above. Skill mutation experiment inverted `aria-busy={isRetrying}` to its negation, observed1 failure/5 passes, restored exact source bytes before final verification.

Review rulings: inline modality remains (cost: no overlay certification); parent validates Phase1 preservation (no independent preservation attestation); shell/routes/unrelated CSS and real-service transport/hardware/backend policies stay unmodified (later journey QA needed); cross-engine/native zoom/screen-reader/performance remain unmeasured; parent owns executed gates and final generated-type check (no second independent execution); merge/publication/Phase3+ require explicit approval. Final build restored Next's generated type file naturally; no generated change was committed.

## Commits and changed files

- `41825150e3ff17bf36508fa85a6e57fc7482ea3f` — production presentation + feedback unit coverage,6 existing files named above.
- `12de4a484c3cdd4057145bb8d4842934fb54cc82` — `apps/web/playwright.core.config.ts`, `apps/web/e2e/liquid-glass-core.spec.ts`, three `e2e/fixtures/liquid-glass-core*.tsx` files.
- Documentation/evidence commit follows (`docs(ui): record phase two acceptance and QA`); resolve self-hash with `git log -1 -- docs/ui-redesign/phase2-qa.md`. It contains the plan/progress/design-system/QA updates and Phase2 evidence only. [Machine summary](evidence/phase2/final-qa.json) enumerates all11 source/test files.

## SKILL AUDIT

Used: ui-ux-pro-max → focused inline status/focus guidance and native-control review; codex-quota-optimizer → reuse discovery/Phase1 evidence, focused gates and one reviewer; using-superpowers/executing-plans → task brief/ledger/rulings; Git workflow/worktrees → existing branch isolation, preservation and explicit atomic staging; TDD/systematic-debugging → busy RED→GREEN, fixture charset/root cause and hover regression; React best practices → preserve derived state and existing boundaries; web-design-guidelines → scoped labels/focus/native-control check against [fresh guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); requesting/receiving-code-review and code-review-and-quality → one bounded review and mutation; verification-before-completion/finishing-a-development-branch → fresh gates and keep branch as explicitly selected.

Not used: new brainstorming/writing-plans/design-system generation (existing approved plan/direction reused); subagent implementers/parallel explorer audits (unnecessary duplication); mandate-steward (no register/proposal lifecycle change); backend/IELTS skills (outside approved scope). No skill installed, no new model override or quota telemetry call.

## Limits and readiness

0/34 fully redesigned routes. No backend/API/auth policy/business/data changes. No cross-engine, real-service IELTS, screen-reader or performance pass claimed. Original dirty checkout's existing `pIndent` lint and EOF-format findings remain outside this worktree's changes. Phase 3 requires a new explicit approval; merge requires its own approval and safe dirty-main integration.
