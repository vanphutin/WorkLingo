# Content Authoring and Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the local-first Admin pipeline that turns WorkLingo Lesson Format 1.0 source into validated previews, fake audio, and immutable published lesson versions without changing sessions already in progress.

**Architecture:** A framework-independent `@worklingo/content-format` package owns source locations, parsing, validation, and normalization. NestJS persists mutable `ContentImport` workspaces, orchestrates local fake TTS and a transactional publisher, while Next.js renders server-authoritative source issues and previews. Published relational rows and the canonical JSON snapshot are immutable; learner sessions continue to resolve their stored `lessonVersionId`.

**Tech Stack:** TypeScript 5.9, pnpm workspaces, Zod 4, NestJS 11, Prisma 6/PostgreSQL, Next.js 16/React 19, Vitest, Supertest, Playwright, local filesystem storage.

**Spec:** `docs/superpowers/specs/2026-10-04-content-authoring-publishing-design.md`

## Global Constraints

- Execute only after the local-startup/backup work currently in the worktree has been reviewed and committed; Increment 2 must begin from a clean worktree.
- Work in `C:\Users\ASUS\.codex\worktrees\foundation-learning-slice\WorkLingo` on `codex/foundation-learning-slice`; do not switch to `D:\Projects\WorkLingo` or `main`.
- Antigravity must read repository instructions, emit `SKILL ROUTING`, use applicable skills, maintain its task artifact, and emit `SKILL AUDIT` with commands actually run.
- Antigravity must not commit, push, create a PR, reset, discard, or stage unrelated files. Commit steps below are review boundaries reserved for Codex after final review.
- Preserve exact raw source after every failure. Never log raw lesson source, credentials, or audio bytes.
- `@worklingo/content-format` must not import NestJS, Prisma, React, browser APIs, or filesystem APIs.
- Only `CONTENT_ADMIN` and `SYSTEM_ADMIN` may use authoring routes; public registration remains learner-only.
- All runtime storage remains local. No OpenAI, Microsoft Speech, AWS, S3, Redis, or cloud dependency is allowed.
- Backend analysis is authoritative; the web app must not implement a second parser or validator.
- Published snapshots are immutable. A later publish must not change an existing session's `lessonVersionId`, `planSnapshot`, activity data, or referenced audio.
- Use TDD for every behavior change: failing focused test, observed failure, minimal implementation, observed pass, then relevant regression tests.

## Review Focus

1. CRLF, BOM, Vietnamese text, and UTF-16 surrogate pairs must produce correct one-based line/column and original-string offsets; Task 2 pins this with exact range assertions.
2. A validation response racing with a newer autosave must never mark the newer source validated; Task 6 tests source-hash and revision compare-and-set behavior.
3. An old fake-audio job completing after its script changed must become stale instead of ready for the new revision; Task 7 tests out-of-order completion.
4. Concurrent or retried publish requests must create exactly one numbered version and one idempotency receipt; Task 8 tests same-key replay, different-key contention, and rollback.
5. Publishing and archiving N+1 must not change or break a session already bound to N, including its content and audio references; Task 8 tests both sides of the commit boundary.

---

### Task 1: Content Format Package, Source Locations, and Canonical Fixtures

**Files:**
- Create: `packages/content-format/package.json`
- Create: `packages/content-format/tsconfig.json`
- Create: `packages/content-format/src/source-location.ts`
- Create: `packages/content-format/src/ast.ts`
- Create: `packages/content-format/src/issues.ts`
- Create: `packages/content-format/src/index.ts`
- Create: `packages/content-format/src/source-location.spec.ts`
- Create: `packages/test-fixtures/src/content-authoring.fixture.ts`
- Modify: `packages/test-fixtures/src/index.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `WorkLingoLesson/1.0` syntax and `SourcePosition`, `SourceRange`, `ContentIssue` definitions from the spec.
- Produces: `createSourceLocator(source: string): SourceLocator`; AST node interfaces with `range`; `canonicalLessonSource`, `invalidLessonSources`, and normalized expected values for later tests.

- [ ] **Step 1: Write the failing source-location tests**

Add tests asserting `positionAt(0) === { line: 1, column: 1, offset: 0 }`, CRLF counts as one line break while offsets retain both characters, and a Vietnamese/emoji fixture uses JavaScript UTF-16 offsets exactly.

- [ ] **Step 2: Run the focused test and observe failure**

Run: `pnpm --filter @worklingo/content-format test -- source-location.spec.ts`

Expected: FAIL because the workspace package and `createSourceLocator` do not exist.

- [ ] **Step 3: Add the package and implement the source-location contract**

Implement:

```ts
export interface SourceLocator {
  positionAt(offset: number): SourcePosition;
  range(startOffset: number, endOffset: number): SourceRange;
}

