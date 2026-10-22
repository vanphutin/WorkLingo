# Admin Experience 2.0 — QA and implementation checkpoint

## Source and scope

- Verified local main and GitHub main: `ef50667de9097083a51738bf89e46e3268573b7c` (read-only GitHub API, no fetch/pull).
- Isolated branch `codex/admin-experience-v2`; original checkout and preserved 52-path checkout remain untouched. Fingerprints in ignored `.superpowers/admin-experience-v2/source-before.json`.
- User brief and conceptual diagram authorize frontend UI, state safety, tests and local commits only. No backend/schema/contracts/scoring/scheduler changes; no push, merge or deployment.
- Existing roadmap remains `docs/IMPLEMENTATION_ROADMAP.md`; prior 48-route inventory and 27-destination mapping remain in `docs/admin-sidebar-ia`.

## Design and execution plan

Preserve Liquid Glass tokens, existing typography and blue/indigo focus states. Keep glass on shell chrome, solid surfaces for editing and data. One desktop identity, compact account controls, visible breadcrumbs, a restrained title/action row, compact metrics and local table scrolling. Native program selection provides keyboard support without a third accordion level. Main content uses available width; narrower reading panels stay readable.

Slices, each with targeted verification before dependent work:

1. A — navigation: program selector, truthful availability, analytics under System, IELTS breadcrumb ancestry, all 27 destinations retained.
2. B — shell and presentation patterns: compact header, shared page/section/toolbar/filter/status/state/table/workspace components, independent navigation scrolling.
3. C — overview/program workspaces: real metrics and availability, priority workflow entry points rather than a duplicate menu grid.
4. D — curriculum/content: compact stable tree/forms, loaded-data search/status filtering, wider authoring surfaces and pending-save navigation guard.
5. E — six IELTS authoring owners: shared page patterns and draft-safe shell navigation, preserving save/validate/publish/media contracts.
6. F — analytics/audit/operations/audio/AI: dense filter/table patterns, contextual job inspection, existing role restrictions preserved.
7. G — full regression, responsive visual comparisons, independent bounded review, scoped local commits and final handoff.

## Baseline evidence

Real Next production UI with deterministic API contract fixtures; these screenshots are not evidence of a live database or backend write. Baseline production build passed; 130 files / 801 frontend tests passed. Browser audit passed 3 suites, capturing 18 owners at 1440 VI light and 390 VI dark, plus dashboard/editor/curriculum/operations at 320, 768, 1280 and 1920 EN reduced motion, and Intermediate 320 CSS 200% zoom. See `evidence/before` and its JSON geometry records. CSS zoom is a reflow stress check, not a claim of native browser zoom coverage.

| Issue | Owner | Severity | Evidence | Planned resolution |
| --- | --- | --- | --- | --- |
| Header duplicates sidebar identity/context and pushes content below fold | Admin layout | P2 | before/dashboard-1440-vi-light.png; editor-390-vi-dark.png | Compact identity/account row and breadcrumbs |
| Two-column picker wraps program labels and consumes navigation height | Sidebar | P2 | before/ielts-1440-vi-light.png | Native contextual program selector |
| Program page duplicates navigation as large card grids | Program dashboard | P2 | before/ielts-1440-vi-light.png | Focused workflow and real program metrics |
| Multiple padding layers and oversized header/tree/filter panels | Curriculum/editor | P2 | before/curriculum-1280-en.png | Shared compact presentation patterns |
| Content pending debounce can be abandoned via shell link | Content authoring | P1 | source audit: unmount clears save timeout | Register existing dirty draft guard |
| IELTS/Foundation local drafts do not register shell guard | Authoring owners | P1 | source audit: local dirty state only | Reuse shared guard; no editor remount |
| Orientation revision conflict reload discards local edits; validate can target saved draft while fields changed | Orientation | P1 | source audit of run/load and lifecycle toolbar | Preserve draft on conflict and require save before validate/publish |
| Intermediate field label exceeds 320px at CSS200% | Intermediate editor | P2 | before/intermediate-320-en-zoom200.png | Min-width and field wrapping at actual owner |
| Operations inspection appears after entire table/pagination | Operations | P2 | before/operations-1440-vi-light.png | Responsive adjacent detail panel |

