# R2 Learning Program & Progression qualification

Date: 2026-10-30  
Branch: `codex/r2-learning-program-progression`  
Base: `0f8b83ac`  
Status: **VERTICAL_SLICE_VERIFIED**

The bounded R2 slice reuses the existing immutable curriculum hierarchy. A content administrator creates a generic program, attaches and publishes exact curriculum revisions, and publishes the program. An onboarded learner enrolls once with concurrency-safe idempotency; enrollment pins the published revision IDs. The server derives roadmap state and target-start capability. Required activity evidence completes the R2 activity-completion policy without creating mastery events; prerequisite completion unlocks the next mission, and a paused session remains resumable after dashboard reload.

## Evidence

- Isolated API/PostgreSQL journey: `apps/api/test/integration/r2-program-progression.integration.spec.ts`; final run **1/1 PASS** in `vertical-api-verified2.log`.
- Isolated browser journey: `apps/web/e2e/r2-program-progression.spec.ts`; **1/1 PASS**, actual Next UI + Nest API + disposable PostgreSQL. Receipt: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/browser-receipt.json`.
- Browser receipt records two pinned revisions, two session IDs, four activity submissions, first mission `completed`, second mission `in_progress`, `targetedStartSupported: true`, `humanParticipants: 0`, and `providerCalls: 0`.
- Screenshots: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030/admin-program.png`, `learner-roadmap.png`, `learner-mobile.png`. The 390px check passed with no horizontal overflow.
- Capability regression: **13/13 PASS**. Mutation of the completion-and-pin guard produced **2 failures**, then restoring the source returned **13/13 PASS**.
- Publication race regression: removing the graph relation lock produced the expected race (publish returned before the archive transaction completed); restoring the lock made the deterministic archive race test and authoring suite **4/4 PASS**.
- Independent review: no Critical or Required findings remain. The publication lock is intentionally coarse and may serialize short curriculum-authoring transactions.

## Boundaries

R2 uses `ACTIVITY_COMPLETION` only for newly authored generic programs. Legacy `MASTERY` enrollments retain the existing roadmap/start behavior; the UI hides targeted Start unless the API explicitly returns `targetedStartSupported: true`. No Beginner activation or evaluator-readiness guard was opened. The browser uses the product's typed speaking fallback with no synthetic audio score claim.

R2 is locally verified and safe to integrate after the final diff and mandate checks. It is not a deployment approval; R1 release gates remain blocked by grading quality, incomplete phonetic/provenance evidence, and deployment-target/rollback evidence. Real learner validation is deferred by the current owner policy.

## Regression verification

Final safe API unit/contract/security run: **166 files / 1,189 tests PASS**. Web: **150 files / 951 tests PASS**. Shared parser/contracts: **43 files / 297 tests PASS**. Root mandate/i18n/secret-scan regression: **37 PASS**. API/Web/shared lint and typecheck passed; API production build passed. Web production build evidence is retained in `web-build-verified.log`. The no-env API qualification rerun includes authoring/archive-race plus vertical progression: **5/5 PASS**, two fresh isolated schemas.

Default suites that can load project `.env`, touch shared databases, or require hosted providers were not invoked. The actual worktree had no root/API `.env`; R2 now explicitly passes `prisma.r2.config.ts` to the migration subprocess so future runs also avoid those files. Existing harness callers retain their default behavior.

Failures retained: initial selectors used Sign in rather than Log in, omitted the catalog aria-label suffix, targeted the wrong dashboard tab, raced saved-locale synchronization, reused a unique display order, and hit cold Next compilation at the default five-second assertion deadline. Final selectors use the actual accessible UI, locale save is awaited, and the bounded dev-server assertion deadline is30seconds. API test initially called an incorrect dashboard route; corrected to the canonical controller. One verification command omitted the explicit disposable DSN and failed closed before DB access; the explicit DSN rerun passed. No product assertion was removed or marked skipped.
