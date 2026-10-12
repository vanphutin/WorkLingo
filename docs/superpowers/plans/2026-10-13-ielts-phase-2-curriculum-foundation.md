# Complete IELTS Phase 2 Curriculum Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended here to minimize quota) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver all seven Phase 2 capabilities while preserving existing learning history and workflows.

**Architecture:** Extend current curriculum and immutable lesson/session snapshots. A curriculum definition is authored per mission, published as an immutable revision and resolved within the learner's enrollment. Existing evaluation/mastery supplies evidence; completion never replaces checkpoint progression.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod shared contracts, Next.js/React, Vitest and Playwright; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-ielts-phase-2-curriculum-foundation-design.md` (user approved 2026-10-13).

## Global Constraints

- All migrations are additive; preserve historical identifiers, snapshots and enrollment levels.
- Local storage and PostgreSQL remain the deployment baseline.
- No competing learning engine, mass content generation, unreviewed publication or automatic IELTS availability.
- Tests use isolated databases and fake adapters; never read restored provider keys into test fixtures or call live providers.
- Legacy Format 1.0/content/session behavior stays supported when new metadata is absent.
- Admin mutations require role checks, expectedRevision and existing idempotency conventions; stage only task-owned files.
- Focused tests during implementation; final broad verification once after review fixes, unless new evidence requires a repeat.

## Review Focus

1. Shared lessons used by different missions: objective progress must use the session's captured mission/revision (Task 6).
2. Late evaluation after republish/archive: evidence updates only the frozen revision; resume still works (Tasks 5–6).
3. Two Admins publish graph mutations concurrently: serialize and reject invalid dependencies without partial writes (Task 2).
4. Imported text uses CRLF/BOM/Vietnamese: diagnostics still identify the exact source range (Task 3).
5. Archived prerequisites or stale browser tabs: explain unavailable content and do not silently complete/unlock it (Tasks 2, 7).

## Shared interfaces and file ownership

Add `packages/contracts/src/curriculum-foundation.contracts.ts` and export it through `index.ts`. Categories: `grammar | pronunciation | vocabulary | reading | listening | speaking | writing`.

`CurriculumDefinitionInput`: `{ category, objectives: [{ slug, statement, skills, required, evidence: [{ lessonVersionId, activitySlug, languageBlockSlugs }] }], prerequisiteRevisionIds: string[] }`. `skills` uses the existing four-skill enum; arrays/strings must be nonempty where required. Reject extra fields and duplicate slugs/references. Scope evidence to exact published lesson versions attached to the mission. No client learnerId, pass flag or computed score.

`CurriculumRevisionDto`: `{ id, missionId, revision, category, objectives, prerequisiteRevisionIds, status }` without answer payloads. `CurriculumRoadmapDto`: `{ programId, enrollmentId, units: [{ missionId, curriculumRevisionId, state, unmetPrerequisites, objectives, reviewDue }] }`. State values: `locked | available | in_progress | completed`.

`FoundationCurriculumService`: `getDraft(missionId)`, `saveDraft(missionId, input, expectedRevision, idempotencyKey)`, `validateDraft(missionId, expectedRevision)`, `publishDraft(missionId, expectedRevision, idempotencyKey)`, `archiveRevision(id, expectedRevision, idempotencyKey)`. Use existing actor/audit conventions; transactions are internal.

`CurriculumEligibilityService.resolve(learnerId, missionId, transaction?)` returns `{ revisionId: string | null, available: boolean, reasons: string[] }`. Null means legacy behavior, not fabricated completion. `CurriculumProgressService.projectSession(sessionId, transaction?)` idempotently derives progress from stored evidence; `getRoadmap(learnerId)` returns the shared DTO.

Keep definition/publication, graph validation, eligibility and progress in separate focused files under `apps/api/src/curriculum-foundation/`. Do not enlarge the existing Admin service with all new domain logic.

### Task 1 — Schema, immutable bindings and strict contracts

**Files:** modify `apps/api/prisma/schema.prisma`, `packages/contracts/src/index.ts`; create `packages/contracts/src/curriculum-foundation.contracts.ts`, matching `.spec.ts`, `apps/api/prisma/migrations/<timestamp>_curriculum_foundation/migration.sql`, `apps/api/test/integration/curriculum-foundation-schema.integration.spec.ts`.

