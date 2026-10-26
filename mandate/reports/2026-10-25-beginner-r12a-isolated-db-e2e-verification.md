# MND-20261025-002 — conditional Gate A execution report

User-facing date2026-10-26, Asia/Saigon. Baseline520acdca8b7d63deaeb3a2a8b8dd721a6bd4186b; branch codex/foundation-basic-readiness; existing isolated worktree preserved.

## Outcome

| Gate | Actual result |
| --- | --- |
| Approval/hash/source scope | PASS: actual conditional human approval recorded through CLI; five locks/environment/migration hashes matched |
| Gate A overall | BLOCKED, incomplete: no proven non-elevated worker/operator trust boundary; only5 of16 source paths implemented |
| Gate B | NOT_STARTED / BLOCKED; no DB connection or setup/write was attempted |
| Qualified R1.2a acceptance | INCOMPLETE;003 and this child002 remain implementing, not verified |

This report records useful partial safety work, not complete harness/software/data qualification. Existing integration/E2E/backup/restore/concurrency/history tests were NOT run and are not counted PASS.

## Actual authority and baseline

[Human approval](2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md), proposal0293feefb1447c48e921e7c801d628db3b2352079d23ac42f74c6628c28179f2; approved then implementing through Mandate CLI before source edits. Gate B was conditional, never activated.
[Captured scope](2026-10-25-beginner-r12a-isolated-db-e2e-scope.json) and [plan](../../docs/superpowers/plans/2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md) remain unchanged.
Matched111 source baseline paths,10 frozen artifacts and all48 migration files (including migration lock metadata). No migration byte changed. Verified original001 captured/null,002 verified,003 implementing and20261025-001 verified; their files/approval hashes unchanged.

## Concrete blocking evidence

- Windows current execution token: elevated=true.
- Explorer PID9736 token queried through OpenProcessToken/GetTokenInformation: elevated=true.
- Current TokenLinkedToken query: unavailable, Win32 error1312. No usable standard linked token was established from the approved contexts inspected. This does NOT claim no other token exists anywhere on the machine.
- Native AccessCheck adapter was compiled/executed read-only against existing C:/ProgramData. Returned readable=true, writable=true, canChangePermissions=true, elevated=true, ancestorProtected=false.
- That probe proves native adapter execution/current elevated rights only. It is NOT proof of the planned approval-root ACL, which was never created. A distinct non-elevated worker and actual protected-root boundary cannot be qualified now.
- No UAC/Windows security policy/account/token settings or ACL were changed; no restricted-token exemption, alternate identity, borrowed browser token or weaker ACL check was invented.

P1 blocker ENV-001: provide a verified non-elevated worker/test context separated from the operator that owns the immutable approval records. Existing current/Explorer contexts cannot establish it. Changing OS accounts/security policy or captured identity is outside this approval and needs an explicit human decision. No repeated DB attempts can resolve this.

## Delivered source and commits

1. e7332c28fe5359d336aff1f12c68df826d9d348f — native effective Windows approval-root access/TokenElevation/ancestor proof and POSIX error-handling regression;2 source files.
2. ab13782c32bdae20cbcd12005ea7dbe01b7e0fca — isolated scope/URL/privilege/cleanup/authority/env validators and dedicated pure tools tests;3 source files.

| Delivered file | SHA-256 raw bytes |
| --- | --- |
| [apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts](../../apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts) | c34ec82bfd1354d3f3a729ca908f0741cdddc69a3612e8bed1648d9536790ffa |
| [apps/api/src/beginner/domain/beginner-environment-preflight.ts](../../apps/api/src/beginner/domain/beginner-environment-preflight.ts) | db7470c3c5f82b0307f70ec4e0429a1467f40556c3e2eee39976bc025f8e435c |
| [apps/api/test/beginner-isolated/environment.spec.ts](../../apps/api/test/beginner-isolated/environment.spec.ts) | 6a9f1401e7511e3eff4c1fd2a5116c24c9f2df48731e1cf944d4cdbe6ba0d7d1 |
| [apps/api/test/beginner-isolated/environment.ts](../../apps/api/test/beginner-isolated/environment.ts) | 8c5cc00bf911c65f54019bd42343044e6b8d98b92a31a12313d51f45fa4a59af |
| [apps/api/vitest.beginner-isolated-tools.config.ts](../../apps/api/vitest.beginner-isolated-tools.config.ts) | 9eca1ad0927ba0dfe6e7e5fb06f8e1f76d7d706201480350ba082438820db39f |

