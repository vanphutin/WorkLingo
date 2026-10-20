# Intermediate Topic Learning Implementation Plan

> **For agentic workers:** Follow the scoped task ownership below with TDD; one final independent review. The user delegated implementation choices and requested token economy. Continue without another design/execution questionnaire.

**Goal:** One source passage per Intermediate topic/session, human-approved AI duration proposals, learner chosen/random topics.
**Architecture:** Extend existing import/publication/snapshot/session flow; isolated review table and optional topic snapshot metadata preserve legacy behavior.
**Tech Stack:** Existing NestJS/Prisma/PostgreSQL, Zod, Next.js/React, Vitest. No new dependencies.
**Spec:** `docs/superpowers/specs/2026-10-19-intermediate-topic-design.md`.

## Constraints and ownership

Parent owns contracts, topic source model/editor/navigation/client and learner picker, docs and integration. One backend worker owns apps/api changes and migration only. No worker agents, commits, full suites, live AI/DB writes, server restarts, or dependency changes. Parent applies an additive migration only after review/backup. Existing checkout/branch retained. One final reviewer; no reviewer per task.

## Shared interfaces

Contracts `intermediate-topics.contracts.ts`:
- `topicAllocationSchema`: `{type: activate|readDecode|listenReason|respond, targetMinutes: positive integer <=150}`.
- `topicPlanSchema`: `{durationMinutes:45|60|90|120|150, allocations: four canonical allocations}`; sum equals duration.
- `topicReviewRequestSchema`: `{expectedDraftRevision:number, expectedSourceHash:string, expectedReviewRevision:number}`.
- `approveTopicSchema`: request + `plan:TopicPlan`.
- `topicReviewSchema`: `{importId, revision, status:none|proposed|approved|stale, proposal:{plan,rationale,provider,model,simulation}|null, approval:{plan,approvedById,approvedAt}|null}`.
- `learnerTopicSchema`: `{id:mission UUID,title,lessonVersionId,durationMinutes}`.
- `createTopicSessionSchema`: `{clientSessionId:UUID, topicId?:mission UUID}`; absent means random.
- `approvedTopicSnapshotSchema`: TopicPlan + `{sourceContentRef,approvedById,approvedAt}`.
- `sessionPlanSchema` optional `kind:'topic'`, `topicSelection:chosen|random`; topic has four canonical blocks of variable positive minutes, legacy retains canonical 15-minute blocks. No answers added to public contracts.

HTTP (existing /api/v1 prefix):
- GET `/admin/intermediate-topics/:id/review` -> topicReviewSchema.
- POST `/admin/intermediate-topics/:id/propose` body topicReviewRequestSchema -> review; AI only proposes.
- POST `/admin/intermediate-topics/:id/approve` body approveTopicSchema -> review; human RBAC only.
- GET `/intermediate-topics` -> learnerTopicSchema[].
- POST `/intermediate-topics/sessions` body createTopicSessionSchema -> existing LearningSessionDto.

Topic source: existing Format 1.0, `[LESSON] program: intermediate`, `category: reading`, `authoring_template: intermediate-topic-v1`. Central content slug workplace-reading. Audio and workplace-dialogue duplicate that exact passage; reading/listening question evidence references the same lines. `create/read/serializeIntermediateTopicLesson` reuse existing lesson-model with strict template/round-trip checks.

## Tasks

### 1. Contracts and source model — parent
- [x] Tests RED for bad totals/order/duration, proposal cannot include approval; legacy/topic session invariants; one-source audio round-trip and custom-source refusal.
- [x] Add contracts/export, topic serializer/reader, allow new template in content-format validator. Preserve old format/category reader behavior.
- [x] Focused contract/format/model tests GREEN, then explicit-file commit after review.

### 2. Backend review, publication, learner session — worker
- [x] Read spec/plan, applicable Nest/Postgres/TDD/Git skills; inspect existing mutation/publication/session boundaries. Record bounded RED/GREEN evidence in ignored `.superpowers/topic-backend-report.md`.
- [x] Add `IntermediateTopicReview` keyed by contentImportId (FK cascade), revision, sourceHash, draftRevision, proposal JSON nullable, approvedPlan JSON nullable, approvedById/approvedAt nullable, updatedAt. Prisma validate/generate and additive SQL migration; do not apply or seed.
- [x] New `intermediate-topics` module/controller/services and AI proposal adapter using existing config/provider HTTP helper. Strict schema/RBAC/rate limits. Snapshot-hash and review-revision checks after provider returns; row locks/optimistic checks prevent stale review writes. Manual approval validates source completeness and four-skill activity coverage.
- [x] Content publisher requires matching human approval for topic template under import lock; snapshot freezes approved plan. Add optional snapshot metadata to curriculum schema; topic planner schedules every activity once and uses approved allocations. Legacy behavior unchanged, generic start cannot bypass approved topic duration. Fix DTO reconstruction currently hardcoding targetMinutes 15.
- [x] Learner endpoints filter current Intermediate context/level/published/eligible topics before explicit selection/randomInt; lock learner for creation and preserve UUID idempotency including chosen/random mode. Session creation includes selection mode in frozen plan. No extra Mission/Topic created or guessed.
- [x] Focused tests RED/GREEN for stale AI result, stale approval, AI cannot approve, RBAC controller boundary, publish gate, all-activity topic plan, availability duration, chosen/random filtering and retry. Unit mocks only; no existing integration harness. Scoped lint/typecheck and report changed paths; no frontend/contracts edits.

### 3. Admin and learner interfaces — parent
- [x] Add API client with response schemas, topic list/new/id routes, primary admin topic entry; old category tools remain accessible as legacy.
- [x] Extend Intermediate editor in topic mode: one passage, language blocks, reading/listening questions, same-passage narration, speaking/writing/activation. Saved topic shows review pane; dirty state disables review, revision/error handling preserves input, published read-only.
- [x] Review pane shows AI reason/simulation, editable duration/four allocations, separate human Approve action. No automatic call, approval or publication. All text EN/VI.
- [x] Learner topic picker lists available topics/duration and offers chosen or random start, preserves client UUID on retry and prevents duplicate clicks. Integrate without breaking resume or legacy sessions.
- [x] Component tests RED/GREEN for topic create/save destination, source binding, approval not automatic, conflicts/unmount, chosen/random/retry; focused lint/types.

### 4. Final verification and delivery — parent
- [x] One independent diff review; fix required findings with regressions. Freeze all code before final builds/browser checks; no concurrent mutation experiment.
- [x] Relevant unit/contract/format suites, web/API lint/typecheck/build, i18n, final full web suite once due cross-cutting changes. Browser fixture smoke EN/VI, mobile/desktop, admin review and learner selection; no live AI/content publication.
- [x] Backup configured local database, apply additive migration if safe and required, restore running app. Document actual DB/test boundaries and any remaining blocker.
- [x] Update authoring docs and verification report, commit explicit files locally. No push/merge.

## Review focus

Untrusted AI JSON/prompt instructions never grant approval; concurrent source/review edits cannot approve stale content; long AI requests cannot overwrite a later human approval; learner UUID retries cannot change topic/mode; legacy snapshots and active session checkpoints retain original behavior.
