# Topic inline publication QA — 2026-10-22

The four-step Intermediate topic editor now includes validation, selected audio, vocabulary review and explicit publication in step 4. The approval next-step link focuses that section on the same route. Successful publication makes the editor read-only and displays a persistent result.

Clean saved drafts can validate before approval so invalid content can receive actionable diagnostics. Publication still requires current approval, no unsaved source/JSON/plan edits, matching revision/hash, valid preview, ready selected audio and vocabulary choices. Validation HTTP 422 issue arrays are parsed and displayed by the existing validation panel. Existing server guards remain authoritative.

Verification:

- Vitest: 131 files, 824 tests passed, including 10 integration regressions using real editor and lifecycle panels.
- Playwright: 2 fixture-only flows passed, desktop 1440px EN/Light and mobile 390px VI/Dark; approve, local anchor with Enter, validate, select audio, publish with Enter, unchanged route, reload read-only and no duplicate publication.
- Visual screenshots inspected: ready and published states, no horizontal overflow, semantic primary action.
- Frontend lint, typecheck, i18n (2519 paired keys; zero errors), production build and diff whitespace checks passed.
- Independent review found two P2 issues: approval/validation deadlock and lost HTTP 422 diagnostics. Both were reproduced RED and corrected GREEN, followed by the 824-test full suite.

Browser mutations use isolated fixtures only. No real lesson was approved or published for QA. No backend, schema, permission or API changes. Feature branch retained locally; no push, merge or deployment.