export function createSourceLocator(source: string): SourceLocator;
```

Reject offsets outside `0..source.length`; ranges are half-open. Define AST discriminants for lesson, Word Bank, Language Block, content, audio script, and activity nodes without database IDs.

- [ ] **Step 4: Add canonical and invalid fixture exports**

The canonical fixture must contain all four skills, one listening audio reference, repeated examples, Vietnamese meaning text, and evidence. Invalid fixtures must cover unsupported format, unclosed section, missing reference, invalid answer, missing skill, and stale audio metadata inputs.

- [ ] **Step 5: Run package tests and workspace typecheck**

Run: `pnpm --filter @worklingo/content-format test && pnpm --filter @worklingo/content-format typecheck && pnpm --filter @worklingo/test-fixtures typecheck`

Expected: all commands PASS.

- [ ] **Step 6: Mark the Codex commit boundary**

Reserved commit: `feat: define lesson format AST and source locations`

---

### Task 2: Recovering Lesson Format 1.0 Parser

**Files:**
- Create: `packages/content-format/src/parser.ts`
- Create: `packages/content-format/src/parser.spec.ts`
- Modify: `packages/content-format/src/index.ts`

**Interfaces:**
- Consumes: `createSourceLocator`, AST nodes, issues, and fixtures from Task 1.
- Produces: `parseLessonSource(source: string): ParseLessonResult`, where `ParseLessonResult` contains a recoverable `LessonDocumentNode` and source-ordered parse issues.

- [ ] **Step 1: Write failing parser tests for the canonical fixture**

Assert the exact format version, authored slugs, section order, repeated Language Block fields, multiline text, `activity_type`, `response_type`, normalized list tokens, and source ranges that slice back to the expected original text.

- [ ] **Step 2: Write failing invalid-source and recovery tests**

Pin stable codes including `PARSE_UNSUPPORTED_FORMAT`, `PARSE_UNCLOSED_SECTION`, `PARSE_MISMATCHED_SECTION`, `PARSE_UNCLOSED_MULTILINE`, `PARSE_UNKNOWN_FIELD`, `PARSE_DUPLICATE_FIELD`, and `PARSE_INVALID_IDENTIFIER`. Assert recovery reports a later valid section after an earlier malformed section.

- [ ] **Step 3: Add the Review Focus location test**

Parse a CRLF source beginning with BOM and containing `Tiếng Việt 😀`; assert one-based line/column values and exact original-string offsets before and after the surrogate pair.

- [ ] **Step 4: Run tests and observe parser failures**

Run: `pnpm --filter @worklingo/content-format test -- parser.spec.ts`

Expected: FAIL because `parseLessonSource` is absent.

- [ ] **Step 5: Implement `parseLessonSource`**

Use a line-oriented scanner with explicit section frames and multiline mode. Do not use regexes that discard offsets. Unknown input becomes an issue; it is never silently skipped except as part of documented recovery to the next recognizable section boundary.

- [ ] **Step 6: Run focused and package tests**

Run: `pnpm --filter @worklingo/content-format test`

Expected: all content-format tests PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: parse lesson plaintext with source mappings`

---

### Task 3: Structural Validation, Semantic Validation, and Normalization

**Files:**
- Create: `packages/content-format/src/validator.ts`
- Create: `packages/content-format/src/validator.spec.ts`
- Create: `packages/content-format/src/normalizer.ts`
- Create: `packages/content-format/src/normalizer.spec.ts`
- Modify: `packages/content-format/src/index.ts`

**Interfaces:**
- Consumes: `ParseLessonResult` from Task 2.
- Produces: `PARSER_VERSION: '1.0.0'`; `analyzeLessonSource(source: string): ContentAnalysis`; `ContentAnalysis` includes parser version, parse/validation issues, optional `NormalizedLessonDraft`, and a publish-blocking boolean. Source hashing remains an API persistence concern.

- [ ] **Step 1: Write failing structural-validation tests**

Assert missing required fields, unsupported enums, invalid `response_type` payloads, duplicate scalar fields, and configured source/section/activity/option limits return stable issue codes and source ranges.

- [ ] **Step 2: Write failing semantic-validation tests**

