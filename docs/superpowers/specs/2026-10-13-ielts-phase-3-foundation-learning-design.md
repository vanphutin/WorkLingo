# IELTS Phase 3 — Foundation Learning Design

## Goal

Deliver Foundation learning as tested vertical slices, beginning with:

`Grammar lesson → contextual practice → submit → actionable feedback → mastery evidence → scheduled review`.

The implementation extends the existing WorkLingo lesson, session, attempt, mastery, and review pipelines. It must not introduce a second learning engine or a grammar-only score that competes with the four-skill model.

## Reused architecture

- Format 1.1 and immutable `LessonVersion` remain the authoring and publishing boundary.
- `foundation.category` identifies the pedagogical focus of a lesson.
- `LanguageBlock.grammarPattern`, examples, Vietnamese meaning, and common errors provide teachable material.
- Reading/listening deterministic evaluation and Teacher AI speaking/writing evaluation remain the submission paths.
- Evaluated attempts continue to create `MasteryEvent`, `MasteryRecord`, Error Bank, and review-queue evidence.
- Existing session pinning guarantees that publishing a newer lesson does not mutate active sessions.

## Grammar slice

The seeded first workplace lesson is classified as `grammar` and carries one required four-skill objective. Learner-safe activity responses expose only the lesson category and already-published language-block teaching fields; answer keys, evidence, and pre-submit explanations remain private.

Before practice, the learner sees a Grammar Focus panel containing:

- canonical workplace expression;
- Vietnamese contextual meaning;
- reusable grammar pattern;
- examples in context;
- common-error correction.

After an incorrect comprehension submission, feedback includes only explanations for missed questions. Correct answers are not exposed before submission. The attempt still drives the existing mastery and spaced-review pipeline.

## API change

`GET /api/v1/learning-sessions/:sessionId/activities/:activityId` adds nullable `foundationCategory`.

Compatibility rules:

- historical lesson snapshots without Foundation metadata return `null`;
- learner clients accept the field as optional during rolling local upgrades;
- no answer key or hidden evidence is added to the activity response.

## Phase 3 expansion order

1. Grammar vertical slice and acceptance evidence.
2. Pronunciation focus using versioned audio, shadowing, and speech metrics.
3. Vocabulary focus using contextual retrieval and cross-context transfer.
4. Reading/listening/speaking/writing Foundation slices using the same mastery model.
5. End-to-end responsive/accessibility regression and Phase 3 release review.

## Acceptance criteria

- A published Grammar lesson displays its pattern, example, and common error before practice.
- An incorrect answer returns authored, question-specific feedback without leaking answer keys beforehand.
- The evaluated attempt updates mastery and places weak evidence in the review queue.
- Another learner cannot see that evidence.
- Historical snapshots remain readable and return a null category.
- Component, API integration, typecheck, lint, build, and final E2E gates pass before Phase 3 merge.

## Out of scope for the first slice

- A new `grammar` activity type or separate grammar mastery scale.
- Official IELTS band scoring.
- Automatic content publication.
- Production cloud storage or provider changes.
