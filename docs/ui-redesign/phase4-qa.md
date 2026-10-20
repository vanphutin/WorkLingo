# Phase 4 QA — route migration

Status: IN PROGRESS. Approval: human master attachment e5a41d65-254b-4b8e-9246-71c3e78f82f2. Baseline2d9ba797f92daf2583210c66ab2141769dcfd95b; dedicated branch/worktree retained. No merge/push/deploy or Phase5/6 approval.

## Phase 3 technical acceptance

ACCEPTED WITH LIMITATIONS. Actual history includes307829b,80177eb,02d27b0 and remediation2d9ba79. Equivalent390px/VI/CSS200 measurements confirm baseline564px, Phase3 regression596px, remediation564px. The32px shell regression is fixed; feature issue P4-SETTINGS-REFLOW-001 transfers to Slice7. Existing evidence:402 web tests,45 targeted,13 production shell and3 production remediation browser checks, lint/types/build pass. These results are reused historical evidence, not fresh Phase4 runs.

Fresh entry checks: isolated branch/path/HEAD clean, main7a5e383 unchanged, no unmerged entries. Original checkout preservation utility confirms1,295 hashes and Git status unchanged. No dirty source was transferred. Limits: Chromium fixtures do not certify live auth/media/API, Firefox/WebKit, native browser zoom, screen readers or performance. The historical concurrent Focus Mode unit failure remains an intermittent finding to investigate if reproduced; its cause is not claimed established.

## Slice checkpoints

| Slice | Routes | Status | Evidence / commit |
| --- | ---: | --- | --- |
| 1 Public/Auth + boundaries | 3 | Verified (Chromium fixtures) | 7a37bed; [evidence](evidence/phase4/slice-1/README.md) |
| 2 Dashboard/Programs/Mastery | 3 | Verified (Chromium fixtures) | 0dbb076; [evidence](evidence/phase4/slice-2/README.md) |
| 3 Onboarding/Learning/Media | 3 | Verified (Chromium fixtures) | c3166b0; [evidence](evidence/phase4/slice-3/README.md) |
| 4 IELTS orientation/bridge | 3 | Verified (Chromium fixtures) | bb9a63b + touch follow-up; [evidence](evidence/phase4/slice-4/README.md) |
| 5 IELTS integrated/pathway/mock | 5 | Verified (Chromium fixtures) | 41d05ba; [evidence](evidence/phase4/slice-5/README.md) |
| 6 Admin authoring | 9 | Discovered | Pending |
| 7 Operations/settings | 8 | Discovered | Pending |

Coverage now:34 total,17 implemented,17 verified,0 blocked,17 remaining. Error/not-found boundaries are additional owners, not routes.

## Slice 1 — Public/Auth

Code commit7a37bed (`feat(ui): redesign public landing and authentication pages`). Actual owners: HomePage +extracted landing.css; login/register introduction wrappers; AuthPage preference group +existing auth.module.css; error/not-found +their shared CSS module; primary heading test; isolated Phase4 browser config/spec/snapshot runner. All original auth effects, submit/validation/state, locale synchronization and redirect decisions retained. No domain/backend/dependency changes. Original dirty landing animation/CSS were inspected and left intact; the static workplace example carries its presentation intent without importing independent UI state.

Tests:6 files15 targeted;85 files402 full web tests;10 optimized Chromium checks. Baseline paired capture6 public tests and6 Slice2 baseline tests passed on immutable optimized2d9ba79 snapshot. Three required viewports ×two themes ×four page states (home/login/register/not-found) give24 comparable before/after images each.198 opaque text contrast samples minimum5.5666:1. Twelve320/360/390 CSS200 cases fit the viewport and explicitly reach every expected native control with visible outline and full horizontal/vertical bounds. Auth fixture checks401/409, pending/disabled, existing validation focus, draft retention through locale/theme, real form submit payloads and four learner/onboarding/admin redirects. System-dark/reduced-motion/reduced-transparency/increased-contrast/forced-colors checks pass.

TDD/evidence: baseline reflow RED333px at320; strengthened heading RED1/4 then GREEN; focus-outline mutation rejected; strengthened vertical focus test exposed852.8125px indicator bottom at844px. Owner-scoped scroll margin/padding and skip-link insets fixed it, development GREEN1/1 then optimized10/10. An initial heading assertion omitted the existing word “your”; corrected test and reran exact baseline RED. One concurrent temporary heading probe produced a parse error; exact bytes restored and all final checks use the restored source. An initial auth test used an English-only selector after switching to Vietnamese; corrected the fixture selector. Neither is recorded as a product regression or passing run. Failed/mutation records remain separated from verified records.

Independent review: two verification gaps addressed in one parent fix pass; [review and declined-to-judge rulings](evidence/phase4/slice-1/review.md). Per-test/per-run persistence now retains all24 matrix observations even on partial rerun/worker restart. Lint/typecheck/i18n/build/whitespace pass. Historical Focus Mode intermittent failure did not reproduce in the fresh402-test full run; cause remains unproven, not labelled fixed.

Limits: schema-valid browser transports simulate authentication/data responses. Live auth/API, native browser zoom, screen-reader, Firefox/WebKit and performance remain unmeasured. Error boundary recovery is covered by callback/confidentiality unit tests, not by injecting a live Next runtime exception. Glass composite contrast is inherited Phase1–3 evidence; new content contrast samples are opaque effective-background checks. No Critical/Important finding remains within Slice1.

## Slice 2 — Dashboard/Programs/Mastery