Assert duplicate slugs, unknown content/language/audio references, invalid answer labels, evidence outside content, incompatible learning blocks, listening without audio, and missing four-skill coverage block publication. Assert unused content and missing recommended evidence are warnings only.

- [ ] **Step 3: Write failing normalization tests**

Assert `read_decode` becomes `readDecode`, `listen_reason` becomes `listenReason`, answer labels become the existing zero-based `answerIndex`, list order is preserved, and valid output is accepted by the existing `lessonSnapshotSchema` after UUID materialization.

- [ ] **Step 4: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/content-format test -- validator.spec.ts normalizer.spec.ts`

Expected: FAIL because analysis and normalization are absent.

- [ ] **Step 5: Implement the analyzer and normalizer**

Implement:

```ts
export function analyzeLessonSource(source: string): ContentAnalysis;
export function normalizeLessonDocument(document: LessonDocumentNode): NormalizedLessonDraft | null;
```

Do not emit normalized output when a blocking issue exists. Cap returned issues and expose `issuesTruncated`. Keep the package runtime-neutral; do not import Node crypto merely to compute persistence hashes.

- [ ] **Step 6: Run content-format and curriculum regression tests**

Run: `pnpm --filter @worklingo/content-format test && pnpm --filter @worklingo/api test -- curriculum`

Expected: all selected tests PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: validate and normalize authored lessons`

---

### Task 4: Authoring, Versioned Word Bank, Audio, Job, and Audit Persistence

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_content_authoring/migration.sql`
- Create: `apps/api/test/integration/content-schema.integration.spec.ts`
- Modify: `apps/api/src/curriculum/domain/curriculum.types.ts`
- Modify: `apps/api/src/curriculum/infrastructure/seed-foundation.ts`
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: `NormalizedLessonDraft` and existing Foundation snapshot schema.
- Produces: Prisma models `ContentImport`, `WordBankVersion`, `LanguageBlockVersion`, `AudioArtifact`, `LessonVersionAudioArtifact`, `Job`, `MutationReceipt`, and `AuditLog`; `Lesson.currentPublishedVersionId`; immutable published-version trigger.

- [ ] **Step 1: Write the failing schema integration tests**

Test migration from a database containing the existing Foundation seed, preservation of its lesson-version ID and parsed snapshot, nullable draft-less imports, unique Word Bank version numbers, one current published version, and legal `PUBLISHED → ARCHIVED` transition.

- [ ] **Step 2: Write the failing immutability trigger tests**

After publication, assert SQL updates to source/snapshot/title and updates/deletes of content, activity, Language Block snapshot, and audio-reference rows fail. Assert archiving only changes allowed status/audit fields.

- [ ] **Step 3: Run the integration test and observe failure**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/content-schema.integration.spec.ts`

Expected: FAIL because the models and trigger do not exist.

- [ ] **Step 4: Add the Prisma models and migration with backfill**

Make `ContentImport` the mutable source holder. Make published `LessonVersion` rows contain only `PUBLISHED` or `ARCHIVED` by invariant. Change `LessonVersionWordBank` to reference `WordBankVersion`; each `LanguageBlockVersion` belongs to one `WordBankVersion`. Backfill the current Foundation data and create the database trigger without changing learner-visible JSON. Add a PostgreSQL partial unique index that permits only one `PUBLISHED` `LessonVersion` per `lessonId`.

- [ ] **Step 5: Update the seed and curriculum consistency checks**

Seed the Foundation lesson through the new immutable relations. Keep repeated seed execution idempotent and reject a different hash under the same published version.

- [ ] **Step 6: Run schema, seed, and session regressions**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/content-schema.integration.spec.ts test/integration/curriculum-seed.integration.spec.ts test/integration/learning-sessions.integration.spec.ts`

Expected: all selected integration tests PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: persist immutable authored content versions`

---

### Task 5: Administrative Authorization and Local Content Admin Seed

