# MND-20261026-001 — partial OS setup receipt

Date: 2026-10-26, Asia/Saigon. Execution started from 8c3bc63df04309140e241e085050a0e32341f1f7 on codex/foundation-basic-readiness. Human approval was recorded via CLI approved -> implementing at 2026-10-26T06:51:16.457Z, proposal4c772bb0e7ee9820e64742cf56b92a94d2f6bec231a776eea5591af103238c34. Proposal/plan/scope/baseline/117 source rows/16 frozen artifacts/tool bytes and account/root absence matched before OS changes.

## Actual changes before the owner's switch request

- Created wl_beginner_r12a at 2026-10-26T06:58:27.7556784Z, SID S-1-5-21-3809754005-2092998575-1059868825-1014. Operator SID ends1001, worker ends1014. Native secure credential input was supplied by the owner; no password stored in chat, report, Git or bookkeeping. Native prompt data/secure string were disposed, no password replay/login by the agent.
- Verified local membership is only Users SID S-1-5-32-545. No Administrator/Docker group or OS privilege/policy grant made. Membership is not token/engine/database proof.
- Owner confirmed first interactive login and return to ASUS. CIM confirmed C:/Users/wl_beginner_r12a, the same SID, special=false, loaded=true. Session2 remained disconnected, not signed out. No agent-created alternative profile or token impersonation.
- Created14 exact directories from the locked scope, using atomic native CreateDirectory security descriptors: new ProgramData WorkLingo/approval/snapshot ancestry and dedicated run roots. All14 have operator owner SID ending1001 and protected DACLs: SYSTEM/Administrators/operator Full; worker ReadExecute on10 directories, Modify only storage/registry/runtime/artifacts. No pre-existing/shared-parent/profile ACL was modified. Full paths/SDDL/timestamps are in the durable ownership ledger and subsequent retirement scope.
- No source/dependency/Node copy, diagnostic manifest, activation permission, DB, fixture, server, provider or release was created. The14 directories contain only their recorded child directories, zero files at the subsequent read-only inventory.

## Results and limitations

| Check | Actual result |
| --- | --- |
| Authority/hash/absence/CLI | PASS |
| Exact new account/SID/Users-only membership | PASS |
| Owner first login / exact profile | PASS; profile still loaded |
| New-directory ACL owner/DACL metadata | PASS;14 scoped directories |
| Actual worker/child token, effective access, engine denial | NOT RUN; not inferred from membership |
| Harness fallback / SQL identity/roles / DB/E2E | NOT RUN/BLOCKED; outside OS-only authority |
| Full OS setup acceptance | INCOMPLETE; owner redirected the task before diagnostics |
| Gate A / Gate B | BLOCKED / NOT RUN |

Two corrected operational errors are retained, not counted PASS: New-LocalUser description length52 exceeded its actual48 limit, failing before account creation; shortened description29 was accepted after fresh native secure input. A native helper method named New collided with PowerShell constructor syntax, failing before any directory creation; renamed CreateOwned then created the14 roots with recorded ownership. No global workaround or privilege change.

No source code was changed and no product tests/build/lint were run for this OS-only slice. TDD workflow cannot authorize edits to an empty source allowlist or DB tests. Scope-locked ignored bookkeeping was used rather than the workflow's default scratch location; sibling ledgers were preserved. No independent final OS acceptance review is claimed, because the user stopped this setup before acceptance.

## Handoff after direct user steering

The owner's subsequent SWITCH TO OPTION C AND RETIRE TEMPORARY WORKER request stops further setup, forbids OS mutations/DB writes pending a new matching proposal, and requests read-only inventory/capture. Preserve this receipt and ownership evidence. Do not delete/disable/sign out the worker, remove roots, change ACLs, start a container or continue diagnostics under old approval. Original MND-20261026-001 and both R1.2a qualification mandates remain implementing, not verified; original parent001 remains captured/null.

Existing setup rollback was SID/ownership-bound; under the new instruction retirement must wait for a separately matching scope/hash. Account deletion cannot restore its original SID; profile preservation is the default. No rollback/cleanup has been executed.

Evidence: .superpowers/sdd/2026-10-25-beginner-r12a-isolated-db-e2e/windows-worker-os-ownership.json and windows-worker-os-progress.md; no credentials in either. [Human approval](2026-10-26-beginner-windows-worker-human-approval.md), [frozen setup scope](2026-10-26-beginner-windows-worker-scope.json).
