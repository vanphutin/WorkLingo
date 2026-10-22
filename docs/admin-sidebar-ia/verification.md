# Admin sidebar IA — verification

Date: 2026-10-22 (Asia/Saigon). Base: local main `d2fe1e3d3fe89e839b808bf744f8462d4fb48639`. Branch: `codex/admin-sidebar-ia` in a new managed worktree. No merge, push or deployment.

## Delivered behavior

Four primary entries: Overview; Training programs; Shared management; System. One disclosure opens at a time. Training programs presents the five requested program names, then one flat contextual tool list. Intermediate retains topics, lessons and all seven categories. IELTS retains overview, orientation, bridge, integrated practice, mocks, topics and band curriculum. Shared management owns content, the existing import page shortcut, curriculum and analytics; System owns audit, operations, audio, AI and learner view.

All 26 old shell destinations remain, without duplicates. One shortcut exposes the already-existing `/admin/content/new` page. See [inventory and mapping](inventory.md) and [48 source templates](routes.json). No routes, API, CRUD, business capabilities or dependencies were added.

Foundation / Mất gốc, Basic / Cơ bản and TOEIC have no dedicated implemented authoring tools. They are explicitly labelled Proposed IA, with no link or fake workspace. Existing `beginner` catalog statistics/deferred shell and shared Foundation content/curriculum are distinguished from dedicated programs. IELTS catalog availability and learner admission gates are unchanged.

## Verification commands and evidence

| Check | Command | Result |
| --- | --- | --- |
| Clean baseline | `pnpm --filter @worklingo/web test` | 128 files, 798 tests passed before edits |
| New sidebar RED → GREEN | `vitest run src/features/admin-dashboard/admin-sidebar.test.tsx` | Initial 15 failing assertions established missing hierarchy; 16 passed after implementation |
| Independent review regression RED → GREEN | sidebar tests filtered by `restores visible focus` | Both breakpoint cases failed first; after visible-control fallback, 28 combined sidebar/shared-nav tests passed |
| Frontend regression, final source | `pnpm --filter @worklingo/web test` | 130 files, 801 tests passed, 0 failed |
| Role enforcement | `pnpm --filter @worklingo/api exec vitest run src/auth/infrastructure/roles.guard.spec.ts --maxWorkers=2` | 4 passed |
| Lint | `pnpm --filter @worklingo/web lint` | Passed |
| Typecheck | `pnpm --filter @worklingo/web typecheck` | Passed |
| Translation catalogs | `pnpm i18n:check` | 39 namespaces, 2,491 paired keys, 0 errors; 544 existing candidate-unused keys reported |
| Translation tooling tests | `pnpm test:i18n` | 7 passed |
| Production compilation | `pnpm --filter @worklingo/web build` | Passed after the final shared navigation fix |
| Browser suite | `pnpm --filter @worklingo/web exec playwright test -c playwright.admin-sidebar.config.ts` | 14 tests passed (including both 48-route matrices) |
| Whitespace | `git diff --check` | Clean |
| Mutation sensitivity | Temporarily replace segment-boundary matching with `startsWith(href)` | Prefix collision test failed; original source restored before final regression/build |

Unit coverage includes exact old→new destination preservation, source inventory completeness, all menu URLs resolving to real templates, role redirects/retry, longest path matching, prefix collisions, nested editor deep links, route context reset, hidden group semantics, VI labels, Escape/focus and draft retention. Existing real-editor dirty-navigation tests still pass for sidebar, breadcrumbs, brand and editor actions.

Browser coverage uses the real optimized Next application with explicit API contract fixtures. The two route matrices cover all 34 historical Liquid Glass routes plus all 14 added page templates at desktop EN/Light and mobile VI/Dark. Dynamic routes use valid IDs/categories/group context; additional visits instantiate all seven category destinations and both implemented program overview URLs. `/topics` redirects to topic groups as before; `/topics/new` requires a valid `topicGroupId` and existing group.