**Files:**
- Create: `apps/api/src/auth/roles.decorator.ts`
- Create: `apps/api/src/auth/infrastructure/roles.guard.ts`
- Create: `apps/api/src/auth/infrastructure/roles.guard.spec.ts`
- Modify: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/users/infrastructure/seed-content-admin.ts`
- Modify: `apps/api/src/common/config/app-config.schema.ts`
- Modify: `.env.example`
- Modify: `scripts/setup-local.ps1`
- Modify: `apps/api/prisma/seed.ts`
- Create: `apps/api/test/integration/admin-authorization.integration.spec.ts`

**Interfaces:**
- Consumes: authenticated `AuthUser.roles` and the local setup workflow completed before Increment 2.
- Produces: `@Roles(...roles: UserRole[])`; global `RolesGuard`; `seedContentAdmin(database, input)`; local admin credentials supplied by environment/setup, never hard-coded into source.

- [ ] **Step 1: Write failing guard unit tests**

Assert no metadata allows any authenticated role, matching `CONTENT_ADMIN`/`SYSTEM_ADMIN` passes, learner receives 403, and unauthenticated requests still receive 401 from `SessionAuthGuard` first.

- [ ] **Step 2: Write failing seed and endpoint integration tests**

Assert the local seed creates one active Content Admin idempotently, public registration still creates only learners, and a learner cannot reach a representative `/admin` route.

- [ ] **Step 3: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/api exec vitest run src/auth/infrastructure/roles.guard.spec.ts test/integration/admin-authorization.integration.spec.ts`

Expected: FAIL because role metadata/guard and the admin seed do not exist.

- [ ] **Step 4: Implement role enforcement and safe local seeding**

Register `RolesGuard` after `SessionAuthGuard`. Extend config with `WORKLINGO_ADMIN_EMAIL` and `WORKLINGO_ADMIN_PASSWORD`; make setup generate a local password when absent and keep the real value only in ignored `.env`. `.env.example` documents placeholders, not a usable credential.

- [ ] **Step 5: Run auth, setup-script, and integration regressions**

Run: `pnpm --filter @worklingo/api test -- auth && pnpm --filter @worklingo/api exec vitest run test/integration/auth.integration.spec.ts test/integration/admin-authorization.integration.spec.ts && pnpm test`

Expected: all selected tests PASS.

- [ ] **Step 6: Mark the Codex commit boundary**

Reserved commit: `feat: protect and seed content admin access`

---

### Task 6: Draft, Autosave, Validation, and Preview API

**Files:**
- Create: `packages/contracts/src/content-authoring.contracts.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `apps/api/src/content-authoring/content-authoring.module.ts`
- Create: `apps/api/src/content-authoring/content-authoring.controller.ts`
- Create: `apps/api/src/content-authoring/application/content-imports.service.ts`
- Create: `apps/api/src/content-authoring/application/content-imports.service.spec.ts`
- Create: `apps/api/src/content-authoring/dto/content-import.dto.ts`
- Create: `apps/api/src/content-authoring/infrastructure/content-analysis.mapper.ts`
- Create: `apps/api/test/integration/content-imports.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `analyzeLessonSource`, `ContentImport` persistence, and `@Roles`.
- Produces: list/create/get/update/validate/preview endpoints; shared `ContentImportDto`, `ContentIssueDto`, `ContentPreviewDto`, `UpdateContentSourceInput`, and `ValidateContentImportResult` schemas; the spec's stable domain error-code union including `DRAFT_REVISION_CONFLICT`, `SOURCE_HASH_MISMATCH`, `AUDIO_NOT_READY`, `AUDIO_SCRIPT_STALE`, and `IDEMPOTENCY_KEY_REUSED`.

- [ ] **Step 1: Write failing service tests for exact-source persistence**

Assert creation stores invalid raw source exactly, update requires `expectedDraftRevision`, successful update increments once, and conflict does not overwrite either server or client text.

- [ ] **Step 2: Add the validation race test from Review Focus**

Pause analysis of revision 3, save revision 4, then complete the old analysis. Assert compare-and-set refuses to mark revision 4 `VALIDATED` and returns `DRAFT_REVISION_CONFLICT` or a non-mutating stale-analysis result.

- [ ] **Step 3: Write failing API integration tests**

Cover 201 create, 200 list/get/update/validate/preview, 422 with stored invalid source, 409 revision conflict, 403 learner access, source-size limit, stable error envelope, and shared admin workspace behavior.

- [ ] **Step 4: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/api exec vitest run src/content-authoring/application/content-imports.service.spec.ts test/integration/content-imports.integration.spec.ts`

Expected: FAIL because the module and contracts do not exist.

- [ ] **Step 5: Implement `ContentImportsService` and controller**

Implement:

```ts
create(actorId: string, rawSource: string): Promise<ContentImportDto>;
updateSource(id: string, actorId: string, input: UpdateContentSourceInput): Promise<ContentImportDto>;
validate(id: string, actorId: string, expectedDraftRevision: number): Promise<ValidateContentImportResult>;
getPreview(id: string, actorId: string): Promise<ContentPreviewDto>;
```

Compute SHA-256 in the API over the exact raw JavaScript string, then persist parser version, source hash, issues, truncation flag, AST, and normalized preview. Validation uses revision/hash compare-and-set.

- [ ] **Step 6: Run focused tests, contract typecheck, and API regressions**

Run: `pnpm --filter @worklingo/contracts typecheck && pnpm --filter @worklingo/api test && pnpm --filter @worklingo/api exec vitest run test/integration/content-imports.integration.spec.ts`

Expected: all commands PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: add content import validation API`

