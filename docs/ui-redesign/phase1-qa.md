# Phase 1 QA — Design Foundation

Started: 2026-10-19; final verification continued 2026-10-20, Asia/Saigon. Worktree: `D:/Projects/WorkLingo-Liquid-Glass`; branch `codex/worklingo-liquid-glass-redesign`; baseline `7a5e383763ccd63c4befa4ab07a5559ba7cabfbe`.

## Scope and isolation

Only Phase 1 is approved. Existing source from HEAD is the implementation baseline; no uncommitted user UI was transferred or staged. The five foundation owners matched the original checkout. [Isolation evidence](evidence/phase1-isolation.json) proves the original main/status and1,295 files were preserved before edits; final comparison is recorded at handoff.

Original dirty checkout: 369 tests passed, one unused `pIndent` lint error and an EOF whitespace issue. Isolated HEAD: **81 files /366 tests passed and lint passed**. Those source differences explain the counts. The original errors were not fixed, hidden or committed here.

## Test-first record

- Theme initialization: new stored reduction and independent blocked-theme read failed before implementation (missing attribute); malformed preference cases already passed. Implementation then passed.
- Transparency/GlassSurface tests initially had missing modules; minimal null interfaces were added so a second RED run produced **8 behavior assertion failures /4 passes**, not transform errors. The real implementation then passed **15 tests in4 focused files**, including3 existing theme tests.
- Browser RED confirmed original teal `rgb(17,103,95)` instead of semantic blue. A fixture SSR issue was traced to Playwright's synthetic JSX transform; fixture SSR/client are now compiled by the existing React/esbuild toolchain, with no production workaround.
- Opacity-token behavior had an additional RED→GREEN test: root opacity now changes the material background while preserving text/solid opacity.
- Mutation check: inverting the storage-value condition caused the cross-tab preference test to fail (1 failed/3 passed). Original bytes restored before final unit/browser verification.
- Independent review found a real synchronization bug outside Settings. A production browser test reproduced RED: a Login tab retained the reduction attribute after the Settings tab cleared it. Root-mounted TransparencySync now owns the listener. A separate RED unit test exposed the script-to-hydration storage gap, covered by an initial validated read. Final reruns below validate the fixes.
- Production auth smoke initially expected white/black primary fields, but the existing auth CSS intentionally uses the secondary/grouped `--background` token. The test expectation was corrected after inspecting that owner; foreground and control-border contrast are still measured. No auth stylesheet or policy was changed to satisfy the test.
- Review also identified evidence overwriting by filtered smoke runs. Development contrast measurements and production smoke observations now use separate JSON artifacts; an unmeasured development selection writes a separate smoke file. This is a required evidence-integrity correction, not a relaxation of product tests.

## Browser checks completed

Command: `pnpm --filter @worklingo/web exec playwright test --config playwright.foundation.config.ts`.

**16/16 Chromium checks passed** after the review fix (40.4s on the final development run):

- Light/dark ×390×844,768×1024,1440×900; no horizontal overflow, pageerror or console error in the six fixture captures.
- Regular20px, clear6px, tinted28px blur, solid/nested fallbacks; no-JS system dark and all computed tokens equal between manual/system dark.
- Keyboard Space toggles reduction with visible focus; same-tab controls/cross-tab changes/clear and reload persist as appropriate. Draft survives preference, theme and viewport changes.
- Blocked get/set/remove storage remains usable; 200% **CSS zoom** reflows. Native browser zoom and manual screen-reader certification are not claimed.
- False `@supports` condition exercises opaque baseline in a browser that otherwise supports blur; this is not a test on a truly unsupported engine. Chromium media emulation verifies increased contrast/forced colors; CDP verifies OS reduced-transparency query and solid result.
- Actual Next `/settings` route preserves existing guard/links and persists reduction after reload at390px. An additional Login tab has no checkbox mounted and correctly receives changes/clears from Settings. `/api/v1/me` uses a contract-shaped network fixture (`COMPLETE` learner); no real login/user/database mutation or altered auth policy.
- Actual Login light/dark uses its existing grouped-background input contract; text and input boundary contrast are checked rather than changing the auth stylesheet. A focused production rerun validates the final optimized build separately.
- 80 semantic color pairs meet≥4.5 normal text or≥3 applicable UI boundaries/focus. Minimum measured text4.87497, UI3.29050. 48 screenshot-pixel composite samples (four variants ×black/white backdrops ×six captures) show primary-label contrast≥8.24947. These are actual rendered background samples, not a raw hex-only glass calculation.

