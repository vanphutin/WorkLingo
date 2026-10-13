# IELTS Phase 5 — Bridge Design

Status: approved for implementation by the user's request to continue Phase 5 on 2026-10-13.

## Outcome

Move a learner who completed IELTS Orientation into a gradual, four-skill bridge. The bridge teaches
how IELTS task families work before Phase 6 introduces integrated 60–150 minute practice. It must
teach reasoning and strategy, not keyword matching or answer memorisation.

## Scope

- A versioned IELTS question-type taxonomy covering the task families listed in the master prompt.
- Admin-authored bridge modules with immutable published versions.
- One skill and one question type per module, expressed as a required ten-stage learning cycle.
- Learner catalog, eligibility, version-bound progress, resume, feedback and completion.
- A real timed-practice introduction with an explicit timer and durable outcome.
- Initial local-first seed modules for Listening, Reading, Writing and Speaking.
- Responsive Admin and learner web journeys with keyboard and screen-reader support.

## Explicit non-goals

- Band estimates, official-result claims, full mock tests or a 0–9 progression model.
- Integrated 60/90/120/150-minute IELTS sessions; Phase 6 owns them.
- Copying copyrighted IELTS questions or claiming unmeasured similarity to an official exam.
- Cloud storage, paid providers or a second general-purpose lesson/session engine.

## Taxonomy

The registry is stable and versioned in contracts. It includes:

- Listening: form completion, note completion, multiple choice, matching, map/plan labelling and
  sentence completion.
- Reading: true/false/not given, yes/no/not given, matching headings, matching information,
  multiple choice, summary completion, sentence completion and short answer.
- Writing: task analysis, brainstorming, paragraph structure, thesis statement, topic sentences,
  coherence/cohesion, Task 1, Task 2 and self-editing.
- Speaking: Part 1, Part 2 cue card, Part 3 discussion, fluency, idea development, pronunciation,
  vocabulary range and grammar range.

Taxonomy labels are product-owned descriptions, not copied test content.

## Ten-stage cycle

Every published module contains exactly one stage of each type, in this order:

1. `introduction`
2. `assessment_purpose`
3. `analysed_example`
4. `guided_model`
5. `easy_practice`
6. `increased_practice`
7. `independent_practice`
8. `timed_practice`
9. `feedback`
10. `review`

Each stage has a stable slug, title, instruction, strategy steps and a learner task. Supported task
kinds are `instruction`, `single_choice`, `multi_choice`, `short_text` and `spoken_response`.
Only the timed stage has `timeLimitSeconds`; the value is 30–1800 seconds. Answer keys and rubrics
remain server-side. Feedback is returned only after submission.

## Data and versioning

- `IeltsBridgeModule` owns mutable draft content, revision and the current published pointer.
- `IeltsBridgeModuleVersion` stores an immutable snapshot, skill, question type and version number.
- `IeltsBridgeProgress` pins one learner to one module version and stores the current stage, revision,
  stage results, timer state and completion time.
- One learner can have only one progress row per module. Starting is serialized in a short
  transaction and replays the existing pinned version.
- Foreign keys are indexed. Learner/module and learner/status indexes match catalog/resume queries.
- Published version update/delete is blocked by a database trigger, matching Orientation policy.

## Eligibility and progression

Bridge catalog access requires a completed `OrientationProgress`. External certificates do not
bypass this rule. A learner already pinned to a module version may continue if a newer version is
published or the old release is archived.

The first release requires completion of four seed modules—one per skill—to mark Bridge complete.
This completion is durable evidence for Phase 6. Phase 5 does not change the learner's active program
or expose a band score.

## Admin workflow

Admin can list modules, edit a draft, reorder stages, validate, preview, publish and archive. Publish
requires all ten stages, unique slugs, a valid task for practice stages, a valid timed stage, transcript
or text alternatives for media, and no answer leakage in learner-facing fields. Optimistic revisions
return 409 on stale edits. Publish uses an idempotency key and an atomic transaction.

## Learner workflow

The learner sees locked reasons or a four-skill module catalog, starts/resumes one module, reads the
strategy before practice, submits each task, receives authored feedback and completes the review.
The timer starts only after an explicit action. Expiry does not discard work; the server records
`timedOut: true` and still accepts one final submission. Refresh restores stage and timer state.

## Privacy, security and accessibility

- Learner DTOs never contain answer keys, rubrics, unpublished drafts, storage keys or other learners.
- Admin routes require `CONTENT_ADMIN`; learner routes are owner-scoped.
- Audit metadata contains stable IDs and revisions only, never responses.
- Timers announce remaining time without noisy per-second live-region updates and respect reduced
  motion. Controls have labels, focus states and 44px targets.

## Acceptance criteria

1. Contract tests reject unknown question types, missing/reordered stages and invalid timers.
2. Migration tests prove immutable versions, indexed ownership and version-bound progress.
3. Admin integration tests prove validate/publish/archive, stale revision and idempotent publish.
4. Learner integration tests prove Orientation gating, owner isolation, resume, answer secrecy,
   timed outcome and version isolation.
5. Desktop/mobile E2E proves one Admin publish and one learner four-skill Bridge journey.
6. Existing Foundation, Orientation, audio and Teacher AI tests remain green.

