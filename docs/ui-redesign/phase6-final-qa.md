# Phase6 final regression and release QA

2026-10-20. **Technical QA complete within stated scope. YELLOW — conditional readiness; no merge approval.** Entry b9ae26ccb1dcfe6817ad451e33943529de11270f was clean. Worktree D:/Projects/WorkLingo-Liquid-Glass; branch codex/worklingo-liquid-glass-redesign. Main/original committed baseline7a5e383763ccd63c4befa4ab07a5559ba7cabfbe. Final product600cd1f; final test harness69654e4. Subsequent commits contain documentation/evidence only unless explicitly stated. Final clean/hash verification is reported after the enclosing commit.

## A. Phase5 acceptance

**ACCEPTED WITH LIMITATIONS.** At entry verified117 source/529 evidence hashes,34-route inventory,340 loaded audit cells, corrected text-position/foreground-alpha contrast, Settings reflow, review resolutions, history and1295 original file hashes/status/main. Historical404 web/133 browser cases are Phase5 results, not new executions. Old corner9.0532 contrast is superseded. Final boundary checker verifies529 historical artifacts; two intentional Phase6 fixes supersede the old source hash set.

## B. Risk-based execution

| Priority | Actual checks | Limit |
| --- | --- | --- |
| P0 auth | Real register/self-placement/guards/redirects, learner/admin sessions and locale persistence; fixture expiry/denial | No auth changes; no claim of every auth configuration. |
| P0 learning | Real foundation desktop/mobile checkpoint/progress, teacher-AI speaking/writing/retry/draft, adaptive/engagement; owner fixtures theme/locale/resize/reload/identity/submit | Fake media/evaluation; inline EvaluationFeedback remains. |
| P0 IELTS | Real Orientation/Bridge/Integrated/Band/FullMock start/resume/pinned versions/publication isolation; fixture deep answer/timer/expiry/autosave/submit/results/ownership | Full live timed expiry/commercial scoring not qualified. Orientation409 preserves server-version reload. |
| P0 admin | Real source/autosave/validate/audio/publish/version isolation; fixtures409, validation/role gates and failures | Disposable data only; no production provider access. |
| P1 | Preferences/navigation/settings/media/onboarding, keyboard, narrowVI/EN, CSS200 and native zoom | Actual hardware/notch unqualified. |
| P2/P3 | Catalog/mastery/audit/operations/analytics/public rendering and query/filter checks |34 owner-route fixtures; cross-engine representative sample only. |

Installed matching managed Firefox155/build1543 and WebKit26.6/build2359 beside Chromium153/build1243; dependencies/lockfile unchanged. Reused existing API/setup/teardown. Real runner uses owner-labelled PostgreSQL17, tmpfs, fresh unique schema, loopback port and random runtime-only credentials. Existing API migrates/seeds disposable data. Cleanup verifies ownership; all completed runs removed their own container. Logs redact generated secrets. Existing fake evaluation/STT/TTS remain; Azure readiness is explicitly an endpoint-stub case. No production data/environment/credentials were used.

## C. Route coverage

| Total | Verified | Blocked | Remaining | Evidence |
| --- | --- | --- | --- | --- |
|34|34 owner fixture-rendered|0 in this scope|0 in this scope|[Per-route mapping](evidence/phase6/README.md), [coverage](03-route-coverage.md)|

This is not34-route live certification or34 routes on every engine. Final cross-engine sample:8 routes ×2 themes ×3 widths ×3 engines =144 loaded cells, plus capability test per engine. Phase5's340-cell/320–1440 semantics audit is historical. Error/not-found boundaries are additional to34 pages.

## D. Quality gates

All paths below are under evidence/phase6/. Sources differ deliberately; no mixed-source single-run total is claimed.