**Interfaces:** Create `CurriculumDefinition` (unique missionId, draft revision/status/content), `CurriculumRevision` (unique missionId/revision, immutable snapshot, publication/archive state), `CurriculumRevisionLesson` and `CurriculumPrerequisite` relational bindings, and `CurriculumCompletion` (unique enrollmentId/curriculumRevisionId, evidence snapshot). Add nullable `LearningSession.curriculumRevisionId`. Restrict referenced deletion, index foreign keys, cascade learner-owned receipts only through enrollment deletion. Immutable rows permit lifecycle archive metadata, never snapshot changes.

- [ ] RED: tests reject unknown fields, duplicate objective slugs, invalid skill/category and empty required evidence; schema rehearsal preserves old IDs/counts and leaves old session binding null.
- [ ] Run `pnpm --filter @worklingo/contracts exec vitest run src/curriculum-foundation.contracts.spec.ts` and API schema test; confirm the intended missing-schema failure, not infrastructure failure.
- [ ] GREEN: implement contracts, additive schema/migration and database constraints; generate Prisma client with the existing command. Do not deploy to the user database yet.
- [ ] Run the same two focused files; require zero failures and historical preservation assertions.
- [ ] Commit explicit schema/migration/contract/test files: `feat: add versioned curriculum foundation schema`.

### Task 2 — Admin domain publication and prerequisite graph

**Files:** create `apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts`, `domain/prerequisite-graph.ts`, `domain/prerequisite-graph.spec.ts`, module/controller/DTO files; modify existing Admin module wiring; create `apps/api/test/integration/curriculum-foundation-admin.integration.spec.ts`.

**Interfaces:** Produce the FoundationCurriculumService methods above and Admin-only routes under `/api/v1/admin/curriculum/missions/:missionId/foundation`: GET/PUT draft, POST validate/publish; archive at `/api/v1/admin/curriculum/foundation-revisions/:id/archive`. Mutations carry `expectedRevision` and `idempotencyKey`; use 409 revision/idempotency conflicts and 422 invalid definitions. Validation issues have code/path/message. Bound definitions to 50 objectives, 50 prerequisites and a 1000-node traversable program graph; reject excess, do not truncate silently.

- [ ] RED: `rejects_self_cycle_foreign_and_unpublished_dependencies`; `rejects_evidence_outside_attached_published_versions`; `concurrent_publications_do_not_bypass_graph_validation`; `archive_cannot_break_current_dependents`; `rejects_learner_and_stale_mutations_without_writes`.
- [ ] Run graph spec and Admin integration file; observe missing service/routes failures.
- [ ] GREEN: validate all references, acquire a program-level database transaction lock before graph-changing publish/archive, re-read draft/current dependencies, publish relational bindings+snapshot+audit atomically. Source/mapping/dependency edits invalidate validation. Preserve idempotent replay.
- [ ] Run graph/Admin tests plus affected `admin-curriculum-commands.integration.spec.ts`; require unchanged legacy Admin behavior.
- [ ] Commit task-owned files: `feat: publish validated curriculum definitions`.

### Task 3 — Format 1.1 metadata and seven templates

**Files:** modify `packages/content-format/src/ast.ts`, `parser.ts`, `normalizer.ts`, `validator.ts`, their specs and exports; create `foundation-templates.ts`/`.spec.ts`; modify `apps/api/src/curriculum/domain/curriculum.types.ts` and content-authoring normalization/publication adapters as needed; extend `docs/LESSON_FORMAT.md`.

**Interfaces:** `getFoundationTemplate(category): { id: string, version: 1, source: string }`. Format 1.1 adds `[foundation]` category/template_id/template_version, `[objective:<slug>]` statement/skills/required and `objective_refs` on activities. These references are lesson-local and must be mapped explicitly by Admin to mission objectives; no implicit cross-lesson slug matching. Reuse Format 1.0 sections/payloads unchanged. Preserve normalized foundation metadata in published snapshots when present.

