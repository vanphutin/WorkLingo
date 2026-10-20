# Published Intermediate topics on the learner dashboard

User decision: show every published Intermediate topic lesson, with its authored level. Keep active-program, publication, approval and prerequisite checks; topic sessions do not require matching the learner's progression level.

Evidence: published import 857e44a8-7b25-4646-9ec6-7236b11b897e has a published version and topic group, but no MissionLesson binding. Topic discovery currently queries only missions at FOUNDATION_1.

Plan:
1. Failing database regression: publication makes a topic discoverable and startable from a different current level. UI regression for authored level.
2. Atomically create a stable mission binding in a separate published Intermediate topic-library path. Reuse on republication. Query published Intermediate missions across levels for topic selection, retaining eligibility checks. Expose the source level as public metadata.
3. Display level, update empty-state wording, and backfill missing bindings of already published approved topics using the same helper. Preserve source, published snapshots, learner level and question counts.
4. Focused API/web tests, lint/types, real learner list and rollback-only session start; inspect diff and commit only this fix.

No provider calls or full-repository suite, per quota preference. Preserve concurrent UI work.

Completed: missing mission binding repaired for the published Restaurant lesson; future topic publications bind atomically. The library level is excluded from onboarding choices. Database stage durations now accept positive allocations up to 150 minutes, matching validated topic plans.

Verification: 45 focused API tests, 43 dashboard/picker web tests, 15 contract tests passed; touched-file lint, API/web types and API build passed. Final PostgreSQL regression additionally verifies exact stage minutes, stable binding reuse, exclusion from onboarding, and archived-topic removal. The actual signed-in dashboard shows Restaurants / A restaurant reservation / B1 / 60 minutes. A real learner session was started in a rollback-only transaction with allocations 5/20/15/20; learner level stayed FOUNDATION_1. No persisted learner session was added.

Follow-up completed: exact approved-duration filter (45/60/90/120/150), counts, empty state and automatic topic/lesson reselection. Random selection respects the filter; the server freezes it into the plan and rejects retries that change it. A filter never overrides the admin-approved duration. No matching lessons means no start/random controls, while the filter remains available.

Filter verification: 19 API tests (including real database publication/start), 45 web tests and 9 contract tests passed; API/web types, touched-file lint and API build passed. Inverting the duration predicate failed the UI regression; restoring it passed. The actual signed-in browser showed zero results for 120 minutes and the B1 Restaurant lesson for 60 minutes. A filtered random session was created in a rollback-only transaction, retaining the 60-minute filter and 5/20/15/20 allocations. Screenshot: .superpowers/topic-duration-filter.jpg (local verification artifact).