| Gate | Result | Tested source | Evidence | Limits |
| --- | --- | --- | --- | --- |
| Full web |PASS405/405,85 files|600cd1f product|logs/phase6-unit-final.log|Earlier404 run predates new pending-geometry test. |
| Web lint/types |PASS|600cd1f|logs/phase6-lint-final.log;phase6-typecheck-final.log|eslint src / tsc noEmit; backend checks not claimed. |
| i18n/static checker tests |PASS /7 tests|600cd1f|logs/phase6-i18n-final.log;phase6-i18n-tests.log|Not exhaustive translation certification. |
| Production build |PASS|600cd1f|logs/phase6-production-build-fixed.log|Next16.3.8; separate optimized E2E build targets loopback API34106. |
| Whole owner regression |PASS105/105|18e00fd; productaace62c|logs/phase6-owner-regression.log;regression/|Operations subsequently changed;18 affected cases rerun below. Other owners unchanged. |
| Affected owner regression |PASS18/18|3ad9bf2; product600cd1f|logs/phase6-operations-owner-final.log;operations-regression-final/|Settings/audio/AI/audit/operations/analytics, errors/roles/CSS200. |
| Three browser engines |PASS21/21,144 cells|600cd1f|logs/phase6-cross-fixed-final.log;cross-fixed-final/|Firefox dynamic contrast transition BLOCKED; static reload pass. WebKit automation is not physical Safari/iOS. |
| Real optimized integration |PASS30/30|aace62c product; tested harness hashes recorded|live/optimized-final.json and .log|29 backend journeys plus1 Azure endpoint-stub case; fake providers. |
| Final affected real admin |PASS3/3|3ad9bf2; product600cd1f; locale hunk committed69654e4|live/admin-isolated-final.json and .log|New disposable DB; independent English guest context. First isolated failure retained. |
| Actual browser zoom200 |PASS4/4,16 samples|aace62c; target owners unchanged by600cd1f|native-capture-final/;native-zoom/;log|tabs.setZoom/getZoom2; DPR1→2; CSSviewport762→381 or1422→711; CSSzoom1/pinchScale1; temporary profile. |
| Real Next error boundary |PASS4/4|aace62c snapshot; error owner unchanged|error/snapshot.json;error-final/;4 PNG;log|Only ignored snapshot Login leaf injects render throw; product error owner hash identical. VI/EN×Light/Dark, keyboard retry, recovery/private diagnostic. |
| Performance lab |PASS execution; sampled targets met after fix|600cd1f|performance-fixed-final/;summary.json|18 observations/6 routes/3 repeats; loopback/no throttle/synthetic long reading; not field INP/CWV/device certification. |
| Operations shift |PASS2 after RED|600cd1f|operations-fixed-final/;operations-shift/;CLS logs|Original/current/fixed3 repeats; filter movement469.75→0px. |
| Scope/security/preservation |PASS scoped checks and independent review|full7a5e383..69654e4|boundaries.json;preservation log;independent-review.md;manifest|API clients/backend/contracts/dependencies/config unchanged. Secret scan covers tracked environment/private-key material; no exhaustive backend security claim. |
| Whitespace/final hashes/clean status |PASS hashes/whitespace; clean status verified after enclosing commit|final docs/evidence|manifest.json;verify.cjs --require-clean|Read-only final verifier checks1295 originals/status/main,370 source hashes and every sealed artifact. |
| Physical screenreader/media/device/provider |BLOCKED/NOT RUN|N/A|Risk register|Never converted to pass. |

Per-test JSON records timestamp, engine/version, command, source/harness hashes and fixture status. Manifest/run registry distinguishes snapshots and source-equivalent reruns. Snapshot tests explicitly identify actual injected/snapshot source: recorder working-diff SHA describes coordinator state, not snapshot content. pnpm verify omnibus was NOT RUN: latest authorized risk-based scope uses required frontend gates and explicit isolated E2E; unrelated monorepo/backend/tooling suites would duplicate/outgrow this scope. No omnibus-green claim.

## E. Findings and remediation

| Issue | Severity | Root cause | Fix | Regression evidence | Status |
| --- | --- | --- | --- | --- | --- |
| P6-A11Y-01 duplicate Content imports regions |Important|Phase4 scroll region nested inside same-named section|Remove redundant outer label, retain named keyboard-scrollable table|Unit RED1/3→GREEN3/3; real admin and owner flows|FIXED3874631; typed matcher inaace62c|
| P6-PERF-01 Operations insertion shift |Important|New shell exposes filters; late four-card summary pushes them469.75px|Reserve real card geometry, pending em dash/aria-busy, unchanged data handlers|Unit RED4/5→GREEN5/5; originalCLS0.02348/preFix0.15543/fixed0.01896 each3 samples; geometry RED469.75→GREEN0px;18 affected/cross/live3|FIXED600cd1f|
| Foundation enum expectation |Test mismatch|Phase4 intentionally localized Foundation1 display|Visible-label assertion plus stronger actual progress enumFOUNDATION_1|Initial desktop/mobile failures; final real both pass|Test-only18e00fd|
| Azure readiness |Pre-existing test mismatch|Selected Active Engine vs unselected Configured and available, unchanged since baseline|Check selected→simulation→availableAzure→activeAzure and exact save payload|Retained initial failure; final stub pass|Test-only18e00fd|
| Standalone admin locale/title |Test isolation/pre-existing limitation|newContext omits project guest locale; prior tests happened to set seeded admin English|Explicit English guest cookie, retain title assertion; no product change|First isolated2/3 failed on Vietnamese title; corrective3/3|Test-only69654e4; in-place title update remains outside redesign scope|
| Firefox contrast transition |Verification gap|EmulateMedia updates query but existing CSS does not restyle even plain color-only control|No product workaround; verify static reload and manual transparency; dynamic BLOCKED|Standalone controlled variants and failed cross logs retained|OPEN qualification gap|
| Blank storage/alert selector/resize race |Harness defects|about:blank origin, Next route announcer's second alert, pending breakpoint event|Origin guard, alert under main, two render frames after resize|Initial failures and corrected21/4 cases|RESOLVED test-only|
| RTL exact option |Test type error|Playwright option used with RTL query|Anchored name regex|Failure retained; targeted/types green|RESOLVEDaace62c|
| Native screenshot clipping |Capture limitation|Playwright fullPage CSS-width clipping under actual zoom|CDP visible device-surface capture, no resize|4 reruns/16 correct PNG|RESOLVED capture-only|
| Production navigation stream warnings |Minor/verification gap|Next destination-stream-closed-early diagnostics observed; origin unproven|Retain logs; no speculative framework/backend fix|Real30/admin3 pass; no demonstrated data-loss/browser failure|OPEN target-environment triage|