## Availability and mapping

Intermediate and IELTS have real Admin authoring modules. Beginner/Foundation combines pre-A1–A2 and has a Foundation definition editor inside shared curriculum; a standalone Beginner program workspace is deferred. TOEIC is deferred. Basic has no separate catalog/module/route. Catalog status is read from the API and can differ from seed defaults; Admin tool availability does not imply learner release readiness.

Mapping preserves all prior destinations. Overview → Overview. Intermediate overview/groups/topics alias/7 skills → Training / Intermediate. IELTS overview/orientation/bridge/integrated/mocks/topics/band curriculum → Training / IELTS. Content/import/curriculum → Shared. Analytics/audit/operations/audio/AI/learner view → System. Unknown or deferred modules receive no fabricated destination. Existing route guards still admit CONTENT_ADMIN and SYSTEM_ADMIN; system AI mutation remains SYSTEM_ADMIN-only.

## Checkpoint

Slices A–F implemented and independently reviewed. Final verification evidence follows; only local feature commits are authorized.

## Complete destination mapping


| Old destination | New location | Change |
| --- | --- | --- |
| `/admin` | Overview | Retained unchanged |
| `/admin/programs/intermediate` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/ielts` | Training programs / IELTS | Retained unchanged |
| `/admin/programs/intermediate/topic-groups` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/topics` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/grammar` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/pronunciation` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/vocabulary` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/reading` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/listening` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/speaking` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/writing` | Training programs / Intermediate | Retained unchanged |
| `/admin/ielts-topics` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-orientation` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-bridge` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-integrated` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-mocks` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-band-curriculum` | Training programs / IELTS | Retained unchanged |
| `/admin/content` | Shared management | Retained unchanged |
| `/admin/curriculum` | Shared management | Retained unchanged |
| `/admin/settings/audio` | System | Retained unchanged |
| `/admin/analytics` | System | Moved from Shared; existing route retained |
| `/admin/audit` | System | Retained unchanged |
| `/admin/operations` | System | Retained unchanged |
| `/admin/settings/ai` | System | Retained unchanged |
| `/dashboard` | System | Retained unchanged |
| `/admin/content/new` (existing page action) | Shared management / Import content | Existing route exposed as shortcut |

## Implementation and state safety

- Desktop uses a 16rem sidebar beside a compact account bar; at widths below 1000px the same navigation becomes a disclosure. Navigation scrolls independently, with the final learner-view link reachable by keyboard. A native select replaces the two-column program picker. Choosing tools or collapsing groups does not route or own editor state.
- Page, section, toolbar, filter, table-region, status, empty/error and workspace presentation components have no mutation/loading/form state. Scoped class names avoid AI/audio provider badge collisions after client navigation.
- Overview puts program management before historical charts. Program workspaces retain real catalog metrics, truthful learner availability, focused authoring tasks and explicitly global shared tools. Unsupported assessment/learner-detail capabilities remain explained without fake links or numbers.
- Content search/status filters use only loaded imports and say so. Archive/delete semantics, revision/idempotency receipts, parser validation, media selection and publication remain unchanged.
- Shared dirty guards now cover pending content autosave, new imports/templates, curriculum creation fields, Foundation definitions, all six IELTS owners, and Admin audio/AI preferences. Identical discard messages are asked once for multiple active forms. Registration synchronizes with the visible dirty/saved commit. Successful import/save clears the relevant guard; cancelled navigation retains the same field DOM instance.
- Foundation collapse/filter tests preserve the objective editor. Tree refresh keeps it mounted, and closing/switching a mission checks the guard. No layout/theme/locale keys were added to feature owners.
- Orientation 409 retains local text and original revision until the user explicitly confirms reloading the server draft. Dirty visible changes disable validation/publication of the saved revision; immutable historical releases and API request shapes remain unchanged.
- Operations inspection is adjacent to the table on wide screens and above it on narrow screens. The panel has no focus trap: its heading receives focus, Escape/Close return to the triggering row, and stale inspection responses cannot replace newer selection. Pagination/filter requests keep the same API behavior. Tables scroll locally, with minimum action widths to avoid split button labels.
- Role guards remain in the existing Admin layout and backend. Both Admin roles can reach destinations; system AI updates still require SYSTEM_ADMIN. Account AI and system AI settings retain their separate owners.

