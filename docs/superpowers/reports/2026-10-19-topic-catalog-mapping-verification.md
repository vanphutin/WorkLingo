# Bilingual topic catalog and lesson mapping

Scope: 150 curated Intermediate topic categories, bilingual names/aliases, authoring assignment by stable ID. These are category records; lessons/questions and human duration approval remain separate.

Actual local data:
- Before changes, saved grouping existed only in the category workspace. New lesson form now selects a topic and sends its ID with content creation; existing lessons reassign through the independent group revision API.
- Backed up the local review database (12.8 MB), applied exactly `20261019110000_intermediate_topic_catalog`, then ran only `seedIntermediateTopicCatalog` twice. First run: created150/reused0/skipped0; second: created0/reused150/skipped0. Database has150 curated groups and460 registered names. No imports, lessons, versions, duration reviews or sessions were added or changed by the seed.
- Restaurant aliases Nhà hàng / Restaurant / Restaurants / Nha hang / restaurent resolve to one group ID. Conflicting registered names are rejected atomically; existing ambiguous groups are reported instead of merged.

Verification:
- Dataset tests first failed for missing module, then3 passed: exact150 count, unique stable keys, no names shared across categories and correct Restaurant aliases.
- Real PostgreSQL integration7 passed: migration replay/backfill, alias uniqueness/cascade, omitted metadata preservation, atomic create+assignment/no orphan on failure, stale assignments, deletion preserving content/approval, repeatable seed preserving IDs and administrator edits.
- Relevant API/authoring/publisher and integration suites:17 files /106 tests passed. All contracts:23 files /120 tests passed.
- Real Next browser fixture:150 topics, cross-language/alias search, Add lesson preselection, JSON keeps selection, exactly one create with group ID, existing reassignment keeps dirty passage, category displays in Vietnamese and English. Screenshots1440/375/light/dark inspected; no horizontal overflow or page errors. Fixture APIs isolate browser actions from user data.
- UI locale correction followed failing tests (4 expected failures), then18 focused tests passed for Vietnamese-only/English-only names, alias search, editing and learner choice. English name absence on custom groups uses existing primary name.
- Independent bounded review found no P1/P2 issue in catalog/seed/mapping changes. Dataset independently checked150 keys and460 normalized names. Latest display correction also has focused tests and bilingual browser checks.
- API build/typecheck, web typecheck, changed API lint, full web lint and Prisma generation passed. API restart released the Windows Prisma DLL lock. i18n37 namespaces/2334 paired keys, zero errors.

The first full web run passed710 tests and hit one existing dashboard wait timeout while the topic picker was still mounting; immediate targeted rerun passed7 tests. The test now waits explicitly for the picker catalog request before asserting its rendered controls. A later full run was interrupted on the user's locale correction; final run totals are recorded at delivery.

Limits: no paid AI/provider qualification, production Next build or full backend suite. No automatic question generation, approval, publication, or broad curriculum seed. Unrelated concurrent audio-settings edits were preserved outside these commits.