No failing log was deleted to turn a gate green. No auth/business/timer/scoring/publication rule was patched. Source boundary checks alone do not prove complete semantic preservation; independent full-diff review is required.

## Accessibility, visual and performance

Fresh owner105 checks sample3144 loaded opaque text colors, min4.87497:1. Preserved Phase5 composite text samples:30 surfaces/96 positions min5.52287:1;28 control boundaries min3.29050:1. Phase6 changes no palette/CSS/typography; glass/control results are bounded historical reuse, not fresh exhaustive contrast. Native Tab/focus, scroll regions, Escape/disclosure return, reduced motion/transparency, storage exceptions, forced-color usable controls and reflow are sampled, not WCAG certification.

Final lab18: LCP144–420ms; observedCLS0–0.01896; EventTiming interaction maxima16–56ms; frame median~16.7/max~16.8ms. These maxima are not field INP. Reading text repeated80x. Static asset inventory:51 JS chunks1,933,774 raw/566,691 gzip bytes;24 CSS195,820 raw/43,895 gzip bytes. Sum of all chunks is not per-route payload. No equivalent full pre-redesign LCP/INP/bundle baseline; only OperationsCLS has controlled original comparison. See per-route three measurements in evidence README/summary.

Actual Operations pending/loaded screenshots before/after,16 native zoom captures,4 error screens and owner galleries support visual review. Loaded Operations appearance is retained; pending geometry now matches. No overflow clipping workaround. Physical notch/safe-area, microphone/speaker, Safari/iOS, NVDA/VoiceOver and target-device CWV remain unqualified.

## F–H. Review, Git, readiness and remaining risks

One independent review of full original7a5e383..69654e4 found no Critical/Important product regression. [Review evidence](evidence/phase6/independent-review.md) records one Minor/verification warning, qualification gaps and dirty-source integration gate; all remain explicitly disclosed. Reviewer checked207 current production and529 historical artifact hashes; parent checks original preservation. Original52 dirty paths are all in [merge plan](merge-plan.md):41 overlap redesign,30 add/add candidates. Main is ancestor; committed ancestry is not safe dirty-checkout merge evidence. Repeated1295-file/status/main preservation passes. No original file copied/staged/committed/mutated, no merge/push/deploy/reset/stash/cleanup, no backend/schema change.

**YELLOW** until dirty-source reconciliation and documented qualification risks are resolved or explicitly accepted by human. Full live timed expiry/scoring/commercial providers, physical media/device/Safari/assistive-tech and field performance remain separate gates. Existing locale metadata and stream warnings are disclosed, not silently repaired. [Release readiness](release-readiness.md) states conditions; [merge plan](merge-plan.md) defines human-owned preservation, new isolated candidate validation and non-destructive rollback. Approval for merge never includes push/deploy. Keep branch/worktree/history; stop after final commits.

## I. Skill audit

Used: executing-plans for existing Task6/ledger; codex-quota-optimizer for reuse and targeted reruns; ui-ux-pro-max for interface/reflow/visual checks; Git/worktree workflows for isolation/explicit staging; systematic-debugging and test-driven-development for reproduced landmark/CLS fixes; React/accessibility guidance for state, semantics and preference checks; requesting-code-review/code-review-and-quality for one full-range independent review; verification-before-completion for final gates; mandate-steward for pre-release governance; finishing-a-development-branch for preserve-and-stop handoff. Dynamic registry/invocation restrictions respected. No unrelated implementation, architecture or new design workflow invoked. User's keep-branch/no-merge instruction overrides finishing menu/cleanup and historical workspace deletion.

Verification: actual logs/JSON, hashes and review above. Not used: parallel implementation agents, new framework, Sites/Figma or image generation because existing source/fixtures and actual browser captures suffice. Hardware/screenreader gaps were reported rather than inferred from automation.
