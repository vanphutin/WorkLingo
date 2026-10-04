# Increment 2: Content Authoring and Publishing Design

**Date:** 2026-10-04
**Status:** Approved conversational design, pending written-spec review
**Scope:** Local-first Content Admin authoring, validation, preview, fake audio generation, and immutable lesson publishing

## 1. Outcome

Increment 2 lets a Content Admin paste a complete WorkLingo lesson in a deterministic plaintext format, correct issues at exact source locations, preview the normalized lesson, generate local fake audio, and publish an immutable `LessonVersion` that new learner sessions can use.

The increment is complete when this journey works locally without OpenAI, Microsoft Speech, AWS, S3, Redis, or any other cloud service:

```text
paste source
→ save draft
→ parse to AST with source ranges
→ validate structure and meaning
→ preview normalized lesson
→ generate and preview fake audio
→ publish atomically
→ create a new learner session from the new version
```

A learner session created before the publish transaction must continue to use its original lesson version and activity plan.

## 2. Product decisions

- Lesson authors define complete Word Banks and Language Blocks inline in the lesson source for Increment 2.
- Published lesson, Word Bank, Language Block, content, activity, rubric, and audio references are immutable snapshots.
- Raw source is preserved byte-for-byte after parsing or validation fails.
- Parser behavior is deterministic. It does not guess, silently repair, or discard unknown input.
- Backend parsing and validation are authoritative. The frontend renders the returned AST, preview, and issues; it does not implement a second parser.
- Only `CONTENT_ADMIN` and `SYSTEM_ADMIN` may access authoring APIs.
- Public registration cannot create an administrative account. Local seed data supplies the development and E2E Content Admin.
- Desktop is the primary authoring experience. Mobile remains functionally usable through a tabbed layout.
- Fake TTS is visibly labeled as simulated audio and must never be presented as production-quality speech.

## 3. Architecture

```text
Admin editor
    │ raw source + expected revision
    ▼
Content Import API
    │
    ├── packages/content-format
    │     lexer → parser → AST + source ranges
    │                    → structural validator
    │                    → semantic validator
    │
    ├── preview projection
    ├── fake TTS port/adapter → local object storage
    └── publish service → single PostgreSQL transaction
                              │
                              ▼
                    immutable LessonVersion snapshot
```

`packages/content-format` is a framework-independent TypeScript package. It must not import NestJS, Prisma, React, browser APIs, or filesystem APIs. The API owns persistence and orchestration. The web application consumes shared contracts and server-produced preview data.

## 4. Lesson Plaintext Format 1.0

### 4.1 Canonical example

```text
FORMAT: WorkLingoLesson/1.0

[LESSON]
slug: handling-customer-complaints
title: Handling Customer Complaints
level: foundation
duration_minutes: 60
objective: Understand and respond to a customer complaint.

[WORD_BANK customer-service]
title: Customer Service

[[LANGUAGE_BLOCK apologize]]
expression: apologize
meaning_vi: xin lỗi
pronunciation: /əˈpɒlədʒaɪz/
collocations: sincerely apologize | apologize for the delay
grammar_pattern: apologize for + noun/V-ing
example: We apologize for the inconvenience.
common_error: Do not use "apologize about the delay".
[[/LANGUAGE_BLOCK]]

[/WORD_BANK]

[CONTENT complaint-email]
type: email
text:
<<<
Dear Support Team,

I am writing about my delayed order.
>>>
[/CONTENT]

[AUDIO_SCRIPT complaint-call]
speaker: customer
script:
<<<
Hello, I am calling about an order that has not arrived.
>>>
[/AUDIO_SCRIPT]

[ACTIVITY reading-01]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading
content_refs: complaint-email
language_block_refs: apologize

QUESTION:
Why did the customer contact the support team?

OPTIONS:
A. To cancel an account
B. To report a delayed order
C. To request a discount

ANSWER:
B

EXPLANATION:
The email states that the order has not arrived.

EVIDENCE:
complaint-email:3
[/ACTIVITY]
```

### 4.2 Syntax rules

