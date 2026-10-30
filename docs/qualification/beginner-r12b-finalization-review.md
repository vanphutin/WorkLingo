# R12B finalization independent review

Review scope: MND-20261030-006 B reviewer workbench, C opt-in constrained local contract and evidence, and D isolated browser runtime/bootstrap/collector/E2E. C reviewed at commit `141d980`; D was reviewed as a stable uncommitted file set; final browser JSON SHA-256 is `49f15dbc745e53073e8920aea52d8c07f2c86e5ba6437d8d4a360a2ea6558754`. No inference, database setup, browser run, staging or commit was started by this reviewer. Final D raw receipts and published report were reconciled independently; cleanup records report zero listeners and no matching container/volume.

## Findings and dispositions

- **Important, resolved — B evidence hash coercion:** imported SHA arrays passed a coercing regular expression and could produce an export rejected by the strict importer. The workbench now requires a string before matching the digest. A regression test failed before the fix and passed afterward.
- **Important, resolved — C nested feedback extras:** the legacy shared schema stripped unknown feedback keys although the constrained JSON contract forbids them. The opt-in parser now makes nested feedback strict while preserving legacy behavior. Independent inspection confirmed a valid evaluation is accepted and an extra nested field rejected.
- **Important, resolved — D audio correspondence:** the first harness accepted any hash in a lesson and allowed a missing audio element, so it could not prove exact activity playback. The revised harness explicitly selects published audio with PATCH 200, requires an audio element and activity-specific current source, compares the endpoint SHA to the activity's expected digest, awaits play, and asserts ready state, positive duration and unpaused playback. Fresh receipts establish 72 such checks across 24 distinct WAV hashes; earlier runs remain archived.

No additional Critical or Important defect was verified in the reviewed runtime/bootstrap/collector implementation. This is a bounded review, not a production or qualification approval.

**Important, resolved — actual writing job failure (008):** Beginner intentionally supplies an empty reference answer. The fake adapter preserved that empty string through nullish coalescing, producing `feedback.correctedExample: ''`, rejected by the shared minimum-length schema. Both short and completed response branches reproduced the exact schema error. Regression tests failed before the minimal blank-reference fallback and passed afterward; meaningful legacy reference bytes remain preserved. Prior-run-006 retains 24 failed writing jobs. The fresh run independently establishes 24 evaluated writing results, and the actual database summary records 24 completed evaluation jobs and zero failed jobs.

## Five-axis assessment

| Axis | Assessment |
| --- | --- |
| Correctness | B preserves draft/provenance boundaries and refuses malformed evidence. C separates strict formatting validity from failed grading quality. D binds ordered attempts to session/version IDs; exact audio playback checks are now explicit, with final receipts reconciled. |
| Readability and simplicity | Compact runtime and E2E files require careful reading but keep the experimental workflow together. No readability concern was elevated to a correctness blocker. |
| Architecture | Constrained parsing is opt-in. Browser fixtures and orchestration stay in qualification/test code; synthetic credentials and assets remain isolated. The production planner delegates to the canonical strict eight-activity planner; source-based plan and persistence cases and broad root tests passed. |
| Security | Reviewed runtime requires the exact local DSN, owned labels and stop token, sanitized child environment, pinned image and scope hash. Reviewer HTML is self-contained and verifies selected WAV bytes. No remote credential or project environment-file access was initiated by this reviewer. |
| Performance | Local pilot is bounded to 20 sequential starts without retry. Browser and bootstrap loops have explicit finite fixture counts/deadlines. No production performance claim or benchmark follows from these experiments. |

## Independent evidence reconciliation

For C, the private 40-event start/outcome ledger passed the canonical receipt-chain validator against the first 20 frozen schedule rows. Its 20 outcome objects exactly matched the committed report. All 20 raw responses passed the strict parser, and recomputing metrics reproduced the report: false acceptance 2/10, false rejection 8/8, factual score-bound adherence 10/20, four observed anchor pairs out of 32 required, verdict `REVISE`. Usage remains 11,398 input and 4,088 output tokens. All 12 current source files and immutable pre-start snapshots matched their recorded SHA-256 values. The historical report hash matched the replay binding. Formatting success does not establish grading, feedback or pronunciation quality.

Earlier independent verification also compared all 52 extracted runtime files with the pinned archive members and disk hashes. The C shutdown record reports PID 21032 stopped and zero listeners; final owner log reconciliation belongs to the root verification record.

The final D report states five Playwright tests passed. Independent reconciliation of its private profiles confirms the counts above and exact expected/actual digest equality, HTTP 200, ready state at least 2, positive duration and unpaused playback. Mobile technical receipts at 390 by 844 show no horizontal overflow on dashboard/reviewer and focused alert feedback; this is not an accessibility certificate. A separate three-cycle pause/resume probe retained the selected answer at all nine samples and received HTTP 200; the earlier input-reset exposure was not reproduced and remains archived. Cleanup JSON records removal of the owned container/volume, and the final listener record is zero. This reviewer did not re-run Docker inventory commands.

## Checks actually executed

- B: combined workbench/importer tests 17/17; owned TypeScript ESLint; JavaScript syntax check; workbench generator build, all passed.
- C/D: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/finalization-local-calibration.test.ts test/beginner-pilot/finalization-browser-runtime.test.ts test/beginner-pilot/gate-c-browser-observations.test.ts` — 9/9 passed.
- C: read-only ledger, strict raw-response parsing, source/snapshot hashes, historical hash and metric recomputation described above — passed.
- 008: targeted tests RED 2 failed / 6 passed, then GREEN 8/8; owned ESLint and API TypeScript check passed. Authorized offline suite passed 40 files / 397 tests. The absent-reference case omits the optional property to satisfy exact optional-property typing.
- Existing root logs inspected: broad API safe suite 161 files / 1,160 tests passed; one actual isolated IELTS database integration passed; API build and final fixed typecheck logs were inspected. Root owns command exit verification and broader final gates.
- D: independently counted 24 completed journeys, 192 activity HTTP 201 receipts, 72 exact audio checks / 24 distinct hashes, and 24 evaluated writing results with non-null scores. Three profile and seven screenshot hashes match the final JSON report. Help/error/abandon browser coverage remains unit-only.

## Review limits

B and the 008 fake-adapter correction were authored by this reviewer and received separate independent review; their entries here are fix verification, not a claim of independent authorship review. Mutation/reproduction experiments for shared reviewed code were performed by the owners to preserve read-only review isolation; this reviewer did not mutate their active files. No new dependency was introduced in the reviewed experiment. Referenced global security/performance checklist files were unavailable and are not claimed as used.

Synthetic browser sessions, typed speaking fallback, automated audio play, local model scores and reviewer UI drafts establish engineering behavior only. Real learner observations, authenticated expert judgment, actual human listening, pronunciation validity, readiness promotion and release approval remain outside this review. No such judgment is supplied here.

SKILL AUDIT: Used `code-review-and-quality` for tests-first five-axis review and `requesting-code-review` for independent findings/dispositions. Verification is listed above. No reviewer subagent was spawned; this agent is the designated independent reviewer. TDD was used for the owned B and 008 regression fixes, not to claim authorship of C/D tests.