## CSS ownership audit

Searched non-CSS consumers before removal. The active shell is `.application-shell.admin-shell` plus the dynamically generated `.workspace-navigation-admin`; both remain live. Removed the unused former `.ad-shell`, `.ad-workspace`, `.ad-sidebar`, `.ad-navigation`, `.ad-nav-link`, `.ad-ielts-navigation`, `.ad-nav-unavailable` blocks and their responsive rules from `admin-dashboard.css`. Removed unused `.admin-main`, `.admin-main-nav`, `.admin-nav-link`, `.admin-nav-links` blocks from `admin.css`; preserved shared/learner styles and live breadcrumbs/dashboard/authoring selectors. This was targeted source inspection, not regex deletion of an entire stylesheet.

Removed inherited curriculum/audit horizontal clipping; local table regions own horizontal scrolling. Fixed the actual Intermediate field min-width/wrapping owner at CSS200%. Replaced the invalid pre-existing CSS `:has-text("Foundation")` selector with the explicit `.foundation-editor-toggle` class; final production build no longer reports that parsing warning. Provider-specific classes remain isolated from shared context badges.

## Independent review

A bounded read-only reviewer inspected committed and working changes against the verified base. Three findings were fixed: unguarded new import/template replacement; Foundation tree toggle/switch bypassing the editor Close guard; and shared badge/section CSS class collisions. Follow-up verified all three and found no further issues in that scope. Source review also found no authorization regression. Review was independent; parent owned test execution and visual QA.

## Verification evidence

| Check | Actual result | Evidence |
| --- | --- | --- |
| Frontend regression | 130 files / 810 tests passed | `.superpowers/admin-experience-v2/final-tests.log` |
| Frontend lint | Passed, no errors | `lint.log` |
| Frontend typecheck | Passed | `typecheck.log` |
| i18n check | 40 namespaces, 2507 paired keys, zero errors; 548 candidate unused keys reported | `i18n.log` |
| Production frontend build | Passed; 48 app route templates, no Foundation CSS parse warning | `build.log` |
| Admin Experience browser suite | 13 passed, latest presentation polish rechecked with 5 owner/detail cases | `browser.log`, `polish-browser.log`; `evidence/after` |
| Navigation/route browser suite | 14 passed; 34 historical + 14 additional templates, category URLs, active/deep-link/history, VI/EN/Light/Dark, keyboard and roles | `navigation-browser.log`; `evidence/navigation` |
| Authoring browser suite | 17 passed in full run; stale table-wrapper test selector migrated and its targeted rerun passed (all 18 cases verified) | `authoring-browser.log`, `authoring-table-browser.log`; `evidence/authoring/slice-6` |
| Isolated live Admin browser | 6 passed: desktop/mobile curriculum/audit, content save/validate/audio/publish/409 and operations/analytics | `live-focused.log`; dedicated `playwright.admin-ux-live.config.ts` |
| i18n checker regression | 7 tests passed | `i18n-tests.log` |
| Backend integration | 6 files / 25 tests passed on disposable schemas | `backend-integration.log` |

Backend cases cover Admin authorization, curriculum commands, Foundation publication/dependencies, IELTS Orientation lifecycle, operations privacy and system AI permissions. Production migrations/data and live providers were not used. Test providers were deterministic simulation/fake providers.

Browser matrix: 18 Admin owners at 1440×900 VI light, 390×844 VI dark, 1440×900 EN dark and 390×844 EN light; dashboard/editor/curriculum/operations at 320×740, 768×1024, 1280×800 and 1920×1080 EN; Intermediate at 320 CSS200%; authoring Light/Dark at 390/768/1440 and all authoring controls at 320 CSS200%. Navigation tests add all VI/EN × Light/Dark combinations. System follows OS color scheme; reduced motion/transparency explicitly remove effects and retain mounted draft fields. Geometry JSON records show no document horizontal overflow for measured final owners, including the former Intermediate 5px overflow. Dense tables remain locally scrollable and keyboard reachable.

