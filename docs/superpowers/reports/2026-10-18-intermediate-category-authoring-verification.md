# Intermediate category authoring verification — 2026-10-18

Checkout: `C:/Users/ASUS/.codex/worktrees/audio-dashboard-v2/WorkLingo`; branch `codex/audio-dashboard-v2`; starting commit `b837b0a`. The user requested distinct lesson entry per Intermediate category and delegated routine design. Local commits are authorized; push, merge and live content changes are outside this increment.

## Result and scope

Seven Intermediate categories have their own Add lesson, list and create/edit routes: grammar, pronunciation, vocabulary, reading, listening, speaking and writing. The overview exposes the seven actions before metrics. Structured fields emphasize each category's content; supporting activities remain expandable for the existing four-skill lesson format. Create/save reuse ContentImport and revision protection. Existing per-row delete/archive controls remain available in each category list. Validation, audio preparation and publication use the same record's advanced workspace.

Classification uses explicit source metadata, never title, level or activity skill. Legacy/unclassified lessons stay in the shared library. Custom source that cannot round-trip without loss is refused by the structured editor and remains accessible in the advanced editor. Published/archived records are read-only. Learner curriculum assignment and assessment policy are unchanged. The separate Format 1.2 Intermediate branch was not merged. No migration or dependency change was introduced.

## Checks actually run

- Full web suite: `pnpm --filter @worklingo/web test -- --maxWorkers=2` — **108 files, 637 tests passed** before the final shared navigation-guard follow-up. Final affected editor/navigation/layout/guard suites: **4 files, 65 tests passed**, including 16 new guard integration cases and the sidebar-order regression. The entire full suite was not repeated after those bounded changes.
- Content-format full suite: **10 files, 126 tests passed**; content-format lint/typecheck passed.
- Existing API content-import/publisher compatibility unit suites: **2 files, 16 tests passed**. API lint/typecheck/build passed.
- Web lint and typecheck passed. The initial typecheck/build exposed unsupported Testing Library role-query options and a tuple-label type in new tests; both were fixed and the final production build passed.
- `WORKLINGO_E2E_MODE=true pnpm --filter @worklingo/web build` — passed with all three category routes generated. This isolated build used `.next-e2e`; tracked `next-env.d.ts` paths were restored to `.next` afterwards.
- `pnpm i18n:check` — **35 namespaces, 2179 paired keys, zero errors**; seven i18n checker tests passed. Candidate unused keys are informational.
- Browser smoke: `pnpm --filter @worklingo/api exec tsx ../../.superpowers/intermediate-authoring-smoke.mts` — passed against the running Next server with every API request intercepted by fixtures. Verified all seven overview Add links; listening create, own-category redirect, revision-protected save, reload and category list; reading excludes listening and opens its own text form. EN/VI, light/dark and 375/1440 widths were covered. Zero page errors, unexpected API calls or horizontal overflow. Screenshots and logs are ignored under `.superpowers/`.
- Regression tests were observed failing before implementation for metadata/model, editor, navigation and routes. Deliberately inverted category guards/filtering were caught by editor/workspace tests and restored before final checks.
- Independent core review reproduced two issues: Unicode line separators could hide an answer choice, and blank collocation rows prevented managed round-trip. Three regressions failed first and passed after rejecting scalar line separators and normalizing blank collocations without mutating input. All **19 model tests** passed after fixes.

## Limits

Browser create/save/delete/archive operations use fixtures, not user records. No content was published and no application database migration or seed command was run for this increment. Broad database/concurrency/E2E suites were not run; unit and fixture browser results do not prove real PostgreSQL concurrency. The existing all-imports API is reused, so category lists/counts currently classify the shared library client-side.

## Final follow-ups

- Sidebar category links now appear immediately beneath Intermediate, before TOEIC/IELTS. The order regression was observed RED → GREEN; the navigation suite passed all 17 cases.
- Independent UI review identified a data-loss path through sidebar/breadcrumb navigation because `beforeunload` does not intercept Next client transitions. A shared admin navigation provider and guarded Link register the editor's dirty state for sidebar, breadcrumb, brand, Back and advanced-workspace links. Cancellation retains inputs; confirmation permits navigation; clean/saved drafts and modified new-tab clicks do not prompt. Registration is removed on unmount. Browser unload protection remains.
- Guard tests first reproduced **7 failures / 9 passes**, then all 16 passed. A deliberately bypassed guard failed the dirty-sidebar regression; the exact original source was restored before the final 65-test run. Scoped final lint passed.
- The final browser run on frozen source also verified sidebar and breadcrumb cancellation preserve the unsaved title, and confirmed leaving changes route without saving that title. Zero page errors. An earlier browser attempt overlapped the deliberate mutation experiment and was discarded; final checks ran after the worker froze/restored source.
- Production build and web typecheck passed again after the guard follow-up; generated paths were restored and `git diff --check` passed.
- Independent final review approved the frozen scope with no remaining actionable findings. All three P2 issues were reproduced, fixed and rechecked; sidebar ordering was also verified. The review does not authorize publication or assert database concurrency qualification.
- Local implementation commits: `1c9125e` metadata/model, `d39f76b` structured forms, `e5c0cdf` category routes/navigation and shared dirty-state guard. Documentation is committed separately; no push or merge was performed.
