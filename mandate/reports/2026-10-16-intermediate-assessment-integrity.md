# W2 assessment integrity — isolated implementation evidence

Date: 2026-10-16 (Asia/Saigon). Mandate: MND-20261015-001.
Status: Bounded W2 implementation, one final review/fix pass and verification complete in the isolated worktree. This does not complete the mandate or activate independent assessment.

## Authority and delivered behavior

Direct human “duyệt” approved W2 in the existing managed worktree and the one additive migration only in disposable test schemas; the exact exchange is in [approval](2026-10-16-intermediate-approval.md). Execution checkout: `C:/Users/ASUS/.codex/worktrees/intermediate-quality-baseline/WorkLingo`, detached HEAD `efa2fd99b5373a644a011af3787bf81f737a51a7`. Existing W0/W3/W4 changes are preserved. App code remains here, uncommitted; only planning/report documents are synchronized to the original checkout.

- Private review-bound policy and durable per-activity state distinguish independent, practice and accessible work. Client mode injection cannot activate an unreviewed cohort; runtime cohort is frozen empty.
- Independent Listening projections omit transcript/language hints and disable browser speech fallback. Explicit support commits before text delivery. READY, non-fake, pinned audio must pass checksum, size and decoding checks.
- Complete first-answer evidence is immutable and recorded before its own feedback disclosure. Later correction retains existing scores/advancement and the original first result; partial answers create no scored attempt. Accessible work receives no raw-score penalty.
- Learner→session row locks serialize support, history, feedback and submissions. Replays preserve response identity after advancement. Related fact delivery and unknown legacy history conservatively prevent independence. Existing mastery weighting, placement and old-session semantics remain unchanged.
- One additive `SessionAssessmentState` ownership table; no historical backfill. Tests alone apply the migration to random disposable schemas.

## Review and one fix pass

One fresh reviewer, read-only, returned no Critical, three Important and one Minor. No second review was dispatched. All Important findings were reproduced before correction:

| Finding | RED evidence | Corrected behavior / GREEN evidence |
| --- | --- | --- |
| Audio delivery omitted exposure history | `audio-red.log`: successful direct audio request leaves disclosed groups empty | `audio-green.log`: delivery commits stable groups before bytes; its own stimulus remains independent, related-version answers become supported, cross-session replay remains stable; corrupt/checksum-valid undecodable audio fails closed |
| Concurrent identical recording upload checked checkpoint before duplicate | `review-fixes-red.log`: one of two same-ID uploads receives 409 | `review-fixes-green.log`: both receive identical result; final suite also checks one attempt/recording/job/advance |
| Incomplete comprehension disclosure manifest accepted | `review-fixes-red.log`: Reading without a group and Listening without its own source both accepted | `review-fixes-green.log`: every selected comprehension activity requires a group and own-source coverage |
| Executor finding: correction compared transaction timestamps | `attempt-order-red.log`: unchanged third answer falsely reports a change | `review-fixes-green.log`: comparison uses immutable committed attempt index; reversed timestamps no longer alter the flag |

The first audio test draft had an incorrect relation name, then omitted fixture SessionBlock rows; these fixture errors were corrected, not treated as product failures. The valid RED was the empty exposure array. The final race fixture first establishes exposure, then races repeat delivery against submission, making assertions independent of scheduler order.

Deferred Minor: independent audio failure currently offers support/reload but no inline retry button for the same URL. Independent grading fails closed; this usability improvement remains separate.

## Verification

Evidence directory retained in the worktree: `.superpowers/sdd/2026-10-16-intermediate-assessment-integrity/`.

