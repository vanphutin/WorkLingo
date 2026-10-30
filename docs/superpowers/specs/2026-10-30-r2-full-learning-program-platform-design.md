# R2 Full Learning Program & Progression Platform

## Intent and scope

Extend the verified vertical slice into a platform for safe program evolution, enrollment administration, deterministic progression, review scheduling and aggregate analytics. The owner authorizes autonomous implementation, disposable migrations, qualification, commits and merge/push after gates. Production deployment and primary-data mutations are excluded.

## Reuse and boundaries

Retain Program → Path → Level → Mission → Lesson → Activity; Path/Level/Mission are existing grouping entities, not new parallel Stage/Unit models. Reuse CurriculumDefinition/CurriculumRevision authoring, AdminCurriculumCommandService, EvaluationService, MasteryService, ReviewScheduler, vocabulary IDs/provenance and Liquid Glass UI. Beginner permits A1–A2 vocabulary. Canonical Beginner/IELTS admission and unqualified grading guards remain in force.

## Release architecture

Add ProgramVersion with numbered identity, optimistic revision, lifecycle DRAFT → IN_REVIEW → APPROVED → PUBLISHED → RETIRED, metadata, ordered curriculum bindings and versioned policy snapshot. Draft edits never mutate published snapshots. Enrollment pins a ProgramVersion and retains compatibility UUID arrays. Published version creation validates exact curriculum/lesson/activity refs and prerequisite ordering. Retiring or rolling back changes new discovery only; existing pins and sessions remain valid.

The version snapshot stores stage/unit/title/order/objectives, duration/difficulty, vocabulary/resource references and progression/review policy. Existing authoring is the source for snapshots; preview resolves exactly what publication will pin. Duplicate creates a distinct program and draft with safe source references; it does not copy learner records.

## Enrollment and progression

Add ACTIVE/SUSPENDED/COMPLETED/WITHDRAWN enrollment status and append-only events with actor, time, reason, revision and old/new states. Existing single learner/program enrollment identity is retained, preserving history. Admin assigns a specific published version; learner self-enrollment selects the current published version. Both serialize on the learner profile, validate onboarding and eligibility and use receipts for retry safety. No implicit version upgrade is permitted.

Completion is activity evidence; mastery is qualified evidence; readiness is configured completion/mastery/review gates. A pure deterministic engine projects nodes in snapshot order, checks explicit prerequisite revisions plus sequential stage/unit requirements, selects resume before reviews/remediation/new learning, and emits explainable lock reasons. Missing evidence is unknown/pending, never zero. Recalculation saves append-only progression snapshots and never deletes completion evidence. Reading/listening deterministic evidence is distinct from unqualified AI results; R2 must not accept the latter as authoritative mastery.

Review scheduling is versioned and configured in the release. Review state/history is server-owned and updated from completed real learning sessions. Completing a review is not a mastery claim; mastered status requires qualified evidence. No second grading path or client-supplied scores are introduced.

## UI and analytics

Extend current Admin program/curriculum workspaces with lifecycle controls, visual exact-revision selection, preview, enrollment management and version comparison. Reuse vocabulary library queries to select existing lexical/sense IDs; preserve CEFR/source/provenance and reject duplicate associations.

Learners see enrolled programs and pinned version, stage/unit/lesson states, lock reasons, objectives, backend completion percentage, unknown mastery, upcoming/due reviews, estimated remaining workload, deterministic next action and durable resume. Use accessible EN/VI copy and responsive Liquid Glass components.

Analytics are aggregate-only, explicit UTC half-open date ranges bounded to 180 days, program/version scoped. Report enrollments, active/completed/withdrawn, completion distributions by curriculum/stage, skill evidence, retention, review backlog, assessment status and version comparisons with metric definitions. Do not export private learner data or invent numbers.

## Validation

Use meaningful public seams: pure progression/scheduling functions, strict contracts, authenticated API, and actual browser Admin/Learner workflows. Disposable PostgreSQL must prove migration/backfill, lifecycle/idempotency/concurrency/auth/privacy, exact version preservation, completion/unlock/resume/review/analytics and newer publication. Run Beginner and IELTS regression. External learner validation, expert phonetics and real-provider qualification remain deferred unless actually executed.

## Implementation calls

Use additive tables/fields, preserve legacy APIs and arrays, no new dependencies. Primary DB inspection is READ ONLY. Rollback disables new selection while preserving bound versions, sessions and historical evidence. Engineering completion does not imply production readiness.

### Builder-check resolutions

- Preserve explicit pathId/levelId/missionId fields. Display Level as stage, Mission as unit, and each ordered LessonVersion binding as a selectable lesson. A unit completes only when all required mapped lesson activities are complete.
- Extend targeted curriculum starts with optional lessonVersionId. Single-lesson requests stay compatible; multi-lesson requests without selection return LESSON_SELECTION_REQUIRED. Membership is checked against the enrolled revision; sessions still pin one lesson version. Aggregate objective evidence across completed sessions bound to that exact revision.
- Compatibility backfill applies only to nonempty generic program/enrollment pins. Group by program and ordered exact pins; source provenance is LEGACY_PIN_BACKFILL with capture timestamp and available metadata, not claimed historical metadata fidelity. Null/empty canonical enrollments retain their legacy path. Unresolvable references fail closed; do not silently choose current content.
- Engine evidence includes source DETERMINISTIC or AI, qualification QUALIFIED/PENDING/UNQUALIFIED, evaluation version and exact attempt/lesson/curriculum identities. Only deterministic grading or explicitly verified matching evaluator qualification can contribute authoritative mastery; AI defaults pending. Existing historical mastery is retained but not automatically authoritative for new R2 readiness.
- Re-enrollment never changes pins silently. An existing withdrawn/completed enrollment requires an explicit lifecycle transition retaining its release; reassignment to a different version is rejected while any learning history exists.
