# IELTS Phase 2 — Complete curriculum foundation architecture

Status: Scope and written design approved on 2026-10-13. Implementation plan awaiting review; implementation has not started.

## Intent and phase boundary

Complete all seven Phase 2 capabilities in the master prompt: curriculum schema, learning objectives, prerequisites, lesson templates, activity definitions, Admin authoring and progress tracking. The previous enrollment/context increment is a prerequisite, not completion of this phase.

Provide a usable administrator-driven foundation for beginner-to-IELTS curriculum without introducing a competing learning engine, resetting history, publishing unreviewed lessons or advertising IELTS as available. Phase 3 supplies the complete Grammar learning experience and subsequent pronunciation/vocabulary expansion. Phase 2 must nevertheless prove authoring, publishing, version isolation and evidence-based progress through a test fixture journey.

Local storage and PostgreSQL remain the deployment baseline. Verification uses isolated databases and fake adapters; restored external credentials must not be used by tests or committed. Do not change provider settings as part of this phase.

## Verified baseline and remaining gaps

The existing hierarchy is LearningProgram → LearningPath → Level → Mission → MissionLesson → Lesson → immutable LessonVersion. Content import already parses/validates plaintext, and published activities belong to a lesson version. Sessions bind immutable versions; attempts, evaluation, Language Block mastery and spaced review already exist. Enrollment holds program-specific current level and revision.

Mission and lesson objectives are currently descriptive text. Activities have four-skill classifications and response payloads; language blocks already contain grammar patterns/examples. The system lacks first-class versioned curriculum objectives, explicit curriculum prerequisite graphs, foundation lesson templates and an objective-oriented learner roadmap. Existing completion/checkpoint rules are not an arbitrary curriculum graph.

## Selected architecture

Extend the existing hierarchy and snapshot publication pipeline. Do not rename Mission to Module or migrate historical IDs. In the Admin UI, describe missions as curriculum units where helpful while preserving API identity.

Alternatives rejected: replacing the hierarchy would endanger session/history compatibility; an independent IELTS engine would duplicate authoring, audio and evaluation. Unvalidated JSON-only prerequisites would make ownership, graph validation and diagnosis unreliable.

### Curriculum metadata and objectives

Add a revision-controlled draft curriculum definition per mission. It owns stable objective identifiers, a foundation category and prerequisite references. A published curriculum revision is an immutable snapshot. Publishing binds that revision to exact published lesson versions and their objective mappings; ordinary learner sessions capture this binding when created.

An objective has a mission-scoped stable slug, learner-facing statement, skill tags, required/optional flag and explicit evidence mapping. Objective statement and requirements are versioned, not mutable attributes interpreted retrospectively. Categories are grammar, pronunciation, vocabulary, reading, listening, speaking and writing; they describe teaching intent, not a new scoring scale.

Keep descriptive objective strings for compatibility. Objective mappings identify exact activity slugs within a lesson version and any existing Language Block evidence references. Unknown mappings, duplicate objective IDs and required objectives without assessable evidence prevent publication.

Persist draft metadata and immutable published revisions separately, with uniqueness on mission/revision and appropriate foreign-key indexes. Use relational bindings for lesson-version and prerequisite references; snapshot JSON is schema-validated and used to preserve the published definition. Published revisions cannot be edited or deleted while referenced.

### Prerequisites

Initial prerequisite type: completion of another published curriculum unit in the same program, referencing an exact published curriculum revision. Required prerequisites are AND conditions; do not implement an expression language or optional OR groups in this phase.

Reject self-links, cycles, foreign-program links, missing references and unpublished targets. A later draft cannot become a prerequisite until it has a valid published revision. Serialize graph-changing publication within a program to prevent concurrent cycle-check races. Cap graph traversal and reject pathological definitions with a clear validation error.

A satisfied prerequisite remains satisfied for its pinned revision. New prerequisite definitions do not invalidate completed sessions. Historical resumes and owned submissions continue to work; prerequisites apply to new curriculum selection/session creation, not as a retroactive barrier.

Do not label learners B2, award a band or allow exam entry from completion alone. Verified skip/placement recognition requires a later explicitly designed evidence policy; self-confidence or uploaded certificate is not prerequisite evidence. The current onboarding/checkpoint behavior remains available and unchanged for legacy content.

### Lesson templates and activity definitions

Ship seven selectable, versioned authoring templates corresponding to the categories above. Each includes objectives, explanation/context, examples, guided practice, independently answerable practice, feedback explanation and review mappings. Pronunciation/listening templates include script/audio requirements; speaking/writing require the existing supported rubric/evaluation contract.

Template selection creates editable plaintext, not a published lesson. Incomplete template scaffolds must fail validation with actionable source positions. Admin fills content and answer/evidence fields; templates never fabricate an assessment or publish placeholder material.

Use existing reading/listening/speaking/writing activity types and multiple-choice/short-text/shadowing responses. Add versioned pedagogical metadata and objective references, not new execution types without players. Validate response-specific payloads, content/audio/Language Block/objective references and explanation/evidence requirements. Reuse existing duration/four-skill mission playability policy instead of silently weakening it for a standalone lesson.

