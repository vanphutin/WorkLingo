# IELTS Phase 2 Curriculum Foundation Review

## Delivered

- Versioned mission objective definitions with validation, immutable publication, and exact-revision prerequisites.
- Active-program eligibility and session pinning through nullable `curriculumRevisionId`.
- Server-derived objective evidence, durable completion, and `locked`/`available`/`in_progress`/`completed` roadmap states.
- Responsive learner roadmap and an acceptance journey covering publish, lock, completion, unlock, and republish stability.

## Verification

- `pnpm --filter @worklingo/api test -- session-creation.service.spec.ts` — 2 passed.
- `pnpm --filter @worklingo/web exec playwright test e2e/curriculum-foundation.spec.ts` — 2 passed (desktop/mobile).
- `pnpm --filter @worklingo/web exec playwright test e2e/program-catalog.spec.ts` — 2 passed (desktop/mobile).
- Focused web typecheck and ESLint passed for the new acceptance spec and Playwright configuration.

## Review notes

The acceptance test exposed that session DTOs persisted but did not return `curriculumRevisionId`.
The response contract now exposes the nullable pinned revision, covered by the focused mapper unit
test and the end-to-end republish assertion. No answer key or learner raw response is returned by the roadmap.

## Deferred gates

To conserve the requested quota, this handoff did not run the full `pnpm verify`, independent-agent
review, backup/restore rehearsal, or unrelated suites. Those remain release/merge gates rather than
evidence claimed by this review.