- The first non-empty line is the required `FORMAT: WorkLingoLesson/1.0` declaration.
- Section and field names are ASCII and case-sensitive.
- Supported top-level sections are `LESSON`, `WORD_BANK`, `CONTENT`, `AUDIO_SCRIPT`, and `ACTIVITY`.
- `LANGUAGE_BLOCK` is valid only inside `WORD_BANK`.
- Identifiers use lowercase kebab-case and are unique in their namespace.
- Multiline values use a line containing only `<<<` to open and a line containing only `>>>` to close.
- Pipe-delimited list values trim surrounding whitespace and preserve item order.
- Input may use LF or CRLF. Source offsets refer to the original JavaScript string; line and column numbers are one-based.
- A UTF-8 byte-order mark is accepted only at the beginning of the source and is included in offsets.
- Unknown sections, fields, and directives are errors in Format 1.0.
- Duplicate scalar fields are errors. Repeated `example` and `common_error` fields are allowed and preserve order.
- Comments and implicit inheritance are not supported in Format 1.0.
- Plaintext learning-block values are `activate`, `read_decode`, `listen_reason`, and `respond`; normalization maps the middle two to the existing contract values `readDecode` and `listenReason`.
- `activity_type` is one of `reading`, `listening`, `speaking`, or `writing`. `response_type` describes the answer interaction, beginning with `multiple_choice`, `short_text`, and `shadowing` in Format 1.0.
- A listening activity declares exactly one `audio_ref` whose value is an `AUDIO_SCRIPT` identifier.

### 4.3 AST and source mapping

Every AST node and parsed field carries a source range:

```ts
export type SourcePosition = {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
};

export type SourceRange = {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
};

export type ContentIssue = {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly path?: string;
  readonly range: SourceRange;
  readonly suggestion?: string;
};
```

Ranges are half-open: `start` is inclusive and `end` is exclusive. A diagnostic for a missing token uses a zero-width range at the insertion position. The parser returns issues in source order and uses stable issue codes suitable for API clients and tests.

The AST contains authored identifiers rather than database IDs. Database IDs are assigned only during persistence or publish materialization.

## 5. Validation

Validation runs in three explicit stages and never mutates the raw source.

### 5.1 Parse validation

Parse errors include an unsupported format version, malformed section header, mismatched closing section, unclosed multiline value, invalid identifier, malformed key-value line, and content outside a legal section.

The parser recovers at the next recognizable section boundary so one run can report multiple useful errors. A recovered AST cannot be published while any parse error exists.

### 5.2 Structural validation

Structural validation checks required fields, field types, supported enum values, required lesson sections, activity payload shape, option labels, and the shape required for each activity type.

Format 1.0 supports the four Increment 1 activity types: `reading`, `listening`, `speaking`, and `writing`. Their normalized values must match the existing shared session contracts. Response-type validation is activity-specific: for example, `multiple_choice` requires options and one valid answer label, while `short_text` and `shadowing` require their deterministic evaluation fields.

### 5.3 Semantic validation

Semantic errors include:

- duplicate slugs;
- missing content, audio-script, or Language Block references;
- answer labels that do not exist in the declared options;
- evidence references outside the referenced content block or line range;
- an activity assigned to an incompatible learning block;
- missing coverage for listening, speaking, reading, or writing;
- a listening activity without a usable audio script;
- an audio artifact whose script hash does not match the current source;
- a source that cannot produce the canonical 60-minute four-block session expected by Increment 1.

Warnings include unused Word Banks, unused Language Blocks, unused content or audio scripts, missing explanations or evidence where they are recommended, suspiciously small content volume, and duplicated option text. Warnings do not block publish unless a future format version explicitly promotes the issue to an error.

## 6. Authoring state machine

```text
DRAFT ── successful validation ──► VALIDATED ── publish ──► PUBLISHED
  ▲                                      │                     │
  └──────── source edit ─────────────────┘                     ▼
                                                          ARCHIVED
```

