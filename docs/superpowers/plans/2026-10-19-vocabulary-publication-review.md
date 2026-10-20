# Vocabulary publication review Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks inline. User explicitly requests implementation and quota savings; use one bounded final reviewer.

**Goal:** Require admin to resolve vocabulary duplicates before publishing Intermediate topic lessons, while retaining each lesson/topic usage.
**Architecture:** Existing LanguageBlock IDs represent reusable senses. Add indexed normalized expressions and explicit LessonVocabularyUsage records; backfill existing publication usage. A read-only preflight returns candidates + their topic/lesson contexts and a source/catalog-bound review hash. Publication validates every decision under vocabulary locks, creates a separate sense or explicitly reuses an eligible ID, freezes the chosen definitions into snapshots, and records usage atomically.
**Tech Stack:** Existing Prisma/Postgres, NestJS, Zod contracts, React/Next.js and EN/VI UI; no new dependencies or AI calls.
**Spec:** Requirements below reproduce the current authorized user request.

## Requirements / Global Constraints
- Before publication, show whether each JSON vocabulary expression already exists; admin chooses reuse or new meaning for each duplicate, without automatic merging.
- Reused meanings share canonical ID/mastery; new meanings have separate IDs. Every publication retains its lesson and topic context.
- Do not change question counts, source text, duration approval, audio or existing publication history.
- Require source/revision/catalog-bound choices server-side; stale or tampered choices cannot publish. Preserve non-topic authoring compatibility and idempotency.
- Keep concurrent landing/admin changes untouched; no real publication of the user's content.

## Review Focus
- Same expression, different meaning must not merge automatically.
- Shared senses across topic-specific banks must have consistent snapshot IDs/references and distinct usage contexts.
- Catalog/source/topic changes during review must invalidate the decisions.
- Changing choices must create a new mutation key; network retries reuse the exact key.
- Casing/spacing normalization, legacy rows and candidate history must remain discoverable without destructive data changes.

### Task 1: Data and publication review API
**Files:** Prisma schema + migration; contracts vocabulary-publication.contracts.ts; content-authoring/application/publication-vocabulary.ts; content publisher, imports service/controller/DTO; new PostgreSQL integration tests and existing topic-publication fixtures.
**Interfaces:** GET /admin/content-imports/:id/vocabulary-review -> VocabularyPublicationReview. Publish input vocabularyReview?: {reviewHash, choices:[{sourceSlug, action:'reuse', languageBlockId}|{sourceSlug, action:'new'}]}.
- [x] Write/run failing contract + isolated-schema integration tests for explicit decisions, shared usage across two topics, new meaning, stale/tampered choices and idempotency.
- [x] Add normalized expression trigger/index and publication usage migration/backfill; implement preflight and locked choice validation/materialization.
- [x] Run focused API/contracts suites and type/lint checks; preserve legacy publication tests.

### Task 2: Admin choices before publication
**Files:** API client; admin-content vocabulary-review.tsx + CSS; PublishPanel/workspace; EN/VI messages; component/client tests.
**Interfaces:** PublishPanel enables topic vocabulary review; selected choices are included in the exact publication request.
- [x] Write/run failing UI tests for disabled publication until complete, explicit old/new choice, topic context, retry/source-change invalidation and exact payload.
- [x] Implement a compact comparison list with incoming meaning, candidate meanings and topic/lesson labels. New expressions are labeled new; duplicates have no default decision.
- [x] Preserve choices for a failed retry; reset/recheck after source/catalog conflicts. Use payload-sensitive stable mutation keys and block editing during publish.
- [x] Run focused checks and browser verification at desktop/mobile, then one bounded independent review and inspect the final diff. Commit only feature files.

## Verification and review
- Focused API suites: 39 passing tests, including 6 real PostgreSQL integration regressions for vocabulary decisions and 8 legacy publication regressions.
- Web suites: 34 passing tests across API client, publication panel, vocabulary review and authoring workspace. Contract regression: 1 passing test.
- API/web type checks, API build and touched-file lint passed; migration deployed to the local database and tested in an isolated schema.
- Browser smoke: Vietnamese/dark desktop (1440px) and English/light mobile (375px), explicit duplicate selection, publish payload, no overflow or page errors. Publication was mocked.
- Real draft publication was also exercised inside a rollback-only transaction: five vocabulary usages materialized; the persisted user draft remains VALIDATED.
- Independent review identified cross-program mastery membership and topic-rename staleness. Both were fixed and covered by real database regressions. Source aliases reusing the same meaning are deduplicated in bank snapshots while retaining separate usage records.
- Review fetches bypass browser cache. No AI/provider calls, full-repository test run, user content publication, push or merge were performed.
- Matching is exact after Unicode, case and whitespace normalization. Different spellings and synonyms are intentionally left for admin judgment.