Code0dbb076 (`feat(ui): redesign dashboard programs and mastery workspaces`). DashboardView imports its owner dashboard.css and groups the introduction/shortcuts, prioritizes the existing resume action and separates solid progress/roadmap/evidence regions. ProgramCatalog's owner stylesheet groups availability under titles, wraps status labels, retains active/unavailable actions and uses solid content. MasteryWorkspace adds one GlassSurface around existing section links; mastery.css owns readable evidence/data/filter layouts. All state/handlers/keys/IDs/API calls stay unchanged. Current-level display reuses existing formatLevel: known code localized, unknown authored code retained; source code remains unchanged in API/state. Original dirty Mastery CSS was compared read-only; its independent animation/dark literal overrides were not copied.

Nine files61 targeted tests pass. Baseline narrow RED identified four skill-evidence-card flex items with min-width:auto extending to324.984375px at320/CSS200. Feature-owned min-width:0, zero-minimum grid tracks and wrapping repair it without clipping; nine narrow cases pass. Known-level presentation RED2 assertions then GREEN61. Twelve optimized Chromium checks pass:18 loaded route/appearance/viewport cells, loaded/empty/error/retry/disabled/loading,696 opaque text samples(min4.9886:1), VI/EN, System appearance, reduced motion/transparency and forced colors. Real controls preserve saved-session href, program activation PUT, weekly-target PATCH, skill-filter query, pending checkpoint POST/no advancement, loading resolution and native Tab filter→Practice again→assessment with full outline viewport bounds. The first Tab assertion omitted the existing Practice again link; recorded DOM order established the test mistake and the corrected order passes, with no product change.

Lint/typecheck/i18n/build/whitespace pass; full402-test web suite reused from Slice1, not rerun for each style owner. Fresh full suite planned at Slice3 P0 milestone. Parent self-review of the bounded diff and actual desktop/mobile/Dark screenshots found no Critical/Important. P0 independent review remains planned after Slice3; no duplicate reviewer for this P1 slice.

Schema-valid transport fixtures use existing owner unit data. They do not certify live data, scoring/advancement, real provider/backend, Firefox/WebKit, native browser zoom, screen readers or performance. Loading/error checks are actual rendered component states with delayed/rejected fixture requests. Every route now has actual owner changes plus linked browser/state/interaction evidence; shell/token adoption was not counted. New shared test-only contrast helper is explicit about opaque samples; glass fallback/composite evidence remains inherited from prior phases.

## Slice3 — Onboarding/Learning/Media

Code c3166b0. Actual production owners: SessionShell adds solid grouped session actions and imports session-experience.css; onboarding.css refines real choice/placement presentation. CSS scopes reading/listening/speaking/writing/editor/media/inline feedback/progress/support layouts without changing renderers, IDs, handlers, effects, state or API. Original dirty shell/topup feedback examined read-only and deliberately not copied; inline Phase2 contract retained.

97 targeted tests(18files),403 full web tests(85files),18 optimized Chromium checks(16+2 review), lint/typecheck/i18n/build/whitespace pass.36 paired required viewport/theme states on immutable optimized2d9 versus optimized source;498 effective opaque contrast samples min4.87497:1. Baseline reflow RED418px/320; final8 narrow renderer cases fit. Pending writing save test holds response, keeps latest text and selection[7,14] through theme/resize and verifies revisions0→1. Actual autosave/reload/pause/resume/submit completes fixture session and displays pending inline evaluation. Native audio node keeps playback; native MediaRecorder synthetic source retains one live track across theme/navigation/resize, releases on stop, consent gates upload. Reading answer/placement start/version/checkpoint, error retry, loading/empty/complete/disabled states exercised. Browser upload/deletion/provider evaluation are not claimed; corresponding existing unit callbacks pass.

Independent scoped review found no product regression; parent treated three acceptance-evidence gaps as Important and fixed in one pass. Harness errors and true CSS root cause are distinguished in [review](evidence/phase4/slice-3/review.md). Full403 pass did not reproduce historical Focus Mode intermittent failure; no unproven root-cause claim. UI-only limitations: fixtures, no live backend/provider/hardware, native zoom/screenreader, cross-engine or performance certification. No unresolved Critical/Important in this slice.

## Slice4 — IELTS Orientation/Bridge

Code bb9a63b + follow-up narration target fix (manifest exact hash). Orientation/Bridge owner CSS refines solid slide/stage/module hierarchy and fluid narration/answer controls; actual header/progress add disjoint regular/solid GlassSurface. Handlers/effects/keys/version/revisions and answer/timer progression unchanged. Shared Bridge CSS also reaches existing integrated/mock consumers; those real owners are explicitly next Slice5, never counted verified by this shared adoption.

13 targeted tests,14 optimized Chromium, lint/type/build/i18n/whitespace pass. Full403 reused from Slice3 P0 gate; no duplicate suite for these style owners.18 paired actual route cells across3 viewports/two themes.132 opaque text samples min6.1049:1. RED389px at320/CSS200 fixed at narration/fieldset/flex owner; final four narrow cases plus native keyboard full indicator bounds pass. Visual QA found25px narration controls, reproduced RED and fixed44px; optimized14/14 fresh. Orientation wrong/correct answers, revisions2→3→4, version, same radio through theme/resize, reload/completion; Bridge all10stages, answer gating, timed deadline and completed resume; locked/empty/error/loading preserved. Parent self-review, no Critical/Important; P0 review next Slice5. Fixtures are not live API/narration/provider certification; native zoom/assistive/other engines/performance remain unmeasured.

## Slice5 checkpoint

Code 41d05ba09b2a6b220218074f3c53123d42a52e1c;17/34 verified,17 remain.15 optimized Chromium,17 targeted,403 full web tests and lint/types/i18n/build pass. [Evidence](evidence/phase4/slice-5/README.md). Next Slice6, no Phase5 authorization.
