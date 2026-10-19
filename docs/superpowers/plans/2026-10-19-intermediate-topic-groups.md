# Intermediate topic groups

User decision: one topic contains many lessons. Existing Intermediate lessons remain one passage and the admin-authored question set per session. AI only proposes duration; grouping never approves or publishes content.

Implementation choices delegated to the builder:
- Add topic groups (name, description, optimistic revision), editable by content/system admins. Delete a group without deleting its lessons; those become ungrouped.
- Assign saved topic imports, including drafts, from a dedicated group workspace. Group metadata has its own revision so changing groups cannot invalidate duration approval. A logical published lesson has one group across its versions. Publication copies an explicitly assigned/cleared draft group to the logical lesson; an untouched new import inherits the existing lesson group. Later reassignment updates related imports consistently.
- Preserve all existing content and eligibility checks. Learner listing adds optional group metadata only after eligibility filtering. Display a group selector then its lessons, with an explicit ungrouped option for old lessons. Existing server-random selection remains across all eligible lessons and is labelled accordingly.
- Add navigation, breadcrumbs, empty/error states, translated Vietnamese/English labels and narrow-screen layout. Do not create or publish example lessons or invoke AI.

Shared interface (backend owns contracts):
- `intermediateTopicGroupSchema`: `{id: uuid, name: string, description: string, revision: positiveInt, lessonCount: nonnegativeInt}`.
- `intermediateTopicGroupCatalogSchema`: `{groups: Group[], lessons: {importId: uuid, title: string, status: 'DRAFT'|'VALIDATED'|'PUBLISHED'|'ARCHIVED', groupId: uuid|null, revision: nonnegativeInt}[]}`. Actual content status enum must match existing database statuses.
- Inputs: create `{name,description}`; update `{name,description,expectedRevision}`; delete `{expectedRevision}`; assignment `{groupId: uuid|null,expectedRevision}`.
- Create/update return the saved Group; assignment/delete return the refreshed catalog. Delete callers may ignore the catalog and reload.
- `/admin/intermediate-topic-groups`: GET catalog, POST create; `/:id`: PATCH update, DELETE remove; `/lessons/:importId`: PUT assignment returning refreshed catalog.
- Existing learner topic DTO gains optional `group: {id,name,description}`. Session request and idempotency stay unchanged.

Execution:
1. Backend worker: contracts/tests, indexed Prisma relations/migration, admin CRUD/assignment, protected controllers, publication propagation, eligible learner metadata, focused tests. No migration apply, runtime restarts or commits by worker.
2. Main: failing UI behavior tests; typed client; admin workspace, navigation and learner grouping; focused UI tests.
3. Integrate: inspect backend diff, database backup then additive migration/generation, focused API/contracts plus web checks, real-page fixture smoke. Independent bounded review; resolve findings.
4. Record actual verification, stage explicit files, atomic local commit(s). No push or merge.

Acceptance: two lessons can share one group; moving/clearing/deleting groups preserves lessons and approval; drafts never leak to learners; group switching selects a lesson in that group; start sends the selected mission ID; unavailable topics and legacy sessions retain existing behavior.