- Initial baseline failed because the existing PostgreSQL container was stopped: API 10 files failed, 7 tests failed, 750 passed, 83 skipped. Restarted that same container and volume without reset or recreation. Affected suites: content-audio, content-imports, content-publish, curriculum-seed, learning-sessions, placement-attempt, progression, backup-restore, ielts-integrated-schema and program-enrollment-migration. All ten passed in the final regression.
- Before final review: focused API 44 tests / 10 files passed; player/Listening UI 9 tests passed; whole-workspace typecheck/lint/build passed; i18n passed, 27 namespaces and 1,677 paired keys, zero errors.
- After the one fix pass: API typecheck/lint/build passed (`*-fixes.log`). Four fix-target files: 23 tests passed and the audio fixture initially failed for absent SessionBlock rows; corrected audio regression then passed. Final whole suite remains authoritative.
- Desktop/mobile foundation and keyboard/zoom/accessibility journeys: 6 passed (`e2e-final.log`). UI was unchanged by the review fix pass, so these were not repeated.
- Read-only database boundary verification: public 37 tables / 16 migrations; preview 69 tables / 31 migrations; neither has `SessionAssessmentState`. No public/preview migration, learner reassignment, provider use or content publication.
- Final `pnpm test` exited 0 through the Task 3 completion helper: **1,422 tests / 280 files PASS**, zero failures/skips. Content-format 81/7, contracts 87/17, API 881/173, web 373/83. Full output: `task-3-tests.log`.
- The final deterministic audio-exposure fixture was rechecked independently: 1 PASS (`audio-final.log`). Generated `next-env.d.ts` was restored byte-for-byte from HEAD after restarting preview; web typecheck passed (`web-typecheck-restored.log`). No package/dependency changes.
- Final diff whitespace check passed in both roots; mandate `validate` returned `valid:true,count:2` in both. Seven documents synchronize byte-for-byte; 48 local links verified. Baseline hash comparison found no app/package changes outside 45 explicit W2 files, except generated `next-env.d.ts`, verified byte-for-byte against HEAD after restoring development-server output.
- Preview was found stopped during final verification. Restarted only the two existing hidden launchers using their retained schema/configuration, without the helper's `prepare`/migration/seed mode. Login and API health returned HTTP 200. Public/preview schema counts remained unchanged after restart. Existing credentials remain in the ignored preview state file; no credential file was changed.

## Rulings and costs

The retained execution ledger is authoritative for workflow decisions, in chronological order:

1. Reuse managed detached worktree and preserve W0/W3/W4: authorized scope; cost is a larger uncommitted surface.
2. Retain workspace and omit commits/cleanup: commit/integration are outside scope; cost is no Git savepoint.
3. Decode private policy separately and strip it from public plans: retain existing contract; cost is projection coverage at every boundary.
4. Real PostgreSQL integration replaces a mock-only state-service spec: verify actual ownership/locks/rollback; cost is slower tests.
5. Restart the same stopped database container and rerun failed baseline suites: environment recovery; cost is additional baseline time.
6. Move complete E2E to Task 3 after support API/UI exist: avoid incomplete fixtures; cost was delayed journey evidence, now resolved by six passes.
7. Share unchanged completion metrics and lock new-policy recordings: retain legacy behavior; cost is shared-path regression coverage.
8. Run final review after focused tests/typecheck while broad gates run later: catch issues early; cost is no completion claim until final gates.
9. Replace empty committed-range review package with explicit W2 dirty-file list: commits are unauthorized; cost is manual tracked/new-file review.
10. Use HTTP/database integration for support service and evidence instead of duplicate mock-only specs or unnecessary UI file changes: exercise actual authority boundaries; cost is slower tests and less isolated failure output.
11. Manual screen-reader testing is unperformed; report automated keyboard/mobile checks precisely: native assistive-technology assurance remains pending before activation.
12. Keep the managed detached worktree under the already-established isolated scope instead of opening a new integration menu: no merge/push/commit was authorized; cost is pending integration and retained local evidence.

Reviewer declined judgments, each explicitly resolved:

13. Real semantic separation/paraphrases and completeness of lesson families: synthetic manifests prove mechanisms only; live cohort remains empty. Cost: content review still required.
14. Actual audio intelligibility, speaker/script/answer consistency and real QA: PCM fixtures prove transport/integrity only. Cost: real media QA still required.
15. Final test/build/lint/i18n/diff gates: executor verifies actual outputs, not reviewer inference. Cost: no independent rerun of those commands.
16. Live browser/mobile/screen-reader experience: six automated journeys cover keyboard/layout/error flow; no manual screen-reader session. Cost: manual usability evidence remains absent.
17. Production migration/deploy/activation/rollback operations/providers: outside approval, untouched. Cost: no production readiness claim.
18. Unchanged W0/W3/W4 and unrelated code: preserve baseline hashes and run existing regression; cost: no fresh independent subsystem review.
19. Pedagogical mastery validity, weights and external untracked study exposure: preserve old semantics, defer W6/content decisions. Cost: independence does not certify external non-exposure or calibrated mastery.
20. Reviewer did not execute mutations/runtime reproductions: executor reproduced all Important findings with failing tests and verified fixes. Cost: runtime evidence comes from the implementer; no re-review.
21. Normalize generated Next route declarations to HEAD, excluding their earlier development-server paths from the semantic baseline comparison: web typecheck passed. Cost: restarting development can regenerate those paths again.

## Remaining gates

Real lesson/fact-family review, actual speech QA and history coverage precede any cohort activation. Public/preview upgrades, content publication, B1 admission, planner/workload enforcement, mastery weighting, integration and pilot remain separate. The mandate stays approved/in progress. No commit, push, merge or release.