---

### Task 7: Fake TTS, Local Audio Artifacts, and Generation Jobs

**Files:**
- Create: `apps/api/src/content-authoring/domain/text-to-speech.port.ts`
- Create: `apps/api/src/content-authoring/infrastructure/fake-tts.adapter.ts`
- Create: `apps/api/src/content-authoring/infrastructure/fake-tts.adapter.spec.ts`
- Create: `apps/api/src/content-authoring/application/audio-generation.service.ts`
- Create: `apps/api/src/content-authoring/application/audio-generation.service.spec.ts`
- Create: `apps/api/src/content-authoring/audio.controller.ts`
- Create: `apps/api/src/jobs/jobs.controller.ts`
- Create: `apps/api/src/jobs/jobs.module.ts`
- Create: `apps/api/src/jobs/application/jobs.service.ts`
- Create: `apps/api/test/integration/content-audio.integration.spec.ts`
- Modify: `packages/contracts/src/content-authoring.contracts.ts`
- Modify: `apps/api/src/content-authoring/content-authoring.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: validated `ContentImport`, `ObjectStorage`, `Job`, `AudioArtifact`, and `MutationReceipt`.
- Produces: `TextToSpeechPort.synthesize(input): Promise<SynthesizedAudio>`; fake adapter; `POST .../generate-audio`; `GET .../audio`; `GET /jobs/{id}`; authorized `GET /admin/audio-artifacts/{id}/content` for playback.

- [ ] **Step 1: Write failing fake-adapter contract tests**

Assert identical script/voice produces identical valid `audio/wav` bytes and checksum, different scripts change the checksum, and empty/oversized scripts are rejected before storage.

- [ ] **Step 2: Write failing lifecycle and idempotency tests**

Assert `MISSING → GENERATING → READY`, failures become `FAILED`, retry with the same key reuses the job/artifact, a changed request under the same key returns `IDEMPOTENCY_KEY_REUSED`, and server-generated storage keys remain under `generated-audio/`.

- [ ] **Step 3: Add the out-of-order completion test from Review Focus**

Start generation for script hash A, edit the source to hash B, then complete A. Assert artifact A is `STALE`, the import is not audio-ready, and only generation for B can become the publishable artifact.

- [ ] **Step 4: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/api exec vitest run src/content-authoring/infrastructure/fake-tts.adapter.spec.ts src/content-authoring/application/audio-generation.service.spec.ts test/integration/content-audio.integration.spec.ts`

Expected: FAIL because the TTS and job services do not exist.

- [ ] **Step 5: Implement fake TTS and the minimal local job runner**

Persist a queued job before returning 202, execute it asynchronously in-process, and persist terminal state. Recovery/backoff beyond fake generation remains out of scope. Check current source/script hash before marking an artifact ready.

- [ ] **Step 6: Implement authorized audio streaming**

Stream stored bytes with saved MIME and length. Never accept a storage key from the route. Return 404 for inaccessible artifacts and keep fake-audio labeling in DTO metadata.

- [ ] **Step 7: Run audio, storage, and integration regressions**

Run: `pnpm --filter @worklingo/api test -- audio storage && pnpm --filter @worklingo/api exec vitest run test/integration/content-audio.integration.spec.ts`

Expected: all selected tests PASS.

- [ ] **Step 8: Mark the Codex commit boundary**

Reserved commit: `feat: add local fake audio generation lifecycle`

---

### Task 8: Transactional Publish, Archive, and Session Version Isolation

