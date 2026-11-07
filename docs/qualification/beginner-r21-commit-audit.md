# Beginner R2.1 commit and integration audit

Date: 2026-11-07. Branch: `codex/r21-beginner-publication`. Primary checkout: `D:/Projects/WorkLingo`, branch `main`.

## Baseline and authority

Verified baseline and merge base: `d3392a4ce3abbbaaaa36a36b7abb5cae517ef650`. A final `git fetch origin` still showed that baseline as `origin/main` before final integration. No reset or history rewrite was used. The mission explicitly authorizes normal commits, main integration and push after applicable gates; it does not authorize production deployment solely from local results.

The user's existing modified `apps/web/next-env.d.ts` and untracked `backups/` in the main checkout were identified before integration and preserved. Their original generated-file patch was saved locally under `%TEMP%/worklingo-r21-20261107/main-existing-next-env.patch`. Dumps, private connection files, import authority files and raw traces are excluded from commits. The host-managed implementation worktree is retained.

## Atomic implementation commits

| Commit | Scope and rationale | Audit / evidence |
|---|---|---|
| `fb502e1` | Exact Beginner source, vocabulary evidence, bounded operator authority and recoverable content-addressed offline audio | Source/authority rejection tests; full metadata comparison; independent mutation-sensitive vocabulary tests |
| `8afc593` | Published-release access, snapshot/pin policy, dashboard evidence, exact Beginner playability and safe unscored practice | Policy/enrollment/privacy/session tests, contracts and full API journey |
| `95276b3` | Official transactional importer, local runtime binding and CLI | Fresh restored DB dry-run/apply/rollback/retry/replay/immutability/preservation |
| `bd0ae8b` | Actual catalog detail/enrollment, transparent practice UI, localization and browser tests | Full web 160 files/985 tests; actual three-viewport journeys |
| `d34d1ed` | Require explicit owned journey-test database, correct test TypeScript annotations and remove EOF whitespace | Full API typecheck, scoped ESLint and 4-file/22-test final check PASS; independent narrow review |

The independent reviewer inspected the aggregate 60-file implementation/test diff across these four commits against the baseline using correctness, readability, architecture, security and performance axes. Two Important P2 findings (incomplete vocabulary evidence comparison and orphaned duplicate audio retry objects) were fixed and re-reviewed. No unresolved confirmed Critical/Important finding remains.

Final test hygiene consists only of explicit test database configuration, two TypeScript test annotations and EOF whitespace cleanup. It changes no product behavior. Full API typecheck and scoped lint passed after these changes; the independent narrow follow-up found no new Important issue. Final required evidence, spec and completed plan are recorded separately from implementation.

## Scope and gate review

- Official R2 architecture and publication services are reused; no parallel curriculum/progression system was introduced.
- No new migration/dependency; three existing additive migrations were applied only after backup/recovery checks.
- No master vocabulary mutation, changed historical qualification decision or fabricated human signatory.
- No provider spending; runtime uses local fake providers with worker disabled for verification.
- Primary publication is audited separately from code integration: exact release `aec36350-0b9f-426a-8e87-4d4033dfdb5c`; immutable BETA with ACTIVITY_COMPLETION.
- Tests cover status-only denial, reserved unrelated programs, ownership/privacy, productive null scores/no jobs, rollback/replay and exact pins.
- Full suite results, resolved historical failures and unexecuted external gates are in the final acceptance report; no production qualification is inferred.

## Integration receipt

The first four implementation commits were fast-forwarded into local main at `bd0ae8bb88e1904d3c6fd3ed6ec74633ce127859` and the local primary application was started from that checkout. Test hygiene was then fast-forwarded to `d34d1ed`. The existing next-env diff was compared with the saved preexisting patch and is unchanged. Final evidence commits and normal remote push are recorded in the receipt below after execution. No push success is inferred from this preparatory paragraph.

Implementation receipt: **PASS**. Normal `git push origin main` advanced the configured GitHub repository from `d3392a4` to `d34d1ed`. `git ls-remote origin refs/heads/main` returned exactly local main SHA `d34d1edce69edb6c2d93cd3eef9af48a1b93fa83`. The five implementation/test commits are therefore present on remote main. Post-merge verification from `D:/Projects/WorkLingo` passed 5 files / 24 tests in 16.21 seconds for source, audio storage, vocabulary evidence, release snapshot and availability. Whitespace and tracked environment/private-key scans passed before push.

This final evidence commit contains the eight required qualification reports, three synthetic screenshots, the mission spec and completed plan. It adds no runtime behavior or schema changes. After committing it, fast-forward the same main checkout, push normally and compare final local/remote SHA again. That final content-addressed SHA is reported in the delivery rather than recursively embedded in its own report. The implementation receipt above is an executed historical observation, not a placeholder or assumed future success.

## Verification and rollback

Use the eight companion qualification reports for exact source hashes, vocabulary IDs/exceptions, primary backup/readback, test commands and synthetic evidence boundaries. Before the final commits, inspect explicit staged files, run whitespace checks and the tracked environment/private-key scan, and inspect new reports for credential-shaped values. The scanner is deliberately narrow and does not prove absence of every possible secret.

Code rollback should use a reviewed normal revert appropriate to the dependent commit stack, never a shared-history reset or force push. Coordinate any code rollback with published data and enrolled versions. Preserve immutable snapshots and learner history; withdraw new enrollment with official lifecycle controls if needed. Restore the backup into a separate database first, following the publication report, rather than overwriting primary progress.
