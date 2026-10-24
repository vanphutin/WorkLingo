# Beginner R1.2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after matching human approval. Steps use checkbox (`- [ ]`) syntax for tracking. This document authorizes no execution.

**Goal:** Provide isolated Beginner Admin authoring, learner-safe preview and fixture test-release verification, without opening learner access or claiming content readiness.

**Architecture:** Reuse Program/Path/Level/Mission/MissionLesson, ContentImport, immutable LessonVersion, CurriculumDefinition/Revision, AuditLog and MutationReceipt. Add a Beginner-specific orchestration/policy layer; shared commands retain legacy defaults. The 20-Unit/80-Lesson editorial tree and planned videos are versioned metadata, not persisted lessons/resources.

**Tech Stack:** Existing NestJS, Prisma/PostgreSQL, Zod contracts, Next.js/React, Vitest and Playwright; no new dependencies or schema changes.

**Spec:** [Knowledge Map](../specs/2026-10-24-beginner-knowledge-map.md), [Video Production Plan](../specs/2026-10-24-beginner-video-production-plan.md), [refinement](../specs/2026-10-24-beginner-final-refinement.md).

## Global constraints

- Scoped detail of [master plan R1.2a](2026-10-24-beginner-implementation.md#r12a--admineditorvalidationpreview-và-test-registry), not another backlog. Preserve the master plan byte-for-byte because verified R1.1 binds its hash.
- Parent MND-20261024-001 remains captured/approval=null. Predecessor MND-20261024-002 remains verified with its approval/verification unchanged. Capture a distinct child with owner Codex; no approval inferred.
- This preapproval task changes documents/register only. Later software execution and test-environment/data permissions are separate gates; no DB connection/provisioning/migration/seed/import/publication now.
- R1.2a uses synthetic fixtures and fake providers only. No R1.2b content/audio production, R2 admission/resolver/roadmap, R3/R4 resources/player, real providers, migration files, learner availability changes, production writes, merge/push/deploy.
- Exact implementation paths are enumerated in [scope lock](../../../mandate/reports/2026-10-24-beginner-r12a-scope.json). No wildcard or implicit test/config allowance. Stop for renewed scope/hash approval if another path is necessary.
- Existing format1.2 parser, planner, manifest hash and rubric dispatch are consumed, not rewritten. Historical 1.0/1.1/Intermediate/IELTS defaults remain unchanged.
- Pilot planner remains 45 minutes, three 15-minute blocks and 3R/3L/1S/1W assessed activities per Lesson. Neither a fixture nor an activity count proves 45-minute pedagogy; R1.2b requires real audio, reviewer and timed rehearsal.

## Review focus

1. Generic content/curriculum/audio endpoints or a forged request context must not bypass the scoped Beginner policy; deny before writes/jobs.
2. Draft source/slug, MissionLesson bindings or program ancestry changing between review and publish must invalidate approval; lock and recheck within the write transaction.
3. Learner-mode preview must not receive answer keys or create learner state, including speaking recorder uploads, analytics mutations and draft autosave.
4. Valid superseded V1 remains published/resolvable for historical pins; never substitute V2 or unarchive a withdrawn version. R2 owns enrollment/start binding.
5. Test configuration must not inherit production database/storage/provider settings; fixture approval never implies production approval or CONTENT_READY.

## Proposed boundaries and UI semantics

These are implementation choices proposed for approval, not existing code or product approval.

| UI state | Authoritative evidence | Consequence |
| --- | --- | --- |
| PLANNED | Editorial code only; no ContentImport/LessonVersion | Read-only curriculum/slot metadata; an explicit authoring action may create only the selected draft |
| DRAFT | ContentImport DRAFT and revision/source hash | Editable source/structured fields; changing assessed content invalidates validation/review |
| VALIDATED | Existing VALIDATED status with matching source/validation hashes plus Beginner checks | Technical validity only; no auto review/publication |
| REVIEWED | AuditLog review record for exact target, source/validation/snapshot/audio selection hashes and policy version | Display a separate review badge; no new ContentStatus enum; fixture review labelled technical only |
| PUBLISHED | Actual PUBLISHED LessonVersion, matching publication receipt and curriculum binding | Technical publication in approved test environment only; contentReadiness stays FIXTURE_ONLY |

Program → two Paths → five Stage/Level nodes → 20 Unit/Mission → 80 editorial Lesson codes. Overlay only exact existing IDs/bindings; do not use slug alone to infer ownership. Show G/P/V inventory separately from can-do objectives and R/L/S/W evidence. Hard prerequisites reference exact published CurriculumRevision IDs after publication; planned H codes remain editorial and cannot unlock anything. Recommended order remains non-blocking. Views show real status and planned placeholders separately, never fabricate progress or readiness.

Planned video metadata: editorial code, type, purpose, lesson codes/slot, outline, exercise references, language/caption plan, production=NOT_STARTED and reuse notes from the existing production plan. No resource/version ID, asset URL, fake duration/checksum, upload/player or independent completion. Unplanned vocabulary/practice-video filters show an honest empty state; do not invent production entries to fill categories.

The new editor uses Format1.2 source as the authoritative draft with structured section controls for objectives, theory/instructions, examples, WordBank, R/L/S/W, guided_response, min_words, rubric id/version, audio scripts and evidence. Round-trip through the existing parser/normalizer; unknown/invalid sections remain visible and block validation, never silently drop text. Save and validate are explicit actions. Reuse FoundationDefinitionEditor via an optional typed client adapter (legacy adapter default), not generic unrestricted commands from the Beginner workspace.

## Controlled authoring and transactions

New Admin API namespace: `/admin/beginner`. Frontend uses existing AdminLayout and roles CONTENT_ADMIN/SYSTEM_ADMIN; backend checks the same authenticated roles independently. Neither role alone authorizes data writes without a verified environment capability. Learner/teacher/anonymous requests get 401/403, including direct URLs/API calls. Read-only editorial data is Admin-only.

`BeginnerAuthoringPolicy.authorize(actor, command, target, tx)` returns a server-created opaque `BeginnerAuthoringContext`; never deserialize it from a body/header. Context authenticity must be checked at runtime (private factory/provenance), not only a TypeScript brand. Consumes a validated environment permission envelope, program ID and allowed action set. Every command binds environmentId, programId, pathId, levelId, missionId, lessonId/importId where present. Re-query full ancestry and all Lesson.missions; shared/cross-program lessons or Intermediate topic bindings fail closed. No trust in source category, CEFR, slug or caller-supplied program labels. Keep policy/capability primitives in dependency-leaf domain files; shared services import these without importing BeginnerModule, avoiding a module cycle.

Creation is explicit: use existing curriculum commands for selected Path/Level/Mission only; create/bind logical Lesson and ContentImport.lessonId in one scoped transaction for one authored Lesson. Reject slug collisions with an unrelated Lesson instead of upserting by slug. Do not create the 20/80 plan records on load. Target binding uses existing relational fields; AuditLog metadata records context/review; no schema migration. Binding/slug/source changes require revalidation and review. Generic routes stay denied for format1.2 and for mutations of Beginner-owned objects without the opaque context, including legacy-format source disguised as Beginner. Beginner must use1.2; cross-program reparent/link/archive/reorder is rejected by shared command policy. Helpers live in the Beginner policy, not copies in every controller.

ContentImportsService and ContentPublisherService accept optional **internal** context; legacy callers omit it and keep R1.1 default-deny. Add no shared boolean enable flag. Revalidate context before any write and again after locks. Generic get/preview may remain role-protected read operations; new learner-mode preview uses only the safe projection. Audio generation for Beginner is rejected before job/receipt writes; fixture audio is attached by the isolated harness using real test bytes with genuine script/file hashes, never a TTS call or fake READY assertion without a file.

Publish consumes exact target, expectedDraftRevision, sourceHash, validationHash, reviewHash, selectedAudioArtifacts and idempotencyKey. Review is an explicit Admin action using AuditLog plus MutationReceipt. Proposed enforceable rule: reject self-review; reviewer must be a different authenticated CONTENT_ADMIN/SYSTEM_ADMIN from the last source editor, with no fixture exception and no new role enum. Determine source editor from the source-hash-bound creation/change AuditLog, not updatedById that validation may change; reject missing or ambiguous provenance. Synthetic tests use two distinct synthetic Admin actors. Fixture records state `FIXTURE_TECHNICAL_REVIEW`; UI must not represent this as pedagogical approval. Any assessment/source/audio/evidence/target change invalidates review; planned metadata does not alter immutable content.

For Beginner operations, receipt requestHash includes environment, actor, operation, target/importId and every selection/hash above. Check authorization/target before replaying receipts. Same key+same request returns the same receipt; different target/hash gives409. Preserve legacy receipt hashes/operation names for legacy calls; namespace Beginner operations. Lock order: receipt/advisory operation lock → Program → Path → Level → Mission → Lesson/slug → ContentImport → referenced versions/assets (sorted IDs); recheck hierarchy, revision, review, audio script hash/file availability and evidence before materialization. All publication children, pointer, audit, receipt and binding writes commit atomically; concurrent reparent/replacement and stale locks must fail/retry explicitly without partial publish. Reuse existing shared lock protocols, document lock-order conflicts before changing them.

Supersession helper: only demonstrably exclusive Beginner ownership may keep old V1 PUBLISHED while currentPublishedVersionId becomes V2. Existing CurriculumRevision C1, V1 activities/audio/rubric and receipts remain immutable; no latest/first fallback. Reject ambiguous/shared ownership. Existing Intermediate/IELTS replacement still archives its prior current version; explicit ARCHIVED withdrawal is never made valid again. No historical data repair/backfill. R1.2a verifies persistence and exact pinned reads with synthetic records; R2 must separately prove new start/admission and prerequisite behavior using its real resolver (not a mocked claim here).

## Preview contract

`projectLearnerActivity(snapshot, activityId): LearnerActivityDto` is extracted from current getActivity redaction; the existing learner service and new Admin preview both call it. Preserve legacy shadowing support exactly. Omit Beginner model answers, correct indexes, explanation, requiredPhrases, private rubric/evidence and listening transcript; keep allowed instruction examples. No answer fields hidden only with CSS.

`GET /admin/beginner/imports/:id/learner-preview` returns explicit selected draft revision/hash, safe activities, the 45-minute plan produced from that exact snapshot and safe preview-media references. For draft IDs use clearly labelled preview IDs, never executable release IDs. Published preview requires explicit lessonVersionId; no current/first lookup. Raw source/answer review stays in a distinct Admin-only view, never inside learner DTO or its DOM.

Reuse ActivityRenderer/ActivityWorkspace with `mode: 'learner' | 'admin-preview'` default learner. Preview mounts no recorder hook/submission controls; it uses local input state and a neutral speaking prompt instead. No fictitious sessionId is sent to any learner endpoint. Authoritative publication audio is required, while incomplete draft preview may show an explicit missing-audio error. Serve approved fixture audio through an Admin-authorized endpoint with ownership checks; never turn an object-storage key into a public URL. Preview does not emit learner mutations, attempts, mastery, enrollment, session, completion, tracking writes or provider requests.

## Release registry

`BeginnerReleaseService.exportTestCandidate(input)` consumes actual successful lesson/curriculum/audio receipts from the approved isolated target and reads immutable rows/assets there. `approveTestRelease(candidateId, approvalRef)` is explicit, separate from export and software approval; resolve approvalRef only from the trusted approval source below, never accept an arbitrary approvalRecord in a request. Authorized reviewer approval is environment-bound and hash-bound. `loadApprovedBeginnerRelease(releaseId, environmentId): BeginnerManifestV1` reads server-owned registry only, revalidates envelope/manifest hashes and membership. Reject duplicate IDs/order, missing assets, wrong program/path/mission/revision/version/status, modified snapshots and any foreign/production environment. Input paths are not caller-chosen filesystem paths; derive safe opaque IDs below an approved registry root, reject traversal/symlinks and publish files atomically without overwriting approved records.

| State | Permitted identity/proof | Gate |
| --- | --- | --- |
| DRAFT | Editorial codes and source checksums only | Never accepted by executable manifest loader |
| TEST_PUBLISHED | Actual DB IDs and receipts; source/validation/snapshot/asset hashes and manifest hash | Separate environment+fixture import/audio attachment/publication permission; no auto approval on successful tests |
| APPROVED_RELEASE (test) | Immutable envelope with environmentId, releaseId, fixtureOnly=true, contentReadiness=FIXTURE_ONLY, manifest/hash, receipts, source/audio/review refs and environment-specific approval ref/hash | Explicit human test-release approval, not a passed assertion or self-authored approval file |

Synthetic approvals are permitted only in isolated unit/integration test doubles to test dispatch/rejection. They must never enter a persisted real APPROVED_RELEASE registry or be exported as human approval. Integration may stop at TEST_PUBLISHED until a human approves the actual candidate hash. Software readiness may use mocked approval branches but must report that distinction; do not block all software on production/content approval.

Registry envelope is separate from BeginnerManifestV1 (one path per manifest); two Paths in the workspace do not imply one manifest spanning both. Expected Unit codes include all four Stage Units even for a two-Unit pilot; transitionEnabled=false. Test fixtures cannot be promoted to CONTENT_READY. Production registry generation/import/replay is outside R1.2a, requires actual target IDs and separate permission. Retiring selection for new admission never deletes historical registry/assets or rewrites pinned references; R2 admission stays unwired here.

## Environment permission and fail-closed preflight

No environment is authorized or created by this plan. Proposed later target: disposable loopback PostgreSQL container or owner-provisioned **dedicated database** `worklingo_beginner_r12a_<runId>`, dedicated non-superuser/non-CREATEDB role and local temporary storage/registry root scoped to that run. A random schema in the app database is insufficient. Existing fallback harness/config is not used.

Before any setup/write, require an external permission record binding mandate/proposal hash, environmentId, exact server/port/database/role, storage+registry realpaths, runId, permitted actions and cleanup scope. Resolve no default URL, load no root .env, accept only explicit test connection settings; do not print credentials. Offline preflight validates descriptor, loopback endpoint, dedicated DB/role names, run sentinel and absolute paths under a run-owned temp parent (no symlink/junction escape). After separate read permission, compare `current_database()`, `current_user`, server identity and role flags against that descriptor before any DDL/DML. Any mismatch/absent permission => fail before setup, not skip.

**Trust anchor (proposed, no new approval granted):** the product owner supplies explicit human authorization with the exact scope/hash and actual environment or candidate identity. A trusted local operator verifies that direct human message and records it with its source, date, actor and allowed actions; hashes alone or an Admin-created file are not evidence of human authorization. Software-mandate approval is recorded through Mandate CLI; environment and candidate-release decisions additionally require separate explicit authorization records. Runtime reads approved records from an operator-configured, OS-protected approval root that is outside application/test writer roots and is not writable by the application account; no HTTP endpoint registers, edits or approves these records. CONTENT_ADMIN/SYSTEM_ADMIN can reference an existing approved ID but cannot mint authority, replace the root via a request, or broaden its allowed actions. Reject missing/changed records and revoked grants; recheck the record hash/action/environment before each mutation and candidate approval. Unit mocks may inject a fake approval reader only in isolated test construction; runtime DI never accepts a request-supplied reader. Test execution must fail closed if the OS/root separation cannot be established; arranging that operator identity/ACL is part of the separate environment approval, not a hidden setup action in this preapproval task.

Provision container/database/role using a separately approved operator action, never application credentials. If existing schema is needed, apply repository migrations **only to this dedicated database after explicit schema-setup permission**; no migration file changes, `db push`, application seed or developer DB reuse. The harness writes only its synthetic Admin/learner-reference/authoring records and fixture audio; no real learners. R1.2a synthetic pinned-session regression may insert test historical records but cannot claim to have implemented R2 admission.

Dedicated Vitest and Playwright configs must not import the default configs that load .env/fallback DATABASE_URL. They use a shared preflight and a sanitized child-process environment; fake evaluation/STT/TTS, workers off, external egress denied. Launch application/Next binaries with explicit config rather than env-loading development wrapper scripts. Keep test API/Web ports separate and loopback-bound. AppConfigModule currently loads .env and ../../.env: add a narrowly selected isolated-test bootstrap option to ignore env files, with its own unit test; the option alone grants no authoring/data capability. All ordinary bootstrap defaults remain unchanged. App bootstrap must not silently restore root .env settings; verify this with a failing preflight test.

Fixture import, audio file attachment and test publication each appear in permitted actions. Capture actual IDs/receipts/hashes only after success. Permission for test writes is not permission to approve a release. Two approvals may be supplied together only if each action/target is explicit; an unknown future candidate hash is never pre-approved implicitly.

Rollback stops new scoped mutations and selection of unapproved candidates; retain compatible readers and historical test evidence until references are checked. Cleanup requires the approved run descriptor, exact DB identity/storage realpath, proof of sole run ownership and no external references. Delete only that disposable database/container and temp roots using native safe filesystem operations; never DROP a guessed schema/DB or recursively delete a computed unverified path. A failed setup retains redacted diagnostics and cannot create an approved release. No production cleanup or history deletion.

## Task sequence (after approval only)

Files per task are exact entries in scope lock groups below. Tests first; no implementation/TDD execution during preapproval. Commit each accepted slice using explicit paths only if execution approval includes commit permission.

### Task 1 — Policy, contracts and environment gate

**Files:** scope groups contracts, policy, harness. **Interfaces:** strict `BeginnerTarget`, opaque `BeginnerAuthoringContext`, `BeginnerAuthoringPolicy.authorize`, test-environment preflight, review/release envelope schemas. No public DTO carries the internal context.

- [ ] RED: `missing_permission_denies_before_write`, `forged_context_or_foreign_program_denied`, `default_config_not_imported`, `wrong_db_role_storage_or_env_denied`, `fixture_cannot_be_content_ready`, `editorial_5_20_80_matches_existing_map` fail for missing behavior.
- [ ] Run dedicated unit config (commands below); confirm failures arise from assertions, not DB setup.
- [ ] Implement minimal policy/contracts and versioned editorial metadata from existing map/video plan; check all80 lesson codes, can-do vs inventory, prerequisites, reused VP links. No DB entries/resources created.
- [ ] GREEN then review the trust boundary and explicit allowlist; commit only after approved gates.

### Task 2 — Scoped authoring, review and publication

**Files:** groups authoring, curriculum plus policy; existing modules exported/reused, BeginnerModule wired in AppModule. **Interfaces:** `/admin/beginner` controller with explicit target commands, scoped ContentImport/Curriculum commands, review hash, namespace-safe receipt and atomic supersession policy.

- [ ] RED: `generic_12_stays_disabled`, `legacy_source_cannot_mutate_beginner`, `cross_program_reparent_or_shared_lesson_denied`, `slug_collision_denied`, `self_review_or_missing_source_editor_provenance_denied`, `stale_review_audio_or_revision_409_no_partial_publish`, `receipt_wrong_import_or_target_not_replayed`, `tts_denied_before_job`, `beginner_v2_keeps_v1_published`, `legacy_replacement_still_archives`.
- [ ] Run pure mocks first; genuine concurrency/publication tests require the separate environment approval and preflight. No migration/publication otherwise.
- [ ] Implement scoped commands and server-side target checks, under current locks/receipts; resolve any discovered lock incompatibility within allowlist or stop for review. Keep shared defaults unchanged.
- [ ] GREEN; inspect write-set/audit/receipt and race tests before commit. A stale or failed transaction leaves no child rows or orphan selected assets.

### Task 3 — Editor, tree and safe preview

**Files:** groups preview, web, editorial contracts; FoundationDefinitionEditor gains typed transport adapter with legacy default. **Interfaces:** BeginnerWorkspace with tree/editor/planned slots, Beginner client, learner-mode safe projection and explicit preview renderer mode.

- [ ] RED: `planned_tree_does_not_seed`, `wrong_role_direct_navigation_denied`, `source_round_trip_keeps_unknown_text`, `preview_exact_version_not_first`, `preview_omits_answers`, `preview_never_calls_learner_or_recorder`, `review_invalidated_on_source_edit`, `legacy_editor_adapter_unchanged`.
- [ ] Run focused component/contracts and mocked API tests; render 5/20/80 planned nodes, both Paths, G/P/V plus can-do/RLSW/H/R labels, no invented status/assets. Check empty/error/conflict states and keyboard/mobile navigation.
- [ ] Implement; use existing pure normalizer/planner and shared redaction extraction. Do not wire Beginner into learner catalog/start/resolver. Keep guided speaking preview local with no microphone/provider/network submission.
- [ ] GREEN then review raw-response/DOM leakage, outbound request assertions and unchanged legacy renderer/editor defaults; commit after gates.

### Task 4 — Candidate export, registry and regression

**Files:** groups registry, harness and E2E. **Interfaces:** exportTestCandidate, explicit approveTestRelease, loadApprovedBeginnerRelease; environment-bound immutable file envelope.

- [ ] RED: `candidate_uses_actual_published_receipt_ids`, `wrong_environment_or_modified_hash_denied`, `admin_cannot_register_or_forge_human_approval`, `revoked_or_changed_permission_denied_before_write`, `failed_publish_no_approved_release`, `fixture_approval_never_production`, `registry_traversal_or_overwrite_denied`, `old_v1_snapshot_survives_pointer_and_c2_update`.
- [ ] Under separate environment permission only, publish synthetic test fixtures/audio, export actual IDs/hashes, query same DB and hash same files. Without permission mark integration/E2E BLOCKED, not PASS. No artificial approval of actual candidate.
- [ ] Implement export/load/explicit approval boundary; unit-test approval via mocks, and retain actual TEST_PUBLISHED candidate for human approval if one is produced. Exercise old-session exact reads/resume/evaluation and unchanged legacy paths with synthetic historical records, not fake real enrollment proof.
- [ ] GREEN focused checks and final review; record any unexecuted gates accurately. Commit software/verification docs only when authorized and all mandatory gates for that acceptance level pass.

## Test, acceptance and rollback matrix

| Area | Unit/component | Authorized integration/E2E | Acceptance / rollback |
| --- | --- | --- | --- |
| Scope/auth | Roles, ancestry, opaque context, missing environment, direct URL/API, altered binding/source | HTTP401/403; wrong program/shared Lesson; concurrent reparent/publish | Denial before writes/jobs; disable scoped authoring without changing shared defaults |
| Editorial/editor | Exact5/20/80 metadata, G/P/V vs can-do, H/R, no fake records, source round-trip and validation errors | Create only selected fixture draft; both Path panels; real status/empty views | PLANNED is honest; no CONTENT_READY/video/resource data |
| Evidence/media | Missing R/L/S/W, blank/TODO content, min_words/rubric, unsupported version, missing/stale audio/evidence, planner exact snapshot | File bytes/script hashes checked; invalid evidence or prerequisite graph rejects | Validation not approval; retain original source, no auto publish |
| Concurrency | Source/revision/review mismatch, receipt request includes target/import | Same request same IDs; competing source edit/reparent/replacement; transaction rollback |409/no partial state; don't erase existing valid snapshots |
| Preview | Shared DTO redaction, no recorder/submit/analytics writes; phase instructions; explicit version | Query learner tables before/after; intercept network; Admin-only fixture audio | No enrollment/attempt/progress/mastery/session changes; disable preview route on failure |
| Registry | Environment/hash/membership, safe path, synthetic approval isolation | Real publication receipts/IDs, source/snapshot/file hashes from isolated DB/storage | Test fixture remains FIXTURE_ONLY; failed export cannot approve; retire only new selection |
| History/legacy | Old V1 exact snapshot read/resume/evaluation, explicit withdrawn rejection, legacy archive stays | Synthetic C1/V1 session, publish V2/C2, read/evaluate V1 unchanged; Intermediate/IELTS replacement fixtures | R1.2a persistence/read guarantees only; complete R2 pinned-start/enrollment and R4 supplementary tests remain separate gates |

Future commands (not executed in preapproval):

```text
pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts
pnpm --filter @worklingo/contracts exec vitest run src/beginner-authoring.contracts.spec.ts src/beginner-editorial-plan.spec.ts src/beginner.contracts.spec.ts
pnpm --filter @worklingo/web exec vitest run src/features/admin-beginner src/features/admin-curriculum src/features/admin-dashboard/admin-sidebar.test.tsx src/features/admin-dashboard/admin-navigation.test.tsx src/features/learning-session/activity-workspace.test.tsx
pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.integration.config.ts
pnpm --filter @worklingo/web exec playwright test -c playwright.beginner-admin.config.ts
```

Dedicated unit config includes mocked policy/authoring/preview/registry and existing affected legacy unit specs only; no integration/bootstrap side effects. Separate integration config collects exactly the two new Beginner integration specs. Their new isolated harness exercises existing content/curriculum/history/Intermediate/IELTS services with synthetic legacy fixtures; do not call the existing fallback/auto-seeding harness or modify unrelated integration suites. Name exact collected suites in execution report; discovery cannot silently select a default whole-DB suite. E2E config collects exactly `e2e/beginner-admin.spec.ts` and `e2e/beginner-admin-history.spec.ts`, desktop+mobile; history spec checks Admin publication/read integrity, not unimplemented R2 admission. Zero collected or skipped tests are never acceptance.

Run affected package lint/typecheck/build and content-format1.0/1.1/1.2, contracts, planner/evaluator/DTO regression once on the final candidate. Full DB/E2E suites require explicit environment/data permission; do not run root commands that connect to fallback databases. Record tests as PASS/FAIL/BLOCKED and distinguish historical R1.1 results from fresh results. No skipped tests counted as PASS.

**Acceptance levels:** SOFTWARE_READY on unit/component/mocks plus lint/typecheck/build does not imply DB_PUBLISHED or CONTENT_READY. Full R1.2a acceptance additionally requires authorized isolated integration/E2E and actual-ID candidate verification. Actual test APPROVED_RELEASE requires candidate-specific human approval. R1.2b, R2, production publication and learner access remain closed regardless of software success.

**Dependency:** Verified R1.1 → approval matching this plan/review/allowlist/baseline → R1.2a software; separate target permission → isolated publication verification → candidate-specific test-release approval. No dependency on eight real lessons/video production. R1.2b and R2 each need separate mandates/approval; do not start either automatically.

**Rollback:** Before any data, revert approved software slices without altering R1.1 readers. After fixture publication, close scoped mutations and retain version readers/registry/audio/receipts until run-only cleanup is proven safe. Never roll back by deleting referenced historical versions, regrading attempts, changing progress or altering Intermediate/IELTS archive policy.