**Files:**
- Create: `apps/api/src/content-authoring/application/content-publisher.service.ts`
- Create: `apps/api/src/content-authoring/application/content-publisher.service.spec.ts`
- Create: `apps/api/src/content-authoring/application/publish.types.ts`
- Create: `apps/api/test/integration/content-publish.integration.spec.ts`
- Modify: `apps/api/src/content-authoring/content-authoring.controller.ts`
- Modify: `apps/api/src/content-authoring/content-authoring.module.ts`
- Modify: `apps/api/src/curriculum/application/curriculum.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `packages/contracts/src/content-authoring.contracts.ts`

**Interfaces:**
- Consumes: validated import snapshot, ready audio artifacts, immutable schema, and existing session planner.
- Produces: `publish(importId, actorId, input): Promise<PublishContentResult>`; archive endpoint; current-version lookup used only when creating a session.

- [ ] **Step 1: Write failing publisher unit tests**

Assert wrong revision/hash, stale validation, blocking issues, missing/stale audio, and invalid state fail before materialization with the specified stable codes, including `AUDIO_NOT_READY` and `AUDIO_SCRIPT_STALE`. Assert canonical Word Bank hash reuses an identical version and changed content creates the next version.

- [ ] **Step 2: Write failing transaction integration tests**

Inject a failure after child materialization and assert no lesson version, children, pointer, archive transition, audit event, or receipt is committed. Assert successful publish creates all rows and archives the previous current version atomically.

- [ ] **Step 3: Add concurrency and idempotency tests from Review Focus**

Run same-key identical requests concurrently and assert one version/receipt with the same response. Run different keys against one draft and assert one succeeds while the other receives a state conflict. Reuse a key with a different request hash and assert `IDEMPOTENCY_KEY_REUSED`.

- [ ] **Step 4: Add session isolation tests from Review Focus**

Create session S1 on version N, publish N+1, archive N, then assert S1 still loads N content/audio and its original plan. Create S2 after commit and assert it selects N+1. Verify no code updates S1's version or plan.

- [ ] **Step 5: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/api exec vitest run src/content-authoring/application/content-publisher.service.spec.ts test/integration/content-publish.integration.spec.ts`

Expected: FAIL because publisher and endpoints do not exist.

- [ ] **Step 6: Implement the publish and archive services**

Use a PostgreSQL advisory transaction lock scoped to logical lesson slug. Validate expected revision/hash/parser version, allocate version number server-side, materialize UUID-backed snapshots, update `currentPublishedVersionId`, archive the prior current version, and write audit/receipt inside one transaction.

- [ ] **Step 7: Update session creation without changing existing-session reads**

New sessions select `Lesson.currentPublishedVersionId`. Existing session reads continue through `LearningSession.lessonVersionId` and `planSnapshot`; they must never look up latest content.

- [ ] **Step 8: Run publisher and all Increment 1 integration regressions**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/content-publish.integration.spec.ts test/integration/curriculum-seed.integration.spec.ts test/integration/learning-sessions.integration.spec.ts test/integration/session-ownership.integration.spec.ts`

Expected: all selected integration tests PASS.

- [ ] **Step 9: Mark the Codex commit boundary**

Reserved commit: `feat: publish immutable lesson versions atomically`

---

### Task 9: Admin API Client and Protected Admin Shell

**Files:**
- Modify: `apps/web/src/lib/api/api-client.ts`
- Modify: `apps/web/src/lib/api/api-client.test.ts`
- Create: `apps/web/src/app/(admin)/layout.tsx`
- Create: `apps/web/src/app/(admin)/layout.test.tsx`
- Create: `apps/web/src/app/(admin)/admin/content/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/content/new/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/content/[importId]/page.tsx`
- Create: `apps/web/src/features/admin-content/content-list.tsx`
- Create: `apps/web/src/features/admin-content/new-content-import.tsx`

**Interfaces:**
- Consumes: Task 6–8 shared DTO schemas and Admin routes.
- Produces: typed `ApiClient` content methods, role-protected admin layout, content list, and draft creation navigation.

- [ ] **Step 1: Write failing API-client tests**

Assert request paths, request bodies carrying expected revision/hash/idempotency key, 202 job parsing, and stable `ApiError` mapping for 403/409/422.

- [ ] **Step 2: Write failing Admin layout tests**

Assert unauthenticated users redirect to login, learners redirect to dashboard/forbidden state, authorized admins see navigation, and infrastructure auth failures show retry without redirect.

- [ ] **Step 3: Run focused web tests and observe failure**

Run: `pnpm --filter @worklingo/web exec vitest run src/lib/api/api-client.test.ts 'src/app/(admin)/layout.test.tsx'`

Expected: FAIL because content client methods and Admin routes do not exist.

- [ ] **Step 4: Implement the typed client and Admin shell**

Add list/create/get/update/validate/preview/generate-audio/job/publish/archive methods that parse every response with shared schemas. Reuse existing auth error semantics and add `CONTENT_ADMIN`/`SYSTEM_ADMIN` role checks.

- [ ] **Step 5: Implement list and new-import pages**

The list exposes status, title/slug when available, updated time, and continue/view action. New import accepts raw source and navigates to the created import without parsing locally.

- [ ] **Step 6: Run focused tests, typecheck, and lint**

Run: `pnpm --filter @worklingo/web test && pnpm --filter @worklingo/web typecheck && pnpm --filter @worklingo/web lint`

Expected: all commands PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: add protected content admin workspace`

