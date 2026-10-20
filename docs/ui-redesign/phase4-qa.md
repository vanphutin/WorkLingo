# Phase 4 QA — route migration

Status: IN PROGRESS. Approval: human master attachment e5a41d65-254b-4b8e-9246-71c3e78f82f2. Baseline2d9ba797f92daf2583210c66ab2141769dcfd95b; dedicated branch/worktree retained. No merge/push/deploy or Phase5/6 approval.

## Phase 3 technical acceptance

ACCEPTED WITH LIMITATIONS. Actual history includes307829b,80177eb,02d27b0 and remediation2d9ba79. Equivalent390px/VI/CSS200 measurements confirm baseline564px, Phase3 regression596px, remediation564px. The32px shell regression is fixed; feature issue P4-SETTINGS-REFLOW-001 transfers to Slice7. Existing evidence:402 web tests,45 targeted,13 production shell and3 production remediation browser checks, lint/types/build pass. These results are reused historical evidence, not fresh Phase4 runs.

Fresh entry checks: isolated branch/path/HEAD clean, main7a5e383 unchanged, no unmerged entries. Original checkout preservation utility confirms1,295 hashes and Git status unchanged. No dirty source was transferred. Limits: Chromium fixtures do not certify live auth/media/API, Firefox/WebKit, native browser zoom, screen readers or performance. The historical concurrent Focus Mode unit failure remains an intermittent finding to investigate if reproduced; its cause is not claimed established.

## Slice checkpoints

| Slice | Routes | Status | Evidence / commit |
| --- | ---: | --- | --- |
| 1 Public/Auth + boundaries | 3 | Verified (Chromium fixtures) | 7a37bed; [evidence](evidence/phase4/slice-1/README.md) |
| 2 Dashboard/Programs/Mastery | 3 | Discovered | Pending |
| 3 Onboarding/Learning/Media | 3 | Discovered | Pending |
| 4 IELTS orientation/bridge | 3 | Discovered | Pending |
| 5 IELTS integrated/pathway/mock | 5 | Discovered | Pending |
| 6 Admin authoring | 9 | Discovered | Pending |
| 7 Operations/settings | 8 | Discovered | Pending |

Coverage now:34 total,3 implemented,3 verified,0 blocked,31 remaining. Error/not-found boundaries are additional owners, not routes.

## Slice 1 — Public/Auth

Code commit7a37bed (`feat(ui): redesign public landing and authentication pages`). Actual owners: HomePage +extracted landing.css; login/register introduction wrappers; AuthPage preference group +existing auth.module.css; error/not-found +their shared CSS module; primary heading test; isolated Phase4 browser config/spec/snapshot runner. All original auth effects, submit/validation/state, locale synchronization and redirect decisions retained. No domain/backend/dependency changes. Original dirty landing animation/CSS were inspected and left intact; the static workplace example carries its presentation intent without importing independent UI state.

Tests:6 files15 targeted;85 files402 full web tests;10 optimized Chromium checks. Baseline paired capture6 public tests and6 Slice2 baseline tests passed on immutable optimized2d9ba79 snapshot. Three required viewports ×two themes ×four page states (home/login/register/not-found) give24 comparable before/after images each.198 opaque text contrast samples minimum5.5666:1. Twelve320/360/390 CSS200 cases fit the viewport and explicitly reach every expected native control with visible outline and full horizontal/vertical bounds. Auth fixture checks401/409, pending/disabled, existing validation focus, draft retention through locale/theme, real form submit payloads and four learner/onboarding/admin redirects. System-dark/reduced-motion/reduced-transparency/increased-contrast/forced-colors checks pass.

TDD/evidence: baseline reflow RED333px at320; strengthened heading RED1/4 then GREEN; focus-outline mutation rejected; strengthened vertical focus test exposed852.8125px indicator bottom at844px. Owner-scoped scroll margin/padding and skip-link insets fixed it, development GREEN1/1 then optimized10/10. An initial heading assertion omitted the existing word “your”; corrected test and reran exact baseline RED. One concurrent temporary heading probe produced a parse error; exact bytes restored and all final checks use the restored source. An initial auth test used an English-only selector after switching to Vietnamese; corrected the fixture selector. Neither is recorded as a product regression or passing run. Failed/mutation records remain separated from verified records.

Independent review: two verification gaps addressed in one parent fix pass; [review and declined-to-judge rulings](evidence/phase4/slice-1/review.md). Per-test/per-run persistence now retains all24 matrix observations even on partial rerun/worker restart. Lint/typecheck/i18n/build/whitespace pass. Historical Focus Mode intermittent failure did not reproduce in the fresh402-test full run; cause remains unproven, not labelled fixed.

Limits: schema-valid browser transports simulate authentication/data responses. Live auth/API, native browser zoom, screen-reader, Firefox/WebKit and performance remain unmeasured. Error boundary recovery is covered by callback/confidentiality unit tests, not by injecting a live Next runtime exception. Glass composite contrast is inherited Phase1–3 evidence; new content contrast samples are opaque effective-background checks. No Critical/Important finding remains within Slice1.