- `DRAFT` may be edited.
- `VALIDATED` records the exact source hash, parser version, validation report, and draft revision that passed.
- Any source edit increments `draftRevision`, recalculates `sourceHash`, clears the validated hash, and moves the record to `DRAFT`.
- `PUBLISHED` is immutable through application services and database permissions available to the application.
- `ARCHIVED` remains readable by historical sessions but is ineligible for new sessions.
- A lesson has at most one current published version. Publishing a newer version archives the previous current version in the same transaction.
- Autosave and explicit save both require `expectedDraftRevision`. A mismatch returns a conflict and never overwrites the newer source.

The state diagram describes the content lifecycle across two resources: `ContentImport` owns `DRAFT`, `VALIDATED`, and the terminal authoring state `PUBLISHED`; its linked `LessonVersion` owns `PUBLISHED` and the later `ARCHIVED` state. Archiving a lesson version does not mutate the completed import record.

`ContentImport` is the mutable authoring aggregate. It stores exact raw source, status, draft revision, source hash, parser version, parsed AST, normalized preview, validation report, validation hash, creator/updater, and an optional published lesson-version reference. It can exist even when invalid source does not contain a usable lesson slug.

`LessonVersion` is not a mutable draft. Publish creates it from a validated `ContentImport`; it exists only as `PUBLISHED` or `ARCHIVED`. Its version number is assigned during publish, not inferred by the client. Existing seeded versions migrate without changing their IDs or learner-visible snapshots.

All authorized Content Admins share the authoring workspace. Actor fields and audit events record who changed a draft; optimistic revision checks prevent one admin from silently overwriting another.

## 7. Immutable Word Bank snapshots

The current stable `WordBank` identity remains reusable by slug, but authored content is versioned:

- `WordBank` owns stable identity and slug.
- `WordBankVersion` stores an immutable name, source hash, and version number.
- `LanguageBlockVersion` belongs to one `WordBankVersion` and stores the complete language data.
- `LessonVersionWordBank` references `WordBankVersion`, not a mutable `WordBank` row.
- Publishing reuses an existing Word Bank version only when its canonical content hash matches; otherwise it creates the next version.

The full normalized Word Bank and Language Block data also remains inside `LessonVersion.parsedContent`. That JSON document is the authoritative learner-facing snapshot used by the current session service. Relational snapshot rows support integrity, reuse, and future admin search without changing learner history.

Existing Foundation seed data must migrate to this model without changing its learner-visible lesson snapshot.

## 8. Audio lifecycle

```text
MISSING → GENERATING → READY
              │          │
              ▼          ▼
            FAILED      STALE
```

An `AudioArtifact` records its content import, authored audio-script slug, script hash, adapter name, voice configuration, MIME type, byte size, checksum, storage key, lifecycle status, and failure summary. Publish creates immutable lesson-version audio references to the ready artifacts.

- The fake TTS adapter implements a provider-independent `TextToSpeechPort`.
- It writes deterministic, valid fixture audio to the existing local object-storage adapter.
- Generated files live under the configured WorkLingo local data directory; no repository fixture is overwritten at runtime.
- The UI labels fake output as `Audio mô phỏng — chưa phải giọng đọc phát hành`.
- Editing an audio script marks the matching prior artifact `STALE`.
- Publish requires every audio script needed by a listening activity to have a `READY` artifact whose script hash matches the current validated source.
- Generate and retry operations use an idempotency key and cannot create duplicate files or artifacts.
- A referenced artifact cannot be physically deleted. Cleanup removes only unreferenced stale or failed artifacts after a retention threshold.
- Storage keys are server-generated. User-provided paths are never accepted.

The endpoint preserves the existing `202 Accepted` contract by creating a minimal PostgreSQL-backed generation job and exposing its status through the existing jobs contract. Increment 2 implements only the behavior needed for fake audio generation; generalized provider retry/backoff remains Increment 4 scope.

## 9. Publish transaction

The publish request contains `expectedDraftRevision`, `expectedSourceHash`, and `idempotencyKey`.

Within one PostgreSQL transaction, the service:

1. acquires a transaction-scoped lock for the logical lesson;
2. loads the `ContentImport` and verifies administrative access;
3. verifies the expected revision and source hash;
4. verifies the validation report belongs to the same source hash and parser version;
5. verifies that no blocking issue remains and required audio is ready;
6. assigns the next lesson version number;
7. resolves or creates the logical lesson from the validated lesson slug, then materializes the new lesson version, content blocks, activities, Word Bank versions, Language Block versions, and audio references;
8. archives the previous current published version;
9. marks the content import published, links it to the lesson version, and records actor/time;
10. updates `Lesson.currentPublishedVersionId`;
11. writes the audit event and idempotency result.

Any failure rolls back all database changes. Storage generation occurs before publish and is not part of the database transaction. Orphan cleanup handles an unreferenced generated file safely.

The idempotency record is scoped to actor, operation, and key. Repeating an identical completed request returns the original result. Reusing the key with a different request hash returns a conflict.

## 10. Session version isolation

- Session creation reads `Lesson.currentPublishedVersionId` once while creating the session.
- `LearningSession.lessonVersionId` and `planSnapshot` are never changed by a later publish or archive.
- Activity loading continues to resolve through the session's stored lesson version.
- A session created before publish N+1 continues to use version N.
- A session created after the N+1 transaction commits uses N+1.
- Archived versions, activity rows, audio artifacts, and normalized snapshots referenced by sessions cannot be hard-deleted.

These rules extend the isolation already present in Increment 1; the publishing implementation must not add a runtime lookup for “latest version” to existing sessions.

## 11. API contracts

All routes are under `/admin` and require `CONTENT_ADMIN` or `SYSTEM_ADMIN`:

```text
GET    /admin/content-imports
POST   /admin/content-imports
GET    /admin/content-imports/{id}
PATCH  /admin/content-imports/{id}/source
POST   /admin/content-imports/{id}/validate
GET    /admin/content-imports/{id}/preview
POST   /admin/content-imports/{id}/generate-audio
GET    /admin/content-imports/{id}/audio
POST   /admin/content-imports/{id}/publish
POST   /admin/lesson-versions/{id}/archive
GET    /jobs/{id}
```

The API operates on `ContentImport` authoring records. The shared contracts package owns request, response, preview, issue, job-status, and error schemas.

Stable domain error codes are:

```text
CONTENT_PARSE_FAILED
CONTENT_VALIDATION_FAILED
DRAFT_REVISION_CONFLICT
SOURCE_HASH_MISMATCH
AUDIO_NOT_READY
AUDIO_SCRIPT_STALE
VERSION_ALREADY_PUBLISHED
LESSON_VERSION_IN_USE
IDEMPOTENCY_KEY_REUSED
FORBIDDEN
```

Expected HTTP behavior:

- `201` for draft creation;
- `200` for reads, source updates, validation, and idempotent replay of a completed publish;
- `202` for accepted audio generation;
- `400` for malformed transport requests;
- `403` for missing administrative permission;
- `404` for inaccessible or absent resources;
- `409` for revision, source hash, state, or idempotency conflicts;
- `422` when source is stored successfully but cannot validate or publish.

## 12. Admin UI

Routes:

```text
/admin/content
/admin/content/new
/admin/content/{importId}
```

The authoring page has four views: Source, Validation, Preview, and Publish.

On desktop, Source and Validation use a two-column workspace. The source editor shows line numbers. Selecting an issue focuses the editor and moves the caret to the issue's start position. The editor retains the exact source returned by the API after errors or reload.

Autosave uses a short debounce and visibly reports `Saving`, `Saved`, or `Conflict`. A conflict preserves both the unsaved local text and the server revision; it does not silently choose one. Revalidation is explicit so content does not change state while the author is typing.

Preview renders the normalized lesson from the backend, including lesson metadata, content blocks, Word Banks, Language Blocks, activities, answers, explanations, evidence, and audio state. It does not expose answers through learner-facing components.

Generate, Retry, and Play controls appear beside audio scripts. Publish remains disabled until the currently displayed revision is validated and all required audio is ready. After publish, the source and preview become read-only and show the assigned version.

On narrow screens the four views become accessible tabs. Keyboard navigation, visible focus, form labels, issue announcements, and focus restoration are required. Desktop remains the optimized authoring surface.

