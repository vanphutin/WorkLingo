# IELTS Phase 8 — Academic Full Mock Design

## Goal and source boundary

Phase 8 adds a local-first, version-bound IELTS Academic mock engine with authoring, timed attempts,
objective scoring, rubric evaluation workflow and actionable reports. It follows the current official
IELTS structure: Listening has four parts and 40 questions; Academic Reading has three sections and
40 questions; Writing has two tasks in 60 minutes with Task 2 weighted twice; Speaking has three
parts and lasts approximately 11–14 minutes. The product calls every result a **mock estimate**, never
an official IELTS result. General Training is an explicit future variant, not silently scored with the
Academic conversion.

References checked 2026-10-14:

- https://ielts.org/take-a-test/test-types/ielts-academic-test
- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening
- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading
- https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing
- https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail

## Product decisions

- Phase 8 ships Academic first. The persisted variant is closed and future-compatible with
  `GENERAL_TRAINING`, but only `ACADEMIC` may publish in this phase.
- `LEARNING`, `PRACTICE`, and `EXAM_SIMULATION` are distinct attempt modes. Learning may expose
  authored explanations after an answer; Practice gives feedback only after section submission;
  Exam Simulation hides answers, explanations, transcripts and section feedback until final submit.
- Full mocks require a started Phase 7 Band Pathway and one published eligible mock version.
- Listening audio is played under the existing published-audio policy. Exam Simulation records a
  server-owned play event and does not expose replay controls after the allowed play count.
- Listening and Reading use deterministic authored answer policies: accepted variations,
  normalization, word limits and a configurable version-bound raw-to-band table.
- Writing stores Task 1 and Task 2 independently. Four rubric criteria are persisted per task;
  Task 2 carries twice the weight. An unreviewed/AI-only result remains `PENDING_EVALUATION` or
  `ESTIMATED_FEEDBACK`; only `TEACHER_REVIEWED` rubric values may produce the report's Writing band.
- Speaking stores Parts 1–3 and the four official criteria. Automatic transcript/feedback may be
  `ESTIMATED_FEEDBACK`; only `TEACHER_REVIEWED` values may produce the report's Speaking band.
- Overall mock estimated band is calculated only when all four section bands are available, using
  the official average and quarter/three-quarter rounding rule. It is labelled mock-only and stores
  its scoring-policy version. No result updates Phase 7 progression or any official-result field.

## Versioned content

One `IeltsMockTest` draft owns:

- metadata: title, variant, duration policy, eligibility and disclosure;
- Listening: exactly 4 parts and 40 ordered objective questions, published audio references;
- Reading: exactly 3 passages and 40 ordered objective questions;
- Writing: exactly Task 1 and Task 2 prompts, minimum words 150/250 and rubric descriptors;
- Speaking: exactly Parts 1, 2 and 3 prompts and response timing policy;
- separate Academic Listening and Reading raw-score conversion tables;
- actionable feedback mappings from question/rubric tags to Phase 7 competencies and recommended
  practice formats.

Admin edits the draft as validated JSON in the first vertical slice. Validation rejects incomplete
counts, duplicate orders, broken assets, invalid word-limit policies, conversion gaps, unsafe answer
projection and missing rubric/feedback mappings. Publish is atomic, audited, idempotent and creates
an immutable `IeltsMockTestVersion` while archiving the old current version.

## Attempt state machine

`NOT_STARTED → IN_PROGRESS → SUBMITTED → EVALUATION_PENDING → COMPLETED`

- Start is idempotent by learner/client UUID and pins the current published version.
- Attempts are owner-scoped. Responses autosave with optimistic revision and server timestamps.
- Server owns section order, section deadlines and submission. Reload resumes without resetting time.
- Expiry marks the current section submitted but never invents unanswered values.
- Final submission freezes objective responses and creates evaluation placeholders for productive
  skills. A teacher/admin review command is revision-safe, audited and idempotent.
- Reports are durable snapshots. Objective details become visible according to mode; answer keys and
  private rubric guidance never appear before allowed release.

## Public seams

Admin:

- `GET /api/v1/admin/ielts-mocks`
- `PUT /api/v1/admin/ielts-mocks/:id/draft`
- `POST /api/v1/admin/ielts-mocks/:id/validate`
- `POST /api/v1/admin/ielts-mocks/:id/publish`
- `POST /api/v1/admin/ielts-mock-attempts/:id/reviews`

Learner:

- `GET /api/v1/me/ielts-mocks`
- `POST /api/v1/me/ielts-mock-attempts`
- `GET /api/v1/me/ielts-mock-attempts/:id`
- `PUT /api/v1/me/ielts-mock-attempts/:id/responses`
- `POST /api/v1/me/ielts-mock-attempts/:id/sections/:section/submit`
- `POST /api/v1/me/ielts-mock-attempts/:id/submit`
- `GET /api/v1/me/ielts-mock-attempts/:id/report`

Web:

- Admin authoring and review at `/admin/ielts-mocks`.
- Learner catalog at `/ielts/mock-tests`, workspace at `/ielts/mock-tests/:attemptId`, and durable
  report on the same version-bound attempt.

## Acceptance criteria

1. Contracts reject any Academic full mock that is not 4/40 Listening, 3/40 Reading, 2 Writing and
   3 Speaking parts, or whose conversion tables do not cover raw scores 0–40.
2. Publish and review commands are role-protected, revision-safe, idempotent and audited.
3. Attempt start is pathway-gated, owner-scoped, version-bound and idempotent.
4. Timers and answers survive reload; server rejects skipped section order and stale writes.
5. Objective scoring honors accepted variations, normalization and word limits.
6. Writing Task 2 weighting and overall rounding are deterministic and version-bound.
7. Pending/estimated productive evaluation cannot produce a completed mock band.
8. Reports separate raw scores, section mock bands, feedback status, strengths, gaps and next actions,
   and never claim an official result.
9. A republish does not alter an existing attempt; a new attempt receives the new version.
10. Focused unit/integration/component tests plus desktop/mobile E2E pass before the final gate.

