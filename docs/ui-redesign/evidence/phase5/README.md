# Phase5 evidence

Acceptance and findings live only in [phase5-qa.md](../../phase5-qa.md); canonical route statuses in [03-route-coverage.md](../../03-route-coverage.md#phase5-audit-matrix).

- before-complete/: complete340-cell baseline at cfd7e27, real landmark failures. before-hierarchy/: one full34-route heading RED plus caption probe.
- before-checks/: real blur/motion/border/caption RED; caption name assertion also had a harness error. before-visual/: equivalent before PNGs, loading spinner RED. before-performance/: repeated pre-change measurement.
- before/: initial incomplete audit with wrong onboarding selector; **invalid/incomplete harness run**, not counted as34-route coverage.
- after/:340 GREEN cells, initial checks/screenshots and repeated performance. **Its corner contrast/local programmatic-focus/preference-isolation claims are superseded**; retain as honest run history.
- review-fixes/: final13 GREEN checks. Only its text-position/alpha contrast, native keyboard reachability and independently reset preference fallbacks support final acceptance. Negative gradient control rejects the old favorable-corner method.
- regression/: fresh105 optimized Chromium cases and actual screenshots, isolated from historical Phase4 captures.
- shell/: four targeted fresh shell/navigation/exam/skip-link guards.
- logs/: normalized terminal logs, including RED/harness mistakes, gates and original-source preservation. Expected fixture error logs and inherited jsdom navigation warning are not hidden.
- contact-*.png: visual inspection sheets from real fresh captures. comparison-*.png: equivalent cropped before/after real UI, no generated mockup. Original PNGs retained.
- summary.json / css-before.json / css-after.json: bounded measurements; CSS counts are not defects.
- manifest.json: raw on-disk SHA256 and provenance; excludes itself to avoid circular hashing. Historical396 capture/result hashes reverified. sourceCommit identifies final code/test state; later commit contains docs/evidence only.

Reproduce in isolated worktree with production build:

```powershell
$env:WORKLINGO_FOUNDATION_PRODUCTION='true'
$env:WORKLINGO_PHASE5_RUN='local-repeat'
pnpm --filter @worklingo/web exec playwright test -c playwright.phase5.config.ts
$env:WORKLINGO_PHASE4_RUN='local-repeat'
$env:WORKLINGO_PHASE4_EVIDENCE_ROOT='../../../docs/ui-redesign/evidence/phase5/local-regression'
pnpm --filter @worklingo/web exec playwright test -c playwright.phase4.config.ts
```

Full Phase5 has24 defined cases; final acceptance combines unchanged matrix/performance evidence with corrected13-case run. Run names must be distinct to retain evidence. Do not redirect a new run into historical phase4/final-run. Test sources own fixture API interception; no real credentials/provider traffic. Native zoom/screenreader/live backend/Firefox/WebKit/hardware/GPU certification remains outside this evidence.