Selected comparisons: [desktop overview before](evidence/before/dashboard-1440-vi-light.png) / [after](evidence/after/dashboard-1440-vi-light.png), [mobile editor before](evidence/before/editor-390-vi-dark.png) / [after](evidence/after/editor-390-vi-dark.png), [curriculum before](evidence/before/curriculum-1280-en.png) / [after](evidence/after/curriculum-1280-en.png), [IELTS workspace](evidence/after/ielts-1440-vi-light.png), [operations detail desktop](evidence/after/operations-detail-1440-en.png) / [mobile](evidence/after/operations-detail-390-en.png), [reduced transparency](evidence/after/orientation-system-dark-reduced-transparency.png).

## Limitations and existing-suite findings

Screenshot matrices use the real production UI with explicit contract fixtures, not production/backend data. Separate live Admin journeys use the existing isolated local database harness. CSS zoom exercises reflow; native browser zoom, screen reader speech, Safari and Firefox were not certified. No paid provider readiness is inferred from simulation audio.

The first invocation of legacy Admin E2E projects pulled in learner dependencies: Foundation desktop stayed on dashboard instead of starting a session; Foundation mobile timed out in an API request; engagement mobile also failed. Those non-Admin learning flows were not changed as part of this UI task. Running Admin projects without those dependencies passed five journeys; the remaining mobile operations test was updated to open its disclosure menu before selecting Analytics. A dedicated Admin live config avoids unrelated learner dependencies while keeping disposable-schema setup/teardown. Initial new live-test retries corrected case-sensitive English button names and scoped the conflict alert to Admin main, excluding Next's route announcer; no application behavior was weakened.

A transient full-suite saved-draft navigation race exposed delayed effect cleanup. Guard registration now uses a layout effect so it matches the visible saved state before user interaction; all 810 frontend tests then passed. Test-only selectors were migrated to shared presentation components. Unknown backend/business features were not fabricated.

## Git preservation and commits

Root main remains `ef50667de9097083a51738bf89e46e3268573b7c`, with its existing single `next-env.d.ts` modification unchanged. The preserved checkout remains on `preserve/worklingo-original-dirty`, HEAD `7a5e383763ccd63c4befa4ab07a5559ba7cabfbe`; all 52 detailed dirty paths and all 52 SHA-256 file hashes match its earlier preservation snapshot. No reset/stash/clean, force push, backup deletion, fetch/pull, push/merge or deployment occurred for this task.

Feature commits:
- `0250dfb` — refactor(admin): clarify program selection and navigation ownership
- `89a4560` — refactor(admin): add compact shell and shared workspace patterns
- `3765852` — refactor(admin): prioritize program workspaces and real dashboard data
- `ad0acfa` — refactor(admin): streamline content and curriculum while preserving drafts
- `c0fc4c1` — fix(admin): preserve IELTS drafts through navigation and revision conflicts
- `96bddbd` — refactor(admin): contextualize operations and compact system settings

Final browser evidence, source polish and this report are recorded in the concluding QA commit.

## Changed source/test files