- [ ] RED: `parses_11_metadata_and_preserves_10`; `diagnostics_preserve_crlf_bom_vietnamese_ranges`; `rejects_unknown_or_unassessed_required_objectives`; `all_seven_scaffolds_are_editable_but_unpublishable_until_filled`; publish integration asserts metadata survives normalization and snapshot round-trip.
- [ ] Run `pnpm --filter @worklingo/content-format test` and focused snapshot/publication test; inspect intended failures.
- [ ] GREEN: add bounded parsing/normalization and reference validation, template scaffolds with explicit incomplete fields, response-specific feedback/evidence checks for new format. Missing metadata follows legacy behavior. Require explanations and assessable evidence, not placeholders.
- [ ] Rerun content-format tests plus `content-publish.integration.spec.ts`; require zero failures and unchanged Format 1.0 fixtures.
- [ ] Commit explicit files: `feat: add foundation authoring format and templates`.

### Task 4 — Admin authoring and preview UI

**Files:** create `apps/web/src/lib/api/curriculum-foundation-client.ts`/`.test.ts`, `apps/web/src/features/admin-curriculum/foundation-definition-editor.tsx`/`.test.tsx`; modify existing curriculum workspace, content import/authoring workspace, lesson preview and corresponding tests.

**Interfaces:** Client wraps Task 2 routes with strict request/response parsing and existing authenticated transport. Editor manages objectives, evidence mappings and prerequisite revision selection. Content import exposes seven template choices; preview shows pedagogy/objective metadata, never a fake published state.

- [ ] RED: selecting template fills editable source; source edit invalidates validation; missing mappings show actionable errors; stale save preserves user's unsaved form and offers refresh/retry; publish awaits successful server response; keyboard/mobile controls are labeled.
- [ ] Run the new client/editor tests and affected authoring tests with `pnpm --filter @worklingo/web exec vitest run <exact touched test paths>`.
- [ ] GREEN: implement UI using existing styles/components, pending double-submit guards, revision-aware commands and loading/empty/error/retry handling. Do not overwrite stale unsaved source automatically.
- [ ] Rerun the same focused tests plus existing curriculum-workspace tests; require zero failures.
- [ ] Commit task-owned files: `feat: expose foundation curriculum authoring`.

### Task 5 — Authoritative eligibility and frozen session binding

**Files:** create `apps/api/src/curriculum-foundation/application/curriculum-eligibility.service.ts`; modify `apps/api/src/curriculum/application/curriculum.service.ts`, `apps/api/src/learning-sessions/application/learning-sessions.service.ts`, module wiring; create `apps/api/test/integration/curriculum-foundation-eligibility.integration.spec.ts`.

**Interfaces:** Produce `resolve` above; session creation captures the published curriculum revision and exactly its published lesson bindings under the existing learner/profile lock. Existing planner selects supported activities within that binding. Archived/unpublished/unplayable dependencies fail with structured availability reasons; legacy missions without definitions retain old resolution. Roadmap and direct creation must share this resolver.

- [ ] RED: completion unlocks an exact pinned prerequisite; foreign enrollment evidence cannot unlock; direct session creation cannot bypass locks; republish does not change a created session; archived old session still resumes; binding reads reject snapshot/version mismatch; legacy session selection remains unchanged.
- [ ] Run eligibility integration plus `program-learning-boundaries.integration.spec.ts` and existing session ownership tests.
- [ ] GREEN: resolve prerequisites from persisted receipts, not browser flags; capture binding atomically with session creation and validate existing four-skill/time playability. Reject unavailable new content without rewriting older sessions.
- [ ] Rerun the same files; require zero failures.
- [ ] Commit explicit files: `feat: enforce curriculum eligibility on new sessions`.

### Task 6 — Evidence-derived objective progress and completion

**Files:** create `apps/api/src/curriculum-foundation/application/curriculum-progress.service.ts`, `domain/objective-evidence-policy.ts`/`.spec.ts`, learner controller; modify session submission and Teacher AI evaluation completion wiring; create `apps/api/test/integration/curriculum-foundation-progress.integration.spec.ts`.

**Interfaces:** Produce `projectSession` and `getRoadmap`. GET `/api/v1/me/curriculum-roadmap` is authenticated LEARNER-only. Receipts pin curriculum revision and owned qualifying evidence IDs/policy identity. Objective evidence uses existing scoring/evaluation policy, requires every mapped activity's supported passing evidence and any mapped Language Block mastery requirements; missing/failed/pending outcomes never pass. Read the existing policies before coding and reuse their functions rather than introducing new thresholds.