---

### Task 10: Source Editor, Autosave Conflict Handling, and Validation UX

**Files:**
- Create: `apps/web/src/features/admin-content/content-authoring-workspace.tsx`
- Create: `apps/web/src/features/admin-content/content-authoring-workspace.test.tsx`
- Create: `apps/web/src/features/admin-content/source-editor.tsx`
- Create: `apps/web/src/features/admin-content/source-editor.test.tsx`
- Create: `apps/web/src/features/admin-content/validation-panel.tsx`
- Create: `apps/web/src/features/admin-content/source-position.ts`
- Create: `apps/web/src/features/admin-content/source-position.test.ts`
- Modify: `apps/web/src/app/(admin)/admin/content/[importId]/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: import/update/validate client methods and one-based source ranges.
- Produces: exact-source textarea with line gutter, `offsetForPosition(source, position)`, debounced autosave state, conflict recovery panel, issue navigation, and accessible validation announcements.

- [ ] **Step 1: Write failing source-position and editor tests**

Assert line/column maps to textarea selection offsets for LF, CRLF, Vietnamese, and emoji. Clicking an issue must focus the textarea and set a collapsed selection at `range.start.offset`.

- [ ] **Step 2: Write failing autosave tests**

Use fake timers to assert one debounced save per edit burst, visible `Saving`/`Saved`, unmount cancellation, and no out-of-order response can replace newer local text.

- [ ] **Step 3: Write failing conflict and validation tests**

On 409, assert local unsaved source and server source/revision are both preserved and displayed; no automatic overwrite occurs. Assert validation is explicit, errors use `role="alert"`/live region, and publish remains unavailable for the stale revision.

- [ ] **Step 4: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/web exec vitest run src/features/admin-content/source-position.test.ts src/features/admin-content/source-editor.test.tsx src/features/admin-content/content-authoring-workspace.test.tsx`

Expected: FAIL because the workspace components do not exist.

- [ ] **Step 5: Implement editor, autosave, validation panel, and responsive layout**

Use a controlled textarea; do not add a code-editor dependency. Desktop uses source/issues columns. Narrow screens use accessible Source and Validation tabs. Preserve visible focus, labels, and keyboard order.

- [ ] **Step 6: Run focused tests and web quality checks**

Run: `pnpm --filter @worklingo/web test && pnpm --filter @worklingo/web typecheck && pnpm --filter @worklingo/web lint`

Expected: all commands PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: add source validation authoring workspace`

---

### Task 11: Structured Preview, Fake Audio Controls, and Publish UI

**Files:**
- Create: `apps/web/src/features/admin-content/lesson-preview.tsx`
- Create: `apps/web/src/features/admin-content/lesson-preview.test.tsx`
- Create: `apps/web/src/features/admin-content/audio-preview.tsx`
- Create: `apps/web/src/features/admin-content/audio-preview.test.tsx`
- Create: `apps/web/src/features/admin-content/publish-panel.tsx`
- Create: `apps/web/src/features/admin-content/publish-panel.test.tsx`
- Modify: `apps/web/src/features/admin-content/content-authoring-workspace.tsx`
- Modify: `apps/web/src/features/admin-content/content-authoring-workspace.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: server preview DTO, audio/job DTOs, publish/archive methods, and current draft revision/hash.
- Produces: read-only structured preview; Generate/Retry/Play fake-audio controls; publish readiness summary; immutable published view.

- [ ] **Step 1: Write failing preview tests**

Assert lesson metadata, content, Word Banks, Language Blocks, activities, answer/explanation/evidence, and audio state come from the server preview. Assert authored text is rendered escaped and never through raw HTML.

- [ ] **Step 2: Write failing audio-control tests**

Assert generate handles 202 and polls by condition rather than fixed sleep, retry reuses its operation key, Play uses the authorized content URL, and the label `Audio mô phỏng — chưa phải giọng đọc phát hành` is always visible for fake output.

- [ ] **Step 3: Write failing publish-state tests**

Publish is enabled only for the displayed validated revision/hash with ready matching audio. Assert double click sends one request, 409 preserves source, success switches the workspace read-only and displays assigned version, and archive does not offer hard delete.

