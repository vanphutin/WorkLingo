# Phase 3 final responsive remediation

2026-10-20, Asia/Saigon. Scope:remove the Phase3 shell contribution to Settings overflow; preserve feature source and behavior. Baseline429a8d0, Phase3 before fix02d27b0, candidate on the same isolated branch. This evidence supersedes the earlier acceptance limitation about the additional32px; it does not claim complete Settings reflow.

## Equivalent measurements and cause

Both committed snapshots and the candidate use the same installed Chromium, Windows system font, devicePixelRatio1, VI cookie/account fixture, real `/settings` route, viewport390×844 and root CSS `zoom:2`. Baseline and pre-fix snapshots run Next webpack development from read-only `git archive` extraction in ignored scratch. The candidate is measured in webpack development and optimized production. No original checkout, secrets, backend data or dirty UI is copied. Viewport client width, locale, computed font stack and devicePixelRatio are checked against the baseline before comparing reach. Measurements are taken before screenshots.

The unchanged Settings source is a grid with an implicit auto column. Its descendant card grid (`auto 1fr auto`) and native locale select (`width:9.25rem`,148 CSS px) contribute intrinsic width. At CSS200%, the Settings track resolves to265.906 CSS px =531.8125 viewport-coordinate px in both snapshots. Its automatic minimum does not shrink to the available content box. Shell `minmax(0,1fr)`, content/main min-width0 and border-box are already present; a new min-width is not the32px cause.

| Measurement,390px/CSS200% | Phase2 baseline | Phase3 before fix | Remediated |
| --- | ---: | ---: | ---: |
| Shell inline padding (CSS px) |0 |16 |16 |
| Inner main inline padding (CSS px) |16 |16 |0 |
| Main left (viewport px) |0 |32 |32 |
| Settings grid left (viewport px) |32 |64 |32 |
| Settings grid width (viewport px) |531.8125 |531.8125 |531.8125 |
| Settings grid right (viewport px) |563.8125 |595.8125 |563.8125 |
| Root scrollWidth / clientWidth |564/390 |596/390 |564/390 |

The difference is **the added16 CSS px left inset × CSS zoom2 =32 viewport px**. It is not a sum of both side paddings or newly expanded Settings content. Root `scrollWidth` rounds the rightmost reach to an integer.

One-variable experiments on the pre-fix snapshot:

- Remove shell inline insets:596→564, but also removes navigation safe-area spacing; rejected as the product fix.
- Remove the inner main inline padding:596→564, preserves outer safe-area; adopted only for the one-column shell at≤999px.
- Force only the feature outer grid to `minmax(0,1fr)`:596→522; descendant card/select constraints still overflow. Diagnostic injection only, not committed feature CSS. This separates the existing feature defect from the Phase3 contribution.

Production fix:three lines in `workspace.css` reuse the existing direct learner-main/evidence-workspace owner to set `padding-inline:0` inside the one-column media query. Vertical padding and desktop layout remain owned as before. No `overflow-x:hidden`, clipping workaround, Settings selector, feature source, navigation/auth/player logic or API change.

## Narrow widths, focus and safe area

At320/360/390px, baseline and remediated reach are564px at CSS200%; all fit their viewport at CSS100%. At768px both CSS100/200 fit768px. These are eight comparable conditions, not a claim that narrow feature content fits at200%.

Native Tab, without `scrollIntoView`, reaches all five long VI menu labels at320/390px CSS200%; horizontal outline bounds, vertical bounds, center hit-testing, Escape return focus and link count are checked. Actual long Vietnamese identity remains in the supplied fixture. Existing full shell regression additionally covers13 admin destinations, active links, route/history/resize focus, VI/EN, Light/Dark/System, reduced material/motion, forced colors and actual IELTS Mock answer/timer/autosave continuity.

Chromium CDP emulates safe-area left24/right20/bottom28 CSS px. At CSS200%, grid/header/navigation start at48px; header/nav end at350px; shell bottom padding is28 CSS px. The pre-fix content began80px instead of48px. This tests CSS environment insets, not physical iPhone hardware or native browser zoom.

## TDD, gates and limitations

Before fix:new reflow test fails596>564; safe-area test fails80≠48; native Tab test passes. After fix:3/3 pass in development and3/3 optimized production. The observed RED is also the missing-padding-rule mutation counterexample; no unrelated source or test expectation was changed to make it pass. Targeted units45/45, build/lint/typecheck pass; final full web suite85 files/402 tests passes. The initial run had401 passing/1 failing Focus Mode unit case; isolated14/14 and final402/402 passed without TSX/test changes. Exact test name and both logs are retained in `phase3-qa.md`; the initial failure is not erased or claimed to be a confirmed CSS regression. Optimized existing shell regression13/13 passes with3 baseline-capture-only tests intentionally skipped.

The old Phase3 evidence remains immutable. Existing shell tests accept an optional evidence directory so this rerun writes into ignored scratch; its JSON/log is copied here separately. This avoids relabelling old before/after screenshots as remediation pixels.

Native PNGs:[baseline](baseline-390-css200.png), [Phase3 before fix](phase3-before-fix-390-css200.png), [remediated development](candidate-390-css200.png), [remediated production](candidate-production-390-css200.png). Images intentionally retain the residual overflow. Detailed rectangles/computed grid/padding are in [baseline.json](baseline.json), [pre-fix experiments](phase3-before-fix.json), [candidate.json](candidate.json), [optimized candidate](candidate-production.json). The whole-page Settings defect is tracked as **P4-SETTINGS-REFLOW-001** in the existing Phase3 QA/route coverage, with acceptance criteria, rather than implementing Phase4 now.

## Reproduce

PowerShell:from the isolated worktree, set `$env:WORKLINGO_REFLOW_REF='429a8d0'`, run `pnpm --filter @worklingo/web exec playwright test --config playwright.shell-reflow.config.ts`, then repeat with ref`02d27b0`. Remove that env var and run the same command for the candidate. For optimized verification, build first and set `$env:WORKLINGO_FOUNDATION_PRODUCTION='true'`. Clear task env vars afterwards. Snapshot servers share33300 and must run sequentially. Baseline measurements are platform/font-specific; regenerate both committed snapshot captures together when changing browser/platform/fonts. Never substitute dirty original source for a named snapshot.

SKILL AUDIT:systematic-debugging →equivalent snapshots and one-variable probes; ui-ux-pro-max →reflow/long-label guidance; TDD →2 RED/1 PASS to3 GREEN; quota optimizer →existing runtime/fixtures and scoped reads; Git/worktrees →original preservation and explicit own-file commit; code-review-and-quality →tests-first/five-axis diff review and removal-rule RED counterexample; verification-before-completion →fresh gates and hashes. No feature redesign, new framework, extra agents, backend or publication.
