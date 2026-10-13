# IELTS Phase 3 — Foundation Learning Plan

## Task 1 — Grammar vertical slice

1. Add failing public-seam tests for category, teaching panel, feedback, mastery, and review.
2. Version the seeded lesson as a complete `foundation-grammar` lesson.
3. Expose nullable learner-safe `foundationCategory` through API, Swagger, and web validation.
4. Render a responsive Grammar Focus panel from versioned Language Blocks.
5. Return missed-question explanations after deterministic submission.
6. Run focused component/integration tests, lint, and typecheck.
7. Review and commit the slice.

## Task 2 — Pronunciation vertical slice

Reuse speaking recording, consent, STT pronunciation metrics, immutable lesson audio, Teacher AI feedback, mastery, and review. Add a pronunciation-focused teaching panel and one end-to-end shadowing journey. Do not derive an official IELTS score.

Status: implemented at component/service seams. The final Phase 3 E2E gate will exercise the complete
shadowing journey after the remaining Foundation categories are present.

## Task 3 — Vocabulary vertical slice

Teach Word Bank expressions in context, require retrieval rather than recognition alone, and verify that review selection transfers the same Language Block into a new workplace context.

Status: implemented and covered at component/domain seams.

## Task 4 — Four-skill Foundation completion

Complete focused reading, listening, speaking, and writing lesson variants, then verify persistence, feedback, mastery isolation, scheduled review, responsive behavior, and accessibility.

Status: implemented. The seeded 60-minute journey now proves Grammar instruction, contextual reading,
version-bound listening, pronunciation shadowing, recording consent, writing transfer, checkpoint
restore, progress persistence, and responsive desktop/mobile behavior.

## Verification policy

- Run only touched component/domain/integration tests during each task.
- Run package typecheck/lint before each atomic commit.
- Run build and full E2E once at the Phase 3 merge gate.
- Never call real AI or speech providers from automated tests.
