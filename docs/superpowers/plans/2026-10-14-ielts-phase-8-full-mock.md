# IELTS Phase 8 — Academic Full Mock Implementation Plan

## Constraints

- Preserve all Phase 1–7 data and routes; additive migration only.
- Reuse auth, audit, idempotency, local audio, Teacher AI job and immutable publishing patterns.
- No copyrighted IELTS content; seed synthetic structure/content solely for local acceptance testing.
- Never turn AI-only Writing/Speaking feedback into a reviewed section band.
- Use focused tests while implementing; run the repository gate only after review.

## Slices

1. **Contracts and scoring policy:** RED/GREEN exact structure, answer normalization/word limits,
   configurable conversion, Task 2 weighting and overall rounding.
2. **Persistence:** immutable mock/version, attempt/response, section submission, productive review,
   report snapshot, constraints/triggers and migration rehearsal.
3. **Admin publishing:** synthetic Academic seed, validate/publish, audit/idempotency and safe DTOs.
4. **Learner attempt engine:** pathway gate, version pin, server timers, autosave, ordered submit,
   objective score and pending productive evaluation.
5. **Review and report:** teacher-reviewed rubric command, deterministic report completion,
   strengths/gaps/actions and explicit mock-only disclosure.
6. **Responsive web:** Admin author/review; learner catalog/workspace/report; keyboard and mobile.
7. **Qualification:** API integration, desktop/mobile version-isolation journey, docs, review, then one
   final verification gate.