Introduce an explicitly versioned plaintext extension for objective mappings and foundation metadata. Retain Format 1.0 parsing/publication for existing lessons. Old snapshots/contracts accept absent new metadata and use legacy behavior; new foundation definitions require the new schema. Publish freezes metadata together with activity payloads and audio bindings.

### Admin workflow

Extend the existing curriculum/content workspaces rather than creating another Admin application. Admin can manage curriculum definitions/objectives, choose and populate lesson templates, attach published lesson versions, set prerequisites, inspect graph validation and preview the prospective published unit.

Lifecycle: draft → validated → published → archived. Validation is invalidated whenever source, mappings, dependencies or draft revision changes. Publish checks current revisions and all relationships again within its transaction. Archive retains historical references and is blocked when it would create an unavailable dependency for a current published definition, following existing safe archive policy.

All commands are Admin-only, use strict shared contracts, expectedRevision and existing idempotency conventions. Emit safe audit metadata with IDs/revisions, never lesson answers, learner text, recordings or provider secrets. Update existing tree responses additively; preserve existing CRUD routes.

### Learner progress and availability

Add a learner-only curriculum roadmap endpoint scoped to the active enrollment/program. Return published units only, their pinned curriculum revision, objectives, availability state and structured unmet-prerequisite reasons. Define states: locked, available, in_progress and completed. Review due is a separate derived indicator; do not equate a missing attempt with failure.

Progress is computed from owned, persisted session/attempt/evaluation evidence, not a client-supplied completion flag. Pending evaluations remain pending; failed or absent evidence cannot satisfy an objective. Reuse the current evaluator/mastery policy and persist the policy identity with evidence instead of inventing new proficiency thresholds. Completing objectives does not directly advance an enrollment or bypass the existing checkpoint confirmation.

Completion receipts bind enrollment, mission, published curriculum revision and qualifying evidence. Write them idempotently only after required mappings are satisfied; transaction/concurrency protections prevent duplicate or partial completion. One session contributes only to its captured curriculum revision. A completed older revision remains visible in history but does not implicitly complete changed objectives in a newer revision.

Expose required objectives and progress in existing learner surfaces with loading, empty, error and retry states. Explain locked content accessibly. New session selection checks the same server policy as the roadmap, including direct requests; clients cannot choose another learner/enrollment or forge evidence. Historical sessions without a curriculum binding retain legacy behavior and are not bulk backfilled with invented completion.

## Migration and operational safety

All migrations are additive. Preserve existing path/level/mission/lesson/session/attempt/enrollment identifiers and published snapshots. New fields on old sessions are nullable; do not manufacture objective outcomes from existing scores. Existing content remains selectable under legacy rules unless an Admin explicitly publishes a new curriculum definition.

Before applying a migration to the user database: preserve a verified local backup and run isolated migration rehearsal. Test rerun/deploy behavior, referential integrity, failure atomicity and rollback strategy. Rollback disables the new capability while retaining newly collected evidence; destructive table removal is not the default recovery path.

Do not change availability flags to open IELTS automatically. No mass content generation, live provider requests, dependency upgrade, cloud integration or production deployment belongs to this phase.

## Implementation slices and focused verification

1. Data model/contracts: draft definitions, objectives, published revision bindings and completion receipts; additive migration preservation and relationship tests.
2. Publication/prerequisites: revision/idempotency policy, graph validator, transactional publication and version isolation; unit plus targeted PostgreSQL integration tests.
3. Format/templates: backward-compatible parser/AST/normalizer extension, objective/reference validation and seven usable scaffolds; parser, source mapping, contract and snapshot tests.
4. Admin surfaces: objectives, dependencies, template creation, preview/validation/publish; focused component/API tests, role rejection and stale mutation coverage.
5. Learner roadmap/progress: authoritative availability, session binding, evidence completion and resume; scoped API/integration/component tests and unchanged legacy journey coverage.
6. Final review: one desktop/mobile Admin → publish → learner session → persisted objective progress journey, affected-package type/lint checks and final composed release verification.

Run red/green tests at each behavior seam. Do not rerun the entire repository suite after every small change. A final broad gate is required for this cross-cutting phase; disclose any unrelated failures and the actual commands/results. Review the diff before commit/push/merge under the authorized Git workflow.

## Acceptance criteria

All seven Phase 2 areas must be implemented, not merely documented. Admin can author each category from a template, define measurable objectives, link evidence/prerequisites, validate and publish an immutable curriculum revision. Missing required data, broken references, cycles, ownership violations and stale requests produce actionable failures with no partial writes.

Learners see only their program's published eligible content; direct new-session requests cannot bypass locks. Submissions and evaluations produce persisted objective progress, retries do not duplicate completion, reload/resume preserves the captured definition and newer publication cannot alter an existing session. Existing onboarding, placement, audio preferences, checkpoint/mastery/review and old sessions continue to work.

Tests prove migration preservation, graph/concurrent publication safety, source-location diagnostics, template completeness, Admin/learner authorization, objective-evidence ownership, pending/failed evaluation behavior, publication isolation and desktop/mobile accessibility basics. No Critical/Important review finding remains unresolved. This phase does not claim educational calibration or complete IELTS learning.
