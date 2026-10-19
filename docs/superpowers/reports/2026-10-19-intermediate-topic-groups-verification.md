# Intermediate topic groups — verification

Scope: admin topic groups containing multiple saved lessons; learner group-then-lesson choice. One passage/question set/approved duration per session remains unchanged. No AI call, sample publication or user-content migration.

Implementation:
- Dedicated `/admin/programs/intermediate/topic-groups` workspace and sidebar/breadcrumb links. Create, rename, describe, delete; search/filter lessons and assign/clear groups. Delete detaches lessons; optimistic revision conflicts require refresh. Existing content editor handles each lesson's independent authoring/publication lifecycle.
- Nullable indexed group FKs on ContentImport/ Lesson; independent assignment revision. Stable logical lesson grouping is shared across its versions. Publication respects the locked import assignment and preserves the old group for a fresh untouched import.
- Eligible learner listing includes only safe optional group metadata after existing eligibility filters. Ungrouped lessons remain accessible; random selection is explicitly across all eligible lessons. No session request/idempotency changes.

Evidence recorded during implementation:
- New UI tests first failed because workspace/client did not exist and picker had no separate lesson selector. Focused UI after implementation: 4 files / 31 tests passed.
- PostgreSQL integration: 3 tests passed in a unique temporary schema, all migrations deployed there, schema removed afterward. Verified normalized duplicate names, multi-draft grouping, stale revisions, concurrent assignment rejection, logical lesson/version consistency, FK rejection, deletion preserves drafts/source revisions and human duration approval.
- Real Next pages with intercepted API fixtures: create, rename, assign, delete without losing lessons; learner group selection, multiple lessons, ungrouped selection and selected mission request without duration override. Screenshots inspected at 1440/375 widths in Vietnamese/light and English/dark; no horizontal overflow or page errors.
- Local review database: 12.8 MB backup created before applying exactly migration `20261019100000_intermediate_topic_groups`; no seed/reset/content publication. API and web proxy health 200; anonymous admin catalog 401.
- Independent read-only review: no remaining P1/P2 findings. Coordinator found fresh-version inheritance issue; backend added inheritance and explicit-clear regression tests.

Final gates:
- Web: **119 files / 703 tests passed**, full suite, two workers.
- Relevant API and publisher: **13 files / 77 tests passed**. Topic/group contracts: **2 files / 11 tests passed**. PostgreSQL integration: **1 file / 3 tests passed**.
- Web/API/contracts typechecks, web lint, changed API/contracts lint, API build and Prisma generation passed. The running API was briefly stopped to release Windows' Prisma DLL lock, then restarted on 4300; web stays on 3000.
- i18n: **37 namespaces / 2307 paired keys, zero errors**. Diff whitespace check passed.

Full backend/end-to-end/provider qualification and production Next build were not run for this increment; browser behavior used fixtures while database behavior used the real PostgreSQL service. No dependencies changed.
