# Beginner R2.1 independent engineering review

Date: 2026-11-07. Reviewer: independent Codex AI review agent, not a human expert. Baseline supplied for review: `d3392a4ce3abbbaaaa36a36b7abb5cae517ef650`; implementation reviewed as working-tree changes on `codex/r21-beginner-publication`.

## Scope and verdict

Reviewed importer, source/audio integrity, vocabulary reconciliation, permission/target controls, official publication integration, release/access changes, unscored submission and learner DTO privacy. Read mission requirements and tests before implementation. Considered correctness, readability, architecture, security and performance using `code-review-and-quality`.

**Verdict for inspected code: no unresolved confirmed Critical/Important findings after remediation.** This is a bounded engineering review, not approval of production deployment, content qualification or human validation. Browser journey, broad suites, fresh-clone import, final database publication/readback and Git integration are coordinator-owned evidence in the companion reports.

## Findings and remedies

| Finding | Initial severity | Remedy reviewed | Status |
|---|---|---|---|
| Import checked only sense/entry/form identity, allowing stale definition or CEFR evidence | Important P2 | Full captured metadata comparison across seven master/provenance tables; exact mapping/CEFR admission; evidence included in inventory; dry-run and apply revalidate | Resolved |
| Random audio objects survived DB rollback and accumulated on retries | Important P2 | CLI uses content-addressed offline WAV keys, verifies existing bytes and safely replaces interrupted regular staging files under serialized import | Resolved |

The database transaction and official authoring/publication/vocabulary services preserve domain workflow boundaries. The import is restricted to Beginner, records exact source/bundle bindings and leaves master vocabulary and existing learner records unchanged in its write set. The generated technical reviewer is explicitly AI rather than a fabricated human signatory. Unscored response activities do not enqueue automatic scoring, and learner projection removes private criteria/answer material from inspected DTO paths.

## Verification actually run

Initial bounded command:

```text
pnpm --filter @worklingo/api exec vitest run src/beginner/domain/beginner-program-permission.spec.ts src/beginner/application/beginner-program-import.service.spec.ts src/learning-programs/domain/program-availability.r21.spec.ts
```

PASS: 3 files, 5 tests (before the subsequent evidence-helper additions).

Final restored command:

```text
pnpm --filter @worklingo/api exec vitest run src/beginner/domain/beginner-vocabulary-evidence.spec.ts src/beginner/infrastructure/beginner-import-audio-storage.spec.ts src/beginner/domain/beginner-program-source.spec.ts
```

PASS: 3 files, 13 tests: vocabulary evidence 9, source admission 2, audio recovery/integrity 2.

Mutation experiment: temporarily inverted the canonical row equality condition in `beginner-vocabulary-evidence.ts`. The unchanged-provenance test failed (1 failed, 8 passed), demonstrating sensitivity. Original file bytes were restored in `finally`, then all 13 restored tests passed. Mutation occurred approximately 12:40:23–12:40:25 Asia/Saigon while a coordinator broad run was active; coordinator was informed so overlapping broad evidence could be checked. No mutation remains in the implementation.

## Limits and remaining evidence

- Frozen MG02-L2 source, scripts and selected WAV bytes are checked; its bundle digest is compared with the known historical constant. This reviewer did not reconstruct the original control bundle artifact. Optional hardening is an explicit independent reconstruction test.
- This reviewer did not run a broad suite, browser journey or primary-database write. No claim of their success follows from these unit tests.
- Full current inventory/counts and exact source hashes are in [source reconciliation](beginner-program-source-reconciliation.md); mapping IDs and exceptions are in [vocabulary integration](beginner-vocabulary-integration-report.md).
- Final release identity and database readback: [publication report](beginner-program-publication-report.md). Synthetic browser evidence: [learner journey](beginner-learner-journey-report.md). Final combined gates: [acceptance report](beginner-r21-final-acceptance-report.md).
- All 297 historical qualification decisions remain historical. Local automatic-grading REVISE remains REVISE. The supported mode is transparent Beta/unscored practice. No real learner observation, human expert signature or production qualification is asserted.

## Final commit-scope audit (2026-11-07)

Independently inspected the aggregate 60-file code/test diff from `d3392a4ce3abbbaaaa36a36b7abb5cae517ef650` through `bd0ae8bb88e1904d3c6fd3ed6ec74633ce127859`, comprising `fb502e1`, `8afc593`, `95276b3` and `bd0ae8b`. The four commits separate source/authority admission, release/access/practice activation, recoverable official import and learner UI. No unrelated product change was identified in the inspected scope; no new confirmed Critical/Important finding.

Final changes checked include authored Beginner catalog action using the enrollment POST before dashboard navigation; full release objectives retained in program details while the catalog goal displays the first objective; shared contract allowance scoped to Beginner enrollment; analytics access evidence using the published release; and transparent text-based unscored speaking/writing. The admin ContentList test change waits for an enabled action after reload, addressing an asynchronous test race without changing product behavior. The client test still rejects reserved TOEIC enrollment.

Coordinator-reported verification at this audit handoff: backend 186 files / 1,230 tests PASS; legacy 6 files / 30 tests PASS; placement 4 files / 20 tests PASS; context 2 files / 60 tests PASS; fresh restored-database importer integration 1 test PASS including rollback/preservation; actual synthetic browser journeys at three viewports PASS in separate sequential runs. These are coordinator-reported results, not additional independent test executions. Final full web rerun remained pending at this report update; consult the acceptance report for its final outcome.

The independent aggregate `git diff --check d3392a4 bd0ae8b` identified only two known extra blank lines at EOF in `application/__fixtures__/beginner-r21.ts` and `program-release-snapshot.r21.spec.ts`. Coordinator owns trimming and final whitespace recheck. No source mutation or database write occurred during this final audit. Final merge/push/remote SHA verification remains outside this review and must be recorded in the commit audit and acceptance report.

## Final test-hygiene follow-up

Independently reviewed the four pending tracked test/fixture diffs: removed blank EOF lines; added explicit `Promise<never>` to the deliberately failing audio adapter; retained the same byte-flip mutation with a non-null indexed-byte assertion; and removed the machine-specific database-URL-file fallback so the journey suite requires an explicit owned test-database environment variable. These changes preserve product behavior and strengthen test execution boundaries. No new confirmed Critical/Important finding; no further test rerun warranted for this narrow review.

Inspected local logs `web-unit-final.log` and `api-typecheck-test-hygiene.log` in the operator-owned R2.1 temporary evidence directory. Final web suite: **PASS, 160 files / 985 tests**, duration 611.63 seconds. API typecheck after test annotations: **PASS**, `tsc --noEmit` completed without diagnostics (coordinator confirmed successful command completion). This supersedes the earlier pending-web note. `git diff --check` on the pending working-tree changes now passes; the two EOF issues are resolved. Merge, final commit identity and remote SHA remain coordinator verification responsibilities.