- `apps/web/e2e/admin-experience-v2.spec.ts`
- `apps/web/e2e/admin-observability.spec.ts`
- `apps/web/e2e/admin-sidebar-ia.spec.ts`
- `apps/web/e2e/fixtures/phase5-routes.ts`
- `apps/web/e2e/liquid-glass-phase4-authoring.spec.ts`
- `apps/web/e2e/liquid-glass-phase5-guards.spec.ts`
- `apps/web/playwright.admin-ux.config.ts`
- `apps/web/src/app/(admin)/admin/settings/ai/page.tsx`
- `apps/web/src/app/(admin)/layout.tsx`
- `apps/web/src/features/admin-audit/audit-workspace.tsx`
- `apps/web/src/features/admin-audit/audit.css`
- `apps/web/src/features/admin-content/admin.css`
- `apps/web/src/features/admin-content/content-authoring-workspace.tsx`
- `apps/web/src/features/admin-content/content-list.test.tsx`
- `apps/web/src/features/admin-content/content-list.tsx`
- `apps/web/src/features/admin-content/new-content-import.test.tsx`
- `apps/web/src/features/admin-content/new-content-import.tsx`
- `apps/web/src/features/admin-curriculum/curriculum-workspace.test.tsx`
- `apps/web/src/features/admin-curriculum/curriculum-workspace.tsx`
- `apps/web/src/features/admin-curriculum/curriculum.css`
- `apps/web/src/features/admin-curriculum/foundation-definition-editor.tsx`
- `apps/web/src/features/admin-dashboard/admin-dashboard.css`
- `apps/web/src/features/admin-dashboard/admin-dashboard.test.tsx`
- `apps/web/src/features/admin-dashboard/admin-dashboard.tsx`
- `apps/web/src/features/admin-dashboard/admin-navigation-guard.test.tsx`
- `apps/web/src/features/admin-dashboard/admin-navigation-guard.tsx`
- `apps/web/src/features/admin-dashboard/admin-navigation-model.ts`
- `apps/web/src/features/admin-dashboard/admin-navigation.test.tsx`
- `apps/web/src/features/admin-dashboard/admin-navigation.tsx`
- `apps/web/src/features/admin-dashboard/admin-sidebar.css`
- `apps/web/src/features/admin-dashboard/admin-sidebar.test.tsx`
- `apps/web/src/features/admin-dashboard/admin-sidebar.tsx`
- `apps/web/src/features/admin-experience/admin-experience.css`
- `apps/web/src/features/admin-experience/admin-patterns.tsx`
- `apps/web/src/features/admin-ielts-band-curriculum/band-curriculum-workspace.tsx`
- `apps/web/src/features/admin-ielts-bridge/ielts-bridge-authoring-workspace.tsx`
- `apps/web/src/features/admin-ielts-integrated/integrated-profile-workspace.tsx`
- `apps/web/src/features/admin-ielts-mock/ielts-mock-workspace.tsx`
- `apps/web/src/features/admin-ielts-orientation/orientation-authoring-workspace.test.tsx`
- `apps/web/src/features/admin-ielts-orientation/orientation-authoring-workspace.tsx`
- `apps/web/src/features/admin-intermediate/intermediate-authoring.css`
- `apps/web/src/features/admin-observability/analytics-workspace.tsx`
- `apps/web/src/features/admin-observability/observability-workspaces.test.tsx`
- `apps/web/src/features/admin-observability/observability.css`
- `apps/web/src/features/admin-observability/operations-workspace.tsx`
- `apps/web/src/features/ai/ai-settings-panel.tsx`
- `apps/web/src/features/audio/admin-audio-settings-panel.tsx`
- `apps/web/src/features/ielts-study-admin/topic-editor.tsx`
- `apps/web/src/i18n/messages/adminExperience.ts`
- `apps/web/src/i18n/messages/adminIeltsOrientation.ts`
- `apps/web/src/i18n/messages/adminNavigation.ts`
- `apps/web/playwright.admin-ux-live.config.ts`
- `apps/web/e2e/admin-experience-live.spec.ts`

Evidence is under `docs/admin-ux/evidence`; reports from prior IA work remain unchanged.

## Final handoff

All required Admin checks above completed. The 45 fixture-based browser cases and six isolated live Admin cases are verified; the last local table selector rerun and five presentation polish rechecks are described separately rather than counted as additional distinct coverage. No required Admin blocker remains. The earlier unrelated learner-dependency failures remain documented instead of being represented as passing.

Skill audit: using-superpowers (routing); mandate-steward (source-backed baseline audit and existing roadmap governance); brainstorming/writing-plans/executing-plans (approved brief, design and seven slices in this report); frontend-design/ui-ux-pro-max/vercel-react-best-practices (existing Liquid Glass, responsive density, native semantics and state boundaries); using-git-worktrees/git-workflow-and-versioning (isolated branch and scoped commits); test-driven-development (new navigation/filter/draft/conflict/inspection regressions); systematic-debugging (test findings and selector/state synchronization diagnosis); requesting/receiving-code-review plus code-review-and-quality (bounded independent review and fixes); verification-before-completion (actual gate results); finishing-a-development-branch (local handoff only). Design-taste-frontend was excluded because its dashboard exclusion applies. No mandate register was changed, so mandate CLI validation was not invoked. No new backend feature or permission was introduced.
