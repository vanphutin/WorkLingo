# IELTS local Beta release — 2026-10-15

Scope: MND-20261015-001; the human delegated content selection and execution of the previously proposed local Beta. The approved spec and implementation plan define the boundary. Existing audio/dashboard/dialogue work in `codex/audio-dashboard-v2` is preserved. No public deployment, paid synthesis or learner-evidence fabrication is authorized or performed.

## Implementation and content

The catalog uses current immutable publications across the five real IELTS engines and genuine audio metadata. It requires released BETA/AVAILABLE metadata and complete readiness. The guided `/ielts` entry navigates without activating a generic IELTS enrollment, preserving Intermediate context. Direct generic IELTS activation rejects without mutation. The IELTS card displays the five phases instead of nonexistent generic level/path counts.

The hub reuses actual eligibility cards, bilingual prerequisites and existing teacher-review gates. A supported-mode fallback allows Learning/Practice-only mocks to start; unavailable publication messages distinguish missing content from incomplete Bridge.

Selection and limitations are documented in `docs/IELTS_LOCAL_BETA_CONTENT.md`: nine-slide Orientation, four curated Bridge modules, four unchanged published Practice schedules, seven-stage Band Curriculum, and an original Academic practice paper with 40 Listening/40 Reading questions, 2,388 Reading words, concrete Writing data and Speaking prompts. Four locally generated Windows speech WAVs total 757.4735 seconds. Shorter audio, short-answer-only objective tasks and uncalibrated estimated bands are disclosed; Exam Simulation is excluded.

## Review and verification

- Backend: 57 scoped API tests plus four contract cases passed, including readiness and context protection; independent review findings were corrected.
- Frontend: 90 files / 452 tests passed. Contract package: 18 files / 89 tests passed.
- Desktop/mobile real API browser journeys: two passed in disposable E2E schemas. Verified Programs → IELTS hub, five anchors and targets, Foundation locks, unchanged Intermediate context after reload, no activation/learning POSTs and no horizontal overflow. Parent inspected the mobile screenshot. E2E synthetic media is confined to fixtures and never used for the release.
- API/web typecheck and lint, contracts typecheck, API build and separate-cache web production build passed. Next route types were restored for the running development cache. i18n: 30 namespaces, 1,811 paired keys, zero errors. Whitespace check passed.
- Content/operations review identified answer disclosure in Bridge instructions and overly restrictive answer variants. Publication was held for regression fixes; final results are recorded below.
- Full API suite: **168 files / 884 tests passed**, exit 0, 651.77 seconds (`.superpowers/ielts-beta-api-final.log`). This run collected tests before the final review regressions were added; those changes receive a separate focused final run rather than repeating the entire suite.

## Execution evidence

Final independent P1/P2 review cleared neutral Bridge directions, real Bridge/Integrated DTO redaction, the clarified registration-category prompt, the hide alternative and 22 additional evidenced answer variants. Global scoring normalization is unchanged. Parent final focused verification: **10 files / 53 tests passed**, including the existing objective scorer; final API typecheck/build and scoped lint passed. Log: `.superpowers/ielts-beta-release-final.log`.

At **2026-10-15 07:10 UTC**, the parent executed the reviewed local utility with fingerprint `6c0fdbe63ef46788ee3d09184f1b763b3ee1af149a90705c694c0f13f7347d04`; exit 0, `Result: RELEASED`. Log: `.superpowers/ielts-beta-execute.log`. The private pre-mutation snapshot is retained under the ignored, ACL-restricted `apps/api/src/ielts-beta-release/.private/` directory (`before-2026-10-15T07-10-39.533Z.json`). Its contents are not copied into this report.

Read-only parent post-release verification returned:

| Check | Verified local result |
| --- | --- |
| All five phase readiness flags | true; no missing phase |
| Current published Orientation / Bridge / Practice profiles / Band / Mock | 1 / 4 / 4 / 1 / 1 |
| Band stages | 7 |
| Curated content match | true |
| Mock modes | LEARNING, PRACTICE |
| Stored local speech WAVs | 4; all byte checksums match |
| Catalog | BETA, selectable, destination `/ielts` |
| Generic IELTS path / level counts | 0 / 0, correctly omitted from the IELTS UI |

Command: `pnpm --filter @worklingo/api exec tsx ../../.superpowers/verify-ielts-beta.ts`; exit 0, log `.superpowers/ielts-beta-post-release.log`. The verifier sets its content transaction READ ONLY and calls the real catalog service against the same local database. Live unauthenticated catalog HTTP access correctly returned 401; no authentication bypass was used.

A fresh post-release dry run reported fingerprint `29dcb3be68ab2a9500467291da455bd6662273a5a3b3c30f89a3a56b8b54f7bc`, all readiness flags true. A reviewed execute with that fingerprint returned `ALREADY_RELEASED`, exit 0 (`.superpowers/ielts-beta-idempotence.log`), without additional publication/snapshot. Development web root, `/ielts` and API health responded 200; desktop/mobile authenticated navigation and context protection were qualified separately in disposable schemas.

## Follow-up: actionable Foundation prerequisite (2026-10-15)

The human's live screenshot showed five locked cards and no clear first action. The publication state was correct; the Orientation card only rendered reason text. Existing real Checkpoint assessment lives at `/mastery#checkpoint-heading`, while lessons launch from `/dashboard`.

The scoped UI correction adds bilingual lesson/checkpoint links and the sequence of steps to the Foundation lock. Onboarding and Intermediate enrollment take precedence when missing. Publication-only locks do not offer a misleading learner action. Server gates, content publications and learner evidence are unchanged. This routine navigation fix does not reopen or revise the frozen approved publication scope.

Verification: four missing-action assertions failed before implementation; 25 focused card/hub/checkpoint tests then passed. Real API desktop/mobile journeys both passed, including clicking Check Foundation progress, seeing the actual disabled assessment action and missing-session guidance for a fresh learner, returning to lessons, unchanged Intermediate context and zero activation/learning POSTs. Web typecheck/lint passed; i18n checked 1,816 paired keys with zero errors. Bounded independent review found no Critical/Important issue. Existing button spacing/radius were applied after screenshot inspection. Broad API/full web suites were not repeated for this UI-only correction.

## Practice release limitations

This local Beta is practice content, not an official exam or externally calibrated release. No claim of listening audition or human language calibration is made. Full-database restore and historical version deletion are excluded; compensating rollback uses the private scoped snapshot and retains learner pins/history. The live app uses the managed worktree; no merge, push or public deployment is included.