Evidence: [browser-results.json](evidence/phase1/browser-results.json), six `foundation-{light|dark}-{390|768|1440}.png` screenshots, `settings-390.png`, two `auth-{light|dark}-390.png`. Direct image inspection: foundation dark390 and settings390. Other PNGs were captured/tested, not all manually inspected. Production smoke writes `production-browser-results.json` separately. Development screenshots include the Next dev indicator; actual-route screenshots are refreshed by production smoke.

## Final gates

Final post-review gates, verified2026-10-20:

| Command / scope | Result |
| --- | --- |
| `pnpm --filter @worklingo/web test` |84 files /380 tests passed,71.15s, exit0 |
| `pnpm --filter @worklingo/web lint` |Pass, no diagnostics, exit0 |
| `pnpm --filter @worklingo/web typecheck` |Pass after final build, exit0 |
| `pnpm i18n:check` |27 namespaces,1665 paired keys,0 errors;340 candidate unused keys are informational |
| `pnpm --filter @worklingo/web build` |Final production compilation and TypeScript stage pass,34 existing page routes preserved |
| Foundation Chromium suite |16/16 passed,40.4s; final root-sync behavior included |
| Production-only `--grep actual` with `WORKLINGO_FOUNDATION_PRODUCTION=true` |3/3 passed,6.3s; settings cross-tab + auth light/dark, optimized CSS order |
| `git diff --check` / explicit staged check |Pass for task changes; CRLF notices are not errors |
| Mandate validation |Valid=true,2 unchanged branch records; root proposal preserved as historical evidence |
| Final isolation verification |Original main/HEAD/status and1,295 files unchanged; backend/contracts/dependencies unchanged |

[final-qa.json](evidence/phase1/final-qa.json) records the code commit, executed checks, source file list and measured minima. [Preservation evidence](evidence/phase1-preservation.json) records the final original-checkout comparison. No monorepo/real API E2E result is implied. Source commit: `0ef6204a8fbf76e7b00d30ec93113c3552320935`.

Independent five-axis review found no Critical issue. The Important listener-lifetime defect was reproduced, fixed and covered as described above; post-fix whole-suite and16 browser checks pass. No second reviewer was dispatched: the fix is verified by RED→GREEN and final regression checks. Remaining review minor is disclosed below. This is technical readiness for Phase 1 acceptance, not merge/release approval.

## Limits and remaining scope

Firefox/WebKit are not installed and were not run; full backend/IELTS E2E, Web Vitals and all legacy route composite/focus checks are outside the completed foundation checks. Feature CSS still has existing literals, overriding selectors and radius/motion/z values. No route is marked migrated merely because aliases changed its palette. Phase 2 core controls/overlay accessibility and all later phases need separate authorization after Phase 1 acceptance.

Deferred review minor: the combination **390px + Vietnamese labels + 200% zoom + focused-control viewport bounds** is not covered; the current zoom test is English at desktop width, while the new Vietnamese label/help is component-tested. Do not infer full mobile zoom accessibility from `toBeVisible`. Complete that combined scenario before the corresponding later UI is accepted.

Interruption record: the first post-review full rerun was interrupted by the user. Browser workers exited at the interruption (5 passed,2 failed by worker exit,9 unrun); the parallel unit run had no completion line. Neither is counted as a passing final gate. Rerun only those incomplete checks and the production build affected by the root-sync source change.

No merge approval, push or deploy is inferred. The original dirty main must be preserved during any future approved integration; no stash/reset/overwrite to force it.
