# Topic-first Intermediate authoring

Latest user decision: one clear authoring flow instead of three fragmented sidebar entries. This report supersedes the earlier optional-topic authoring behavior in the catalog mapping report.

Final behavior:
1. One primary **Chủ đề & bài học / Topics and lessons** sidebar/hub destination, with secondary legacy category tools preserved.
2. Choose a topic; only then is Add lesson available, scoped by group ID. Ungrouped old records have an assignment-only remediation view.
3. Missing/invalid topic ID on `/topics/new` redirects to selection. A valid UUID is checked for catalog existence before rendering the editor. `/topics` redirects to the same workspace.
4. Topic is fixed for new lesson creation; JSON/form entry preserves that ID. Draft creation stores source and assignment atomically. API rejects missing topic with `400 TOPIC_GROUP_REQUIRED`, unknown group with404. Existing ungrouped edits and unrelated legacy formats retain their behavior.
5. Visible steps explain topic → lesson → check/human approval → publication. Existing lesson/source review/advanced audio/publication tools remain authoritative. Saved lessons can be reassigned without replacing dirty source or duration approval.
6. Topic labels display only the UI language. Both names and aliases remain searchable; wrapped menu rows retain natural height.

Evidence:
- TDD: new route/workspace tests failed for missing entry gate and add button exposed without selection, then71 focused UI tests passed across7 files. Includes route redirects, catalog existence, single active sidebar destination, JSON mapping, old routes and locale search.
- Service and isolated PostgreSQL:23 tests passed across2 files, including missing-group rejection without orphan creation, blocking non-topic→topic conversion without a group, and preserving existing ungrouped topic edits. Prior broader catalog increment106 API/integration and120 contracts passed.
- Actual Next browser fixtures:150 topics; direct add URL redirects; initial workspace has no add button; chosen topic is fixed in new form; one create payload carries group ID; JSON preserves ID; existing reassignment preserves dirty passage. Vietnamese/English labels,1440/375 widths, light/dark screenshots inspected, no page errors or overflow.
- Full web suite:121 files /722 tests passed. Web typecheck and scoped final lint passed after removing invalid testing-library-only query options. API build/typecheck/lint and prior Prisma generation passed. i18n37 namespaces/2351 paired keys, zero errors (includes concurrently edited dictionaries).
- Independent review identified an advanced non-topic draft conversion bypass. A regression test first failed, then the conversion guard was added; optimistic assignment predicates also reject concurrent group removal. The23-test final backend run passed. No other important frontend findings were reported.

Local review database contains150 curated groups/460 registered names, seeded repeatably without adding lessons/questions or changing content counts. No new migration for this flow change. No live AI calls, automatic approval/publication, merges or pushes. Concurrent audio-settings work was excluded from this feature's staging.