- [ ] RED: `pending_failed_and_missing_evidence_never_completes`; `duplicate_projection_writes_one_receipt`; `late_evaluation_updates_old_revision_only`; `shared_lesson_cannot_complete_another_mission`; `foreign_session_or_enrollment_never_contributes`; `completion_does_not_advance_level_or_bypass_checkpoint`.
- [ ] Run policy/progress tests; observe missing projection failure.
- [ ] GREEN: project from stored submission/evaluation evidence in the existing completion transaction where possible; invoke projection when durable evaluation succeeds. Derive roadmap states from active enrollment and captured bindings, omit draft content, return safe progress only. Existing scheduled Language Block review remains authoritative for reviewDue; do not create a second scheduler.
- [ ] Rerun progress tests plus `mastery.integration.spec.ts` and `progression.integration.spec.ts`; require zero failures and unchanged checkpoint semantics.
- [ ] Commit task-owned files: `feat: derive curriculum objective progress from evidence`.

### Task 7 — Learner roadmap and progress UI

**Files:** create `apps/web/src/features/curriculum-roadmap/curriculum-roadmap.tsx`/`.test.tsx`, learner API client tests; modify existing dashboard/session objective presentation and corresponding tests, existing learner routing only where needed.

**Interfaces:** Consume CurriculumRoadmapDto; render locked/available/in_progress/completed, required objective progress and separate reviewDue indicator. No answer keys or client pass flags. Resume links follow existing owned session flow; do not send old sessions through new eligibility checks.

- [ ] RED: locked card explains unmet prerequisite; loading/empty/retry surfaces work; updated publication shows new revision without erasing history; stale browser selection receives actionable rejection; keyboard/mobile navigation works; pending evaluation is never labeled complete.
- [ ] Run new roadmap/client tests and touched dashboard/session tests.
- [ ] GREEN: integrate roadmap/required-objective display using existing responsive styles, server-authoritative states and explicit retry. Avoid extra sequential data requests when existing context can be fetched in parallel.
- [ ] Rerun the same test files; require zero failures.
- [ ] Commit explicit files: `feat: display foundation curriculum progress`.

### Task 8 — Full Phase 2 acceptance and handoff

**Files:** create `apps/web/e2e/curriculum-foundation.spec.ts`; update `docs/API_CONTRACTS.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `IMPLEMENTATION_ROADMAP.md`; create `docs/IELTS_PHASE_2_CURRICULUM_REVIEW.md`.

- [ ] RED: desktop/mobile journey: Admin chooses template, fills valid content, publishes lesson and definition, learner sees eligible unit, starts/submits/resumes, receives persisted objective progress, completes required evidence, unlocks pinned dependent unit. Publish a newer revision and assert prior session/history isolation. Use test-owned reviewed fixtures, not production seeds or live providers.
- [ ] Run `pnpm --filter @worklingo/web exec playwright test e2e/curriculum-foundation.spec.ts`; investigate the first actual failure.
- [ ] GREEN: fix only missing wiring exposed by the journey; keep IELTS unavailable and old content unaffected.
- [ ] Rerun the journey plus the existing program catalog E2E; require desktop/mobile success.
- [ ] Self-review spec coverage against all seven capability areas; request one independent whole-branch review, resolve Critical/Important findings with targeted regression tests, document deferred findings.
- [ ] Run affected lint/typecheck and one final `pnpm verify`; disclose literal exit status. If an unrelated fixture fails, repair only justified fixture assumptions and explicitly record focused retry plus remaining gates; never call an exit-1 command passing.
- [ ] Before any user database migration, run local backup/recovery rehearsal and verify the backup; do not apply migrations merely to write the plan or run isolated tests.
- [ ] Commit explicit final docs/tests, push/create PR/attach it, merge only with verified clean integration state under existing user authorization. Preserve unrelated `.agents`, `AGENTS.md`, `skills-lock.json`, `.env` and any external edits.

## Plan self-review and execution choice

Coverage: schema/objectives (1–2), prerequisites (2/5), templates/activity definitions (3), Admin authoring (4), progress tracking (5–7), compatibility/verification (8). Every review-focus failure mode has named tests in its owning task. Native execution is recommended: tasks share contracts and publication/session bindings, so fresh implementer context per task adds cost without removing dependency sequencing.

Status: Written plan awaiting user review and execution confirmation. No implementation code has been changed.