Windows uses static no-profile PowerShell/native AccessCheck with impersonation token and actual TokenElevation; path is passed through a single non-secret env value and the child does not inherit DB/provider credentials. Reject incomplete proof, write/delete/ACL/elevation rights and replaceable ancestors. Inspect permission file as well as root. POSIX accepts only real EACCES/EPERM/EROFS and rejects unrelated errors; tests exercise both branches without skips.
Tools validators bind exact captured scope, endpoint and source constraints, reject elevated/owner/role/schema/temp/TRUNCATE privilege evidence, sanitize child env and validate cleanup identity/path shape. They are validation primitives, not actual SQL evidence collection or an operational data runner.
Human authority verifier binds exact recorded actor, reference, approval timestamp and LF-hash of the actual human note; regular non-symlink single-link file and inspected ancestry required. Mutable approval.at cannot extend the captured24h window or revive it. Any renewal needs real renewed authority, never an edited timestamp.

## TDD and final checks actually run

| Check | Command/context | Actual result |
| --- | --- | --- |
| ACL initial RED | Dedicated tools config before guard fix | 4 PASS/3 expected FAIL/0 skip |
| ACL first GREEN | Same config | 7 PASS/0 fail/skip |
| Ancestor RED | Exact preflight spec | 7 PASS/1 expected FAIL/0 skip |
| POSIX RED | Exact preflight spec | 8 PASS/2 expected FAIL/0 skip |
| Review RED | Real authority/privilege/path validators | 42 PASS/9 expected FAIL/0 skip |
| Review GREEN | Same validators after one fix pass | 51 PASS/0 fail/skip |
| Mutation experiment | Invert actual human-note hash condition; complete tools suite | 49 PASS/3 expected FAIL/0 skip; source restored byte-for-byte |
| Final tools | pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-isolated-tools.config.ts | 2 files52 PASS/0 fail/skip |
| Final relevant API regression | pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts | 30 files209 PASS/0 fail/skip |
| API lint | pnpm --filter @worklingo/api lint | PASS, observed exit0; final additional spec lint exit0 |
| API typecheck | pnpm --filter @worklingo/api typecheck | PASS, final exit0 |
| API build | pnpm --filter @worklingo/api build | PASS, observed exit0; production source unchanged afterward |
| Native read-only probe | Static captured AccessCheck script; token queries | Executed; unsafe elevated context demonstrated, not environment PASS |
| Scope/diff | Exact5-file subset of16; git diff --check; frozen artifact comparison | PASS |

Final suites overlap: 249 distinct passing tests; do not sum52+209 as unique. The existing Intermediate/IELTS/Foundation/history mocks in dedicated API suites pass; this is not real DB regression proof.
Initial new-module setup errors, TypeScript narrowing errors and one type-only-import lint error were retained in local logs and corrected. They are not counted PASS. The temporary unfinished dispatcher and its8 unit cases were removed, not delivered or counted as runtime coverage. No scaffold claims task completion.
The earlier intermittent HTTP mock test did not recur in this execution: final dedicated suite209/209 passed. Its previous root cause remains unproven; no retry or timeout inflation was used here.

## Independent review

Fresh read-only reviewer Socrates01a176be-aa45-7d50-b7ff-53760750c12f inspected the5-file partial patch, static boundaries and existing evidence; no edits/DB/testenv actions/nested agent.
Initial verdict: request changes,1 P1/2 P2, no P0. Coordinator disposition in ONE fix pass:

| Finding | Disposition |
| --- | --- |
| P1 human reference/actor/timestamp not bound | FIXED:5 failing spoof/renewal cases RED->GREEN, exact actual note/actor/reference/time/hash pin; new tampered-note regression plus mutation experiment |
| P2 missing explicit TRUNCATE denial | FIXED: granted/missing TRUNCATE cases both RED->GREEN |
| P2 dangling link/unavailable lstat accepted | FIXED: both cases RED->GREEN, direct lstat and only genuine absence tolerated |

No second independent review is claimed. Findings were verified with observed regression/mutation results after the review; full-scope acceptance remains blocked.
Reviewer declined actual worker/root ACL enforcement, SQL collection/provisioning/cleanup/fixtures/DB/E2E/backup and wider POSIX ownership policy: these remain unqualified/deferred, not silently accepted. Final command exit results are coordinator evidence, not independently rerun by reviewer.

