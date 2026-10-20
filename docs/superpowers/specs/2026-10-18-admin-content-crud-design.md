# Admin content authoring and individual lifecycle

Date: 2026-10-18. Scope delegated by the user: independent CRUD for current Admin tools; confirm differing formats; defer Beginner/Foundation and TOEIC. The user delegated input/workflow decisions ("tùy b") and requested continued execution. Existing isolated checkout: codex/audio-dashboard-v2 at 6b52a0f. No merge, push, live content publication or database migration is part of this work.

## Existing formats and boundaries

| Workspace | Unit | Existing input | Gap |
| --- | --- | --- | --- |
| Intermediate/content | lesson import | WorkLingoLesson/1.0 or /1.1 text | no individual removal |
| IELTS topics | topic with packs pointing to published curriculum revisions | JSON manifest schemaVersion 1 | no removal; raw JSON only |
| Orientation | slides inside one versioned introduction | slide form | already add/edit/remove slides; clarify singleton release boundary |
| Bridge | question-type module with ten stages | structured form | duplicate question-type restriction prevents independent lessons; no draft removal |
| Integrated | duration allocation profile (60/90/120/150) | four numeric allocation fields | configuration, not authored lesson; explain and link actual content |
| Mocks | four-skill test paper | JSON schemaVersion 1/2 | no creation/removal, raw JSON only |
| Band curriculum | seven fixed progression stages with nested competencies/remediation | stage JSON | configuration, not lesson; structured stage editing needed |

## Product behavior

Use existing per-resource list/edit workspaces and maintain explicit selection identity. Each editable item has its own draft revision. Saving one item cannot overwrite another. Provide Create, Open/Edit, Save draft, Validate, Publish and Remove where the resource is actual authored content. Delete only a never-published draft; archive resources with published history, retain version/session references. Show a confirmation naming the resource and distinguish archive from delete. Never execute these operations during development against user data.

Replace mandatory JSON authoring for topics and band stages with labeled fields/nested array editors; retain import/export with a resource-specific template and schema validation. Mock paper authoring must expose section/question fields and a new paper template rather than require existing seeded rows. Do not flatten all resource schemas into one storage format. New template content is explicitly draft/example content and cannot bypass publication qualification.

Bridge modules may have the same question type: use unique stable record slugs and retain existing published IDs. Orientation slide deletion only changes its draft; published versions and learner progress remain intact. Fixed seven-stage band topology and four integrated durations are configuration constraints, not missing course CRUD; label them as such and link the lesson content workspace. Do not invent new duration/band values or silently change learner progression.

Reuse role guards, revision checks, audit logs, transactions and parameterized queries. Removal must share the existing per-resource mutation locks and reject stale revisions. Bind confirmation with required `expectedAction` and reject a changed action after the locked read, since publication need not change the draft revision. Archive clears current publication, marks only current version archived and preserves all historical versions. Concurrent publication/removal cannot hard-delete published versions. No schema migration/new dependencies.

Admin navigation focuses on Intermediate and IELTS. Beginner/Foundation and TOEIC remain deferred and visibly unavailable; do not delete catalog records or alter learner enrollments.

## Verification

Behavior tests first: independent creation/edit/removal, same-type Bridge creation, stale revision and published-history protection; fields/import templates preserving resource schemas; dirty edit switching; error/loading states; bilingual labels; deferred navigation. Run focused tests, package lint/typecheck, representative full web suite, isolated build and read-only browser checks. API unit tests must not seed/migrate the configured database. Review the final diff independently. Save local commits with actual checks and limitations.