## 13. Error handling and security

- Raw source is treated as data and is never executed, interpolated into SQL, or used as a storage path.
- Source size, section count, multiline block size, activity count, option count, and nesting depth have configured limits.
- Parser and validator return bounded issue counts with an explicit truncation indicator.
- Logs contain import IDs, issue codes, correlation IDs, state transitions, and hashes; they do not contain raw lesson source, secrets, or generated audio bytes.
- API responses do not reveal whether another user's inaccessible resource exists.
- Generated preview text is escaped by React; author source is never inserted as raw HTML.
- Publish and archive write audit events with actor, resource, old state, new state, and safe metadata.
- A database trigger rejects changes to published/archived lesson snapshot fields and child snapshot rows. It permits only the explicit `PUBLISHED` to `ARCHIVED` status transition and safe audit metadata updates.

## 14. Test strategy and required gates

### 14.1 Parser and validator unit tests

- canonical valid fixture;
- LF, CRLF, UTF-8 Vietnamese text, and leading BOM;
- exact line, column, offset, and half-open range behavior;
- malformed and unclosed sections or multiline values;
- unknown or duplicate fields;
- parser recovery and source-ordered issues;
- duplicate and missing references;
- invalid answers and evidence;
- missing four-skill coverage;
- stale or missing audio;
- warnings that do not block publish.

### 14.2 Persistence and integration tests

- raw source survives parse and validation failures unchanged;
- editing validated source returns it to `DRAFT`;
- concurrent edits produce a revision conflict without data loss;
- publish rollback leaves no partial version or child rows;
- publish retry does not create a second version;
- published source and snapshot cannot be edited;
- Word Bank versions are reused only for identical canonical hashes;
- archiving cannot break a referencing session;
- version N session survives publish N+1, while a new session receives N+1;
- fake audio generation is idempotent and path-safe;
- learners are rejected from every authoring route, while authorized admins share the workspace with revision-safe writes.

### 14.3 Frontend and E2E tests

- invalid source displays issues and selecting one focuses the correct source location;
- source survives reload;
- revision conflict preserves local work;
- successful validation renders the structured preview;
- fake audio can be generated, polled, and played with its simulation label;
- publish produces a read-only version view;
- learner session created afterward uses the new version;
- the complete Admin flow passes at desktop and mobile viewports;
- keyboard-only navigation and accessible issue announcements pass smoke coverage.

### 14.4 Completion gates

- parser fixture suite and invalid-source matrix pass;
- API unit and PostgreSQL integration suites pass;
- shared contract tests pass;
- desktop and mobile Playwright Admin journeys pass;
- Increment 1 learner, ownership, idempotency, checkpoint, and resume tests remain green;
- lint, typecheck, production build, and repository verification pass;
- the complete flow runs after local setup with no external provider credentials.

## 15. Non-goals

- Live OpenAI, Microsoft Speech, or production TTS integration.
- AI-generated curriculum or automatic rewriting of admin source.
- General-purpose background worker reliability, exponential backoff, or distributed queues.
- Collaborative real-time editing.
- Rich WYSIWYG authoring.
- Complete curriculum management, approval chains, or content analytics.
- Cloud storage, cloud deployment, mobile-native applications, or offline synchronization.
- Import formats other than `WorkLingoLesson/1.0`.

## 16. Acceptance criteria

Increment 2 is accepted when:

1. A seeded Content Admin can create and reload a draft while preserving exact raw source.
2. Invalid source produces stable issues with verified line, column, and offset ranges.
3. Valid source produces a deterministic normalized preview covering four skills.
4. Required listening scripts obtain matching ready fake-audio artifacts through the local lifecycle.
5. Publishing is atomic, revision-safe, hash-safe, and idempotent.
6. Published snapshots cannot be edited and archived snapshots remain readable.
7. A pre-existing session keeps version N after N+1 is published.
8. A newly created session selects N+1 after the publish transaction commits.
9. The Admin flow is usable on desktop and mobile and passes the required automated gates.
10. No external AI, speech, storage, queue, or cloud service is required.