## Runtime/migration/fixture/backup/cleanup status

| Operation/evidence | Actual status |
| --- | --- |
| 48 locked migration files | Hashes verified;0 applied |
| Database/container/role provisioning | NOT RUN;0 created |
| DB identity/privilege isolation from main worklingo | NOT PROVEN; no connection to either target or main, hence no Gate B |
| Fixture import/audio/review/publication | NOT RUN;0 written/published; no candidate or APPROVED_RELEASE |
| PostgreSQL locks/rollback/idempotency/V1/V2 and C1/C2 history | BLOCKED / NOT RUN |
| Real Intermediate/IELTS DB regression | BLOCKED / NOT RUN |
| Desktop/Mobile E2E and API/Web47771/47772 | BLOCKED / NOT STARTED |
| Backup/restore verification | BLOCKED / NOT RUN; no database was provisioned by this execution |
| Cleanup execution/verification test | NOT RUN; no run resources created; absence inventory is separate from cleanup PASS |

Read-only final inventory: exact Docker container and volume names absent; no listener on55432/47771/47772; run root and approval root absent. Docker metadata inspection is not a PostgreSQL query. No production DB/storage, source media, learner state, real providers, public release, later increment, merge/push/deploy touched.

## Remaining work and recommendation

P0: none identified in reviewed partial slice. P1 ENV-001 remains BLOCKED as above; overall data qualification incomplete. Review code P1/P2 fixed by TDD; no additional confirmed P2 deferred in this slice. Unknown runtime behavior is not passing.
The following11 approved source paths have NOT been implemented/changed in this execution:

- apps/api/prisma.beginner-test.config.ts
- apps/api/test/beginner-isolated/egress-guard.cjs
- apps/api/test/beginner-isolated/fixtures.ts
- apps/api/test/beginner-isolated/run.spec.ts
- apps/api/test/beginner-isolated/run.ts
- apps/api/test/integration/beginner-authoring.integration.spec.ts
- apps/api/test/integration/beginner-release-registry.integration.spec.ts
- apps/api/test/integration/beginner-test-harness.ts
- apps/web/e2e/beginner-admin-history.spec.ts
- apps/web/e2e/beginner-admin.spec.ts
- apps/web/playwright.beginner-admin.config.ts

After qualified worker/operator context is supplied within the same approved identity, revalidate live grant/expiry/source candidate, complete remaining harness/coverage and actual NTFS root proof, obtain required code review, then begin Gate B only if every safety condition passes. No renewal by metadata edit, no OS-policy change under this grant.
Recommend MND-20261024-003 remain implementing. MND-20261025-002 also remains implementing, with no verification transition. Do not start R1.2b.

## Execution rulings and rollback

- Reused exact approved scratch/worktree/branch and dedicated mock configs; no install/default .env suite. Cost if wrong: missed unrelated checks, never permission to touch DB.
- Existing new-program catalog row/migrations stayed read-only; no provisioning needed before a valid worker context. Cost if wrong: delayed data qualification rather than unsafe data writes.
- Stopped on actual token evidence instead of inventing a weaker/de-elevated worker. No borrowed account, UAC change, ACL workaround or out-of-scope file. Cost: incomplete Gates A/B, explicitly reported.
- Removed unfinished dispatcher/tests, delivered only validation primitives and real ACL hardening. Cost: remaining11-file work, not fake completion.
- Review covered this partial5-file slice; one TDD fix pass, no second reviewer. Cost: broader/runtime unknowns remain blocked.
- Retained ignored logs; stable summary/hash evidence committed separately. No destructive scratch cleanup; no branch integration menu because user explicitly prohibits merge/push/deploy.
Rollback if separately requested: revert only these partial source commits, retaining original P1 lifecycle fix24756b3/history readers. No data rollback/restore/cleanup was necessary or attempted; no automatic revert executed.

## Local evidence hashes

Private/ignored bookkeeping logs are in the approved scratch root; only non-secret hashes/results are retained here.

