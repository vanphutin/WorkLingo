# Grouped Comprehension Authoring 1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Author multiple stable reading/listening questions per activity with private pedagogical metadata while preserving old formats and runtime payloads.
**Architecture:** Add a version-specific parser/validator and optional root metadata in existing JSON snapshots. Existing MCQ executor, activity records, planner and scoring are reused.
**Tech Stack:** TypeScript, Vitest, Zod, NestJS, Prisma/PostgreSQL, React Testing Library; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-16-intermediate-b1-content-authoring-design.md.
**Authority:** Human “ok,tiếp” after the concrete authoring recommendation on 2026-10-16 accepts this bounded implementation. Inline execution persists from W3. AI is the selected content reviewer; no human credential is asserted.

## Global Constraints

- Preserve Format 1.0/1.1 normalized semantics and existing published/paused session bindings.
- Format 1.2 supports 1–20 question groups per comprehension activity; 200 questions per lesson; 2–10 options; current 500,000 source / 50 activity / 200 top-level section limits remain.
- Keep option labels A…J contiguous for 1.2 only; lesson-wide stable question slugs.
- No free-speaking executor, admission/catalogue/seed changes, migration, external provider, learner publication, policy changes or integration into main.
- Metadata remains private and optional; missing cognition/entities are absent. No guessed timing.
- Keep work in existing isolated checkout; no commit/push/merge under this slice. Preserve uncommitted W0/W3 work.

## Review Focus

1. Missing nested close followed by another activity must recover without swallowing it — Task 1.
2. Direct snapshot parsing must reject orphan metadata and misleading objective coverage — Task 2.
3. Unknown format annotations or legacy mixed question syntax must fail rather than silently drop content — Task 1.
4. Publishing must retain root metadata through allowlists without changing relational activity parity — Task 2.
5. Learner retrieval and MCQ selections must not expose private annotations or lose grouped items — Task 3.

### Task 1: Format 1.2 parse, validate and normalize

**Files:** modify content-format ast.ts/parser.ts/validator.ts/normalizer.ts/index.ts; create grouped-activity-parser.ts, lesson-pedagogy.ts and format-1-2.spec.ts; create test-fixtures grouped-authoring.fixture.ts and export it.
**Interfaces:** parseLessonSource(source) retains ParseLessonResult; ActivityNode.questions?: QuestionNode[]; NormalizedLessonDraft.pedagogy?: LessonPedagogyV1; stable question slug is preserved. LessonPedagogyV1 exact fields are in the spec.
- [x] Write a supported synthetic shadowing fixture with two questions per reading/listening group. Assert analysis.canPublish=true, two distinct question slugs/answers/evidence and inherited/explicit metadata.
- [x] Add malformed-table tests (mixed syntax, duplicates, unknown fields/ref/cognition/entities, invalid lines/labels/answers, out-of-parent/missing close, unsupported response, limits); test BOM/CRLF Vietnamese range and legacy fixture outputs.
- [x] Run `pnpm --filter @worklingo/content-format test`; expected new positive-format tests FAIL because 1.2 unsupported; legacy tests PASS.
- [x] Implement isolated 1.2 activity parsing, bounded semantic validation and normalization; preserve legacy branches. Field ranges locate item/field issues; next-activity recovery is explicit.
- [x] Run same package suite; expected all PASS. Record TDD evidence and no commit ruling in ledger.

### Task 2: Snapshot metadata and publication roundtrip

**Files:** modify curriculum/domain/curriculum.types.ts, content-publisher.service.ts; add curriculum/domain/lesson-pedagogy-schema.ts and spec; extend test/integration/content-publish.integration.spec.ts and existing service tests as necessary.
**Interfaces:** lessonSnapshotSchema accepts optional pedagogy version 1, rejects simultaneous foundation/pedagogy, validates item/objective/activity keys and actual skill coverage; ContentPublisherService preserves normalizedDraft.pedagogy in parsedContent; relational payload shape remains unchanged.
- [x] Write snapshot tests: valid metadata survives parse; orphan refs, wrong actual skill coverage, duplicate item slugs, invalid bounds and dual provenance reject; legacy fixture unchanged.
- [x] Write integration roundtrip using synthetic grouped source, existing FakeTts only in disposable schema, idempotent publish and DB children equal snapshot. Attach published version to an isolated mission and read via CurriculumService to exercise parity.
- [x] Run focused unit/integration tests; expected metadata stripped/missing in snapshot/publisher tests before implementation.
- [x] Add bounded schema and referential checks, publisher whitelist. No schema migration or activity metadata column.
- [x] Run `pnpm --filter @worklingo/api test -- src/curriculum/domain/lesson-pedagogy-schema.spec.ts test/integration/content-publish.integration.spec.ts test/integration/content-imports.integration.spec.ts test/integration/content-audio.integration.spec.ts`; expected PASS.

### Task 3: Learner privacy, grouping regression and handoff

**Files:** extend learning-sessions.service.spec.ts and web activity-renderers/reading-activity tests; docs/LESSON_FORMAT.md; reports/plan evidence.
**Interfaces:** existing getActivity DTO contains question slug/prompt/options only; no root pedagogy or private models newly added. Existing MCQ renderer submits one answer per question.
- [x] Add service regression with grouped items plus distinctive private metadata; assert all grouped public items retained and private metadata absent.
- [x] Add renderer regression selecting different answers in two questions and preserving both selections. Run focused tests before changes; if already green, retain only meaningful characterization and do not alter executor.
- [x] Document complete 1.2 grammar/private metadata/limits and remaining content gates.
- [x] Run root `pnpm test`, `pnpm typecheck`, `pnpm lint`, API/web builds and mandate validate; expected PASS. Test failures by name go in report.
- [x] One fresh final review using requesting-code-review/code-review-and-quality; one Critical/Important fix pass with red/green and full suite if needed. No re-review. Record rulings and limits.
- [x] Preserve code in worktree and synchronize owned planning/review artifacts to original checkout; no public content or data operations. No worktree cleanup while changes remain uncommitted.

## Self-review

Task 1 produces the exact metadata consumed by Task 2; Task 2 keeps question payloads consumed by Task 3 unchanged. Grammar and root metadata are the only new interfaces. Content review JSON is a separate non-importable editorial artifact. The five Review Focus risks each have a named test class above. No separate sprint board is created.