- [ ] **Step 4: Run focused tests and observe failure**

Run: `pnpm --filter @worklingo/web exec vitest run src/features/admin-content/lesson-preview.test.tsx src/features/admin-content/audio-preview.test.tsx src/features/admin-content/publish-panel.test.tsx`

Expected: FAIL because preview/audio/publish components do not exist.

- [ ] **Step 5: Implement preview, audio controls, and publish panel**

Keep the four workspace views Source, Validation, Preview, and Publish. Restore focus when changing tabs or completing modal-like actions. Avoid optimistic published state; use the parsed server response.

- [ ] **Step 6: Run all web unit tests and production checks**

Run: `pnpm --filter @worklingo/web test && pnpm --filter @worklingo/web typecheck && pnpm --filter @worklingo/web lint && pnpm --filter @worklingo/web build`

Expected: all commands PASS.

- [ ] **Step 7: Mark the Codex commit boundary**

Reserved commit: `feat: preview audio and publish authored lessons`

---

### Task 12: End-to-End Admin Journey, Format Documentation, and Final Verification

**Files:**
- Create: `apps/web/e2e/admin-content-authoring.spec.ts`
- Create: `apps/web/e2e/helpers/content-admin.ts`
- Modify: `apps/web/playwright.config.ts`
- Create: `docs/LESSON_FORMAT.md`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete Increment 2 API/UI and local setup.
- Produces: repeatable desktop/mobile acceptance journey, author-facing Format 1.0 documentation, and final verification evidence for Codex review.

- [ ] **Step 1: Write the failing desktop/mobile Playwright journey**

The test logs in as seeded Content Admin, pastes invalid source, selects an issue and verifies editor focus, repairs source, validates, previews, generates/polls/plays fake audio, publishes, and sees immutable version metadata. Use a unique lesson slug per test run.

- [ ] **Step 2: Add the learner version-boundary assertions**

Create learner session S1 before publishing N+1 and S2 afterward. Through API/UI assertions, verify S1 retains N and S2 uses N+1 on both desktop and mobile projects.

- [ ] **Step 3: Run E2E and observe the first failure before final wiring**

Run: `pnpm --filter @worklingo/web e2e -- admin-content-authoring.spec.ts`

Expected before final wiring: FAIL at the first missing or incorrect acceptance behavior; preserve the trace as evidence while fixing only that behavior.

- [ ] **Step 4: Complete only the wiring exposed by E2E**

Fix route startup, deterministic admin seed, polling cleanup, focus restoration, and responsive selectors as required by the acceptance test. Do not broaden scope into Increment 3/4 features.

- [ ] **Step 5: Document Format 1.0 and local Admin operation**

`docs/LESSON_FORMAT.md` must include the canonical template, supported fields/enums, source-location semantics, error versus warning behavior, fake-audio label, publish invariants, and one invalid example. Update API/data/local docs to match implemented names exactly.

- [ ] **Step 6: Run the full verification gate**

Run in this order:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @worklingo/api test:integration
pnpm build
pnpm --filter @worklingo/web e2e
pnpm verify
```

Expected: every command exits 0. If root `pnpm test` exposes resource contention, diagnose it; do not report a serial rerun as equivalent without recording the distinction.

- [ ] **Step 7: Inspect final scope and hand off to Codex**

Confirm `git diff --check`, inspect every changed file, scan the diff for secrets/raw source leakage, and report all generated/untracked files. Antigravity must not stage, commit, push, or create a PR.

- [ ] **Step 8: Mark the Codex commit boundary**

Reserved final commit series: use the task boundaries above; Codex chooses final atomic grouping after review.

## Execution Handoff for Antigravity

The user selected Antigravity implementation with Codex as final reviewer/fixer/committer. Antigravity must:

1. Read this plan and the linked spec completely.
2. Use `superpowers:using-superpowers` and either `superpowers:subagent-driven-development` or `superpowers:executing-plans`; use TDD, framework, review, Git-safety, debugging, and verification skills when their triggers apply.
3. Emit the repository-required `SKILL ROUTING` before work and `SKILL AUDIT` after substantial work.
4. Maintain a task artifact with every checkbox and evidence for RED/GREEN cycles.
5. Stop if the worktree is not clean at the Increment 2 baseline; do not absorb or overwrite Task 8 changes.
6. Implement tasks in dependency order, pausing for its own review gate after each task.
7. Do not commit or push. End with `Ready for Codex final review` plus status, diff summary, commands/results, skipped checks, and known risks.