| Artifact | SHA-256 |
| --- | --- |
| execution-preflight.json | f4de2f4d9dcc9e269d290e70ef9d7ed53f6b888b7e8f2067a67533560d450561 |
| acl-red.json | fb265dc84fcfb70c9f772c59b2cdc2acc2fe1ac54a8d94d0ba314947a0a8039d |
| acl-green.json | 6cf88e7e18b56804589fa653456814a548aa21be709ba13050dc4c47557730c0 |
| ancestor-red.json | 21b5cc78a4277a720da8506c302896bed10147080d269f62da31f01498136627 |
| posix-red.json | e2ebde9a7f7c51dd5c9907ea69765a742156afe306d7f5cc738775b493c13152 |
| review-red.json | 6efc1e18559cb4bcc9959d5cfe3183a16a75d3561d646514e0935f6e8d7c8098 |
| review-green.json | 6952eeb368f79e6868f3052571f6c717a6ac612f5e982fe92322eaf04a6ea4c9 |
| grant-mutation.json | 4038ba082b9ed708a62f0eb65511f81325e92b6ffacb5885ba8fc01c058ce57d |
| tools-final.json | 89ba8b8a7912203c9882fb083c53f3be51186ac3a58f992f60e45fa0b9ac0cc2 |
| api-regression-final.json | ff1d11e89328cc472cce3d121526ced145996eebca73f7d6ec19db9e9e55ddc7 |
| native-boundary-evidence.json | 79f405124a6211067648a2628c6d482ec6d9bb074eb6459c2dd1e2652ed5625f |
| api-lint-accepted.log | 62f57a403f9d872e11c0ed4529f65719b0d0308144700434492057b17eee7aad |
| api-typecheck-last.log | 4e29d731c1b54a8bdf0e47d662089e6d912c484c40589e02bda75644cfcbd1d0 |
| api-build-accepted.log | 19590b56250c7e505e05d0eed9763eee456e70ac8b183cc1c7d2b28d06a8c0dc |

## Skill audit

Used: mandate-steward for actual conditional approval/CLI/frozen records; executing-plans/TDD for bounded partial Gate A and ledger; systematic-debugging for observed kernel blocker and review reproductions; Git/worktree skills for isolated explicit atomic commits; Node/Nest/Postgres guidance for guard and least-privilege validators; requesting-code-review and reviewer code-review-and-quality for fresh read-only review; verification-before-completion for actual exits and precise BLOCKED claims; quota optimizer for scoped reads/suites.
Not used: DB/integration/E2E/provider/production workflows, live fixture setup, extra implementers/reviewers or broad scans. Not allowed until qualified safety gates; no blocked/skipped tests counted PASS.

## Worker/environment recheck — 2026-10-26 06:15 UTC

Authority: the product owner's subsequent RESOLVE R1.2a ENVIRONMENT BLOCKER request authorizes existing-worker inspection and source work only inside the existing scope, explicitly prohibits Gate B, and requires stopping if no suitable worker is found. This recheck does not renew the original activation timestamp, change scope/hash, or approve OS configuration changes.

Baseline before this recheck: clean worktree, branch codex/foundation-basic-readiness, HEAD 2b5eb0f. Prior source commits e7332c2/ab13782 are unchanged. Only this existing governance report is changed by this recheck; diagnostics remain in the existing ignored evidence directory.

### Fresh observed evidence

- Read-only process inventory used OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION), OpenProcessToken(TOKEN_QUERY), and GetTokenInformation for TokenElevation, TokenElevationType, TokenIntegrityLevel, TokenIsAppContainer and TokenUser. No impersonation, token assignment, debug privilege enablement, borrowed token, process launch under another identity, or account/security/ACL modification was attempted.
- At 06:15:26 UTC, 290 process records were enumerated; 288 token queries completed. Idle PID0 returned error87; System PID4 denied token query with error5. These two unknown tokens were not classified as safe. No command lines, credentials, browser content or production data were read.
- Current shell, Explorer and existing Node/Node_REPL/Bun/Codex execution processes: elevated=true, integrity SID S-1-16-12288. Current linked-token query still returned error1312.
- There are 54 observed non-elevated tokens, so a claim that the machine has no non-elevated processes would be false. Of these, 41 are current-user interactive application processes at Untrusted (32) or Low (9) integrity. The others are service/virtual identities. None of the inspected current-user interactive tokens is non-elevated, non-AppContainer, and Medium integrity (8192 through below12288). No suitable existing execution worker or supported worker launch channel was established. Non-elevated service/application tokens are not authority to borrow them for tests.
- Session inventory: one active console session; services disconnected and RDP listener only. Local enabled account names were inspected as metadata only; an enabled account is not evidence of a usable running worker. No login or credential request was attempted.
- Repository path exists and its ACL metadata was read. Exact run/storage/registry/runtime/artifact roots and approval root do not exist. Their nearest existing ancestors are the user's Temp directory and C:/ProgramData respectively; ACL/SDDL metadata was captured read-only. No target root or file was created. Parent ACL metadata is not effective-access proof for a qualified worker on the actual planned roots; that acceptance remains BLOCKED.
- An initial diagnostic probe used the wrong fixed native buffer length and returned error24. Its output was rejected as invalid evidence. The corrected probe obtains the native buffer size first; only its completed queries supply the counts above. This was a diagnostic correction, not a product source or environment change.

