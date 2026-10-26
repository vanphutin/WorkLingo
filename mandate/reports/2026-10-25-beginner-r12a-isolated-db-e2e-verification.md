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
