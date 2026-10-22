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

Baseline complete; production implementation not started at this checkpoint. Final results and limitations will be appended after verification.