### Gate A criteria for this recheck

| Criterion | Fresh result / limitation |
| --- | --- |
| Captured approval, source baseline, allowlist and scope hashes | PASS through readCapturedScope/verifyCapturedAuthority; candidate hash 7d59f79b70c711c5cb4810424c703a674aedcbd3c9a975ad51b4e732f75f6ae6 unchanged |
| 48 locked migration files / 10 frozen artifacts | PASS: raw hashes match; zero migrations applied |
| Current execution context safe for worker | FAIL: actual token is elevated/high integrity |
| Suitable existing non-elevated worker and repository/run-root access | BLOCKED: no qualified worker established; no execution/access test under another token |
| Actual NTFS ACL/effective access for run/storage/approval roots | BLOCKED: roots absent and worker unavailable; only existing repository/ancestor ACLs were read |
| Pure preflight/environment validator regressions | PASS: 52 passed, 0 failed, 0 skipped/pending; command below |
| Operational runner fallback, cleanup and PostgreSQL lock/rollback/idempotency/V1/V2 coverage | BLOCKED: remaining harness work not performed after the explicit Step1 stop condition; validator tests do not qualify an unimplemented runner |
| Lint/typecheck/build | NOT RERUN: no source changes; previous results above are historical, not new executions |
| Gate A overall | BLOCKED; ENV-001 remains open |
| Gate B | NOT RUN and explicitly prohibited in this task |

Fresh commands: pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-isolated-tools.config.ts --reporter=json --outputFile=../../.superpowers/sdd/2026-10-25-beginner-r12a-isolated-db-e2e/worker-recheck-tests.json; readCapturedScope/verifyCapturedAuthority through tsx; node .agents/skills/mandate-steward/scripts/mandate.mjs validate. All exited0. Mandate validation returned valid=true, count7. No DB connection/provisioning/migration/fixtures/publication/release/server/provider/cleanup operations were executed.

### Owner choices / unchanged gates

1. Supply access to an existing standard-user interactive worker/session capable of the required repository/run-root access, using its supported execution channel. Verify the actual token and effective access again; keep the captured identity/paths. Merely restarting under the elevated Explorer or pointing at a browser sandbox does not prove this.
2. If no such existing context is available, separately decide a narrowly scoped OS/test-worker setup or another environment. Any new account, policy/ACL change outside the captured roots, or changed environment/identity requires a separately captured matching approval before action. This recheck does not perform that setup or choose it on the owner's behalf.

Until then, do not implement the remaining harness under a falsely passing worker preflight. Both MND-20261025-002 and MND-20261024-003 remain implementing; original parent001 remains captured/approval=null. No source changes, new production/learner state, next increment, merge, push or deploy.

| New ignored evidence | SHA-256 raw bytes |
| --- | --- |
| worker-token-recheck.json | ea5a47ac4a671afae1cc1f82a8268114d259e91860e2ead8dd2d78d91ecb75d2 |
| worker-acl-recheck.json | d33b1420c897d56f570fff5e01f7adf65951268f6bd00bce84ac0c6b1b8967c5 |
| worker-recheck-tests.json | 46a6a81b4197eaac6cd16498876529e3f5530bba9762d888f6b64384bd2d9586 |

Skill audit for this recheck: mandate-steward -> unchanged authority/state and evidence report; systematic-debugging -> native token/ACL diagnosis and corrected diagnostic measurement; quota optimizer -> existing report plus one focused suite, no redundant build/repo scan/subagent; verification-before-completion -> fresh command exits/counts and explicit BLOCKED criteria; git-workflow-and-versioning -> one explicit documentation commit. TDD/implementation/DB/E2E workflows were not entered because the user's Step1 stop condition was met.