Eight screenshots cover sidebar desktop/mobile × VI/EN × Light/Dark. Other browser cases exercise native Enter/Space, Escape focus return, Tab leaving the disclosure, system color-scheme changes, reduced motion, narrow-screen navigation, independent scrolling and access to final links, unsaved editor retention, query/deep-link reload, real browser back/forward, and anonymous/learner/both-admin-role layout behavior. The review regression additionally covers resizing with the active group collapsed and with a different program selected.

## Independent review and fixes

A fresh builder check found no consequential ambiguity in the design and plan. A separate read-only `gpt-6-astra` whole-change reviewer inspected tests then implementation and reproduced one P2 focus defect in Chromium: changing to desktop could attempt to focus the active link inside a hidden group. The shared shell now selects a visible active link or a visible fallback. Two failing unit regressions and a browser regression verify the fix. No other consequential finding was reported. No deferred review minors.

Author visual QA also caught the initially excessive sidebar height. A browser assertion failed with the sidebar bottom below the viewport; the final CSS bounds the admin container and lets navigation shrink and scroll independently. Learner navigation styling is unchanged.

Review exclusions were explicitly resolved: live backend qualification is outside this UI fixture suite (unchanged role boundaries plus existing role-guard tests were checked); final screenshots and browser completion belong to this report; mutation sensitivity was verified by the author separately; new program authoring is excluded by the user's scope.

## Limits and skipped checks

- Browser evidence is Chromium presentation/interaction evidence against API fixtures, not a live database or deployed security qualification. No data writes, release qualification, full backend regression or all-browser/WCAG certification was attempted for this frontend refactor.
- At the extreme combination **320px viewport + CSS zoom 200%** (160 effective CSS pixels), the sidebar's bounds fit and navigation remains operable, but an unchanged Intermediate editor label (`Pronunciation / IPA`) produces **5px page overflow**. No page-wide no-overflow claim is made at that combination; editor text/layout remediation was not folded into this sidebar change. Draft values remain intact.
- Initial browser failures exposed test assumptions (Next's empty route announcer, system theme implemented through CSS, existing route redirects, invalid introduction fixture slide ID, localStorage initialization on `about:blank`, and checking a mobile toggle before authenticated layout mounting). These were corrected in fixtures/assertions; final results refer only to the corrected suite.
- Node's FORCE_COLOR/NO_COLOR warning and the pre-existing jsdom native-document-navigation diagnostic may appear in logs; they are not failed assertions.

## Git preservation

The new worktree started clean at the verified local main SHA. Windows long-path support was enabled in repository Git configuration to let the native worktree tool check out existing long evidence paths. No source change was made in the original checkout.

Before/after status, HEAD and SHA-256 comparisons confirmed that the original checkout's one generated-file modification and the preserved checkout's **52 dirty paths** were unchanged. No reset, stash, clean, backup modification, merge, push or deploy was performed. Commits contain only the sidebar, its tests, inventory/design/plan and verification evidence.

## Decisions

- Separate `admin-navigation-config.ts` from rendering/model to avoid a circular import and keep one localized configuration; cost if reversed is file organization only.
- Preserve the existing topics redirect and query requirement, rather than changing topic-authoring workflow for a navigation refactor.
- Keep missing programs as noninteractive proposed IA; adding actual modules requires a separate product scope.

```text
SKILL AUDIT
Used: using-superpowers → routing; brainstorming/writing-plans → design and plan;
using-git-worktrees/git-workflow-and-versioning → isolation and scoped commits;
ui-ux-pro-max/vercel-react-best-practices → interaction, layout and React state;
test-driven-development/systematic-debugging → reproduction and regression fixes;
requesting-code-review/code-review-and-quality/receiving-code-review → independent review;
verification-before-completion/finishing-a-development-branch → verified branch handoff.
Verification: See command table and browser evidence; Git content preservation checked.
Not used: mandate-steward (implementation brief, no mandate audit); frontend-design
(existing visual system retained); backend implementation skills (no API changes).
```
