# R1.2b durability verification

Mission `WL-R12B-EVIDENCE-CLOSURE-001`; mandate `MND-20261030-004`; execution date 2026-10-30. **Process crash and restart recovery PASS in the tested synthetic scope; physical power-loss NOT_PROVEN.** The qualification runner continues to return `runnerSafe:false` and `PROCESS_CRASH_ONLY_POWER_LOSS_NOT_PROVEN`. Release durability acceptance remains blocked.

The coordinator executed the unchanged `apps/api/test/beginner-pilot/qualification-runtime.test.ts`: **30/30 PASS, zero failures, zero skipped**, duration 13.318 seconds. Log: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-durability-current.log`. Reproduction from the linked repository root:

```powershell
node --require ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cjs/index.cjs --test apps/api/test/beginner-pilot/qualification-runtime.test.ts
```

Only the existing exact `.qualification-runtime/beginner-r12b/fault-tests` selectors were used. These are synthetic reservation/evidence fixtures; their completed receipts do not represent provider calls or incurred charges. Live accounting was not touched. No host shutdown, volume detach, physical disk exhaustion or destructive filesystem experiment was performed.

| Boundary | Actual evidence | Practical limit |
| --- | --- | --- |
| Single writer and cross-process ownership | Two actual Node processes contend for the lock; the second fails. Stale/foreign owner is retained. | No distributed lock or remote filesystem certification. |
| Abrupt process loss | Child processes are killed before reservation, after reservation, during request and after response. Pending reservations remain consumed; stale ownership prevents automatic restart. | Windows process termination does not remove host/controller power. |
| Restart and idempotency | New runtime instance replays completed receipts and exact evidence; duplicate request/evidence IDs reject. | Readability after process restart does not prove persistence after a power cut. |
| Journal, chain and high-water state | Truncated/corrupt journal, missing journal, altered sequence/hash and rehashed invalid semantics all reject. Replayed IDs/privacy/reservations are validated again. | A hash chain is integrity detection, not independent durable storage. |
| Atomic derived state | Injected rename failure leaves the journal reservation recoverable as UNKNOWN. | The test does not establish atomic directory-metadata persistence across power loss. |
| Disk-full and partial append | In a real child, filesystem API wrappers throw ENOSPC before append or after 20 bytes. Transport count stays zero; a partial line fails recovery. | Controlled API fault injection; the physical volume was not filled. |
| Flush failure | A real child throws at journal fsync after append. No transport starts; surviving reservation remains UNKNOWN and blocks another start. | Tests error handling, not storage-controller flush honesty. |
| Timeout and cancellation boundaries | Runtime timeout retains a consumed UNKNOWN start with no retry. The current 60-test provider-calibration suite separately covers bounded transport, timeout and cancellation. | Provider settlement for timeout/cancel remains unverified; no actual remote requests were sent. |
| Limits and privacy | Pilot/lifetime/rate/token/model boundaries survive replay; oversized, secret-like and synthetic-to-official publication attempts reject. | These checks do not authorize a live provider run. |

The underlying implementation fsyncs file descriptors and writes the journal before state replacement. There is no demonstrated containing-directory fsync or power-failure experiment for the actual Windows/NTFS/device stack. It would be incorrect to call filesystem power-loss durability verified from these results.

The disposable PostgreSQL report separately proves migrations, transaction rollback and bounded persistence; it does not prove PostgreSQL power-loss recovery, a backup restore, migration downgrade or production disaster recovery.

Completion requires an explicitly owned disposable power-loss test environment and a documented acceptance protocol: record OS/filesystem/device/cache/flush guarantees; force loss at journal/anchor/state boundaries; restart from the affected storage; reconcile sequence, hash chain, receipts and conservative budget; prove no duplicate transport. Use synthetic data and an isolated volume, retain raw before/after artifacts and ownership proofs, and review recovery before enabling a live runner. No permission to interrupt this user's machine or shared resources is inferred.

SKILL AUDIT
Used: verification-before-completion -> actual 30-test output and explicit proof limits; systematic-debugging -> distinguish process/API injection from hardware durability; git-workflow-and-versioning -> additive report, protected historical runtime unchanged.
Verification: 30 runtime tests PASS; provider-calibration suite 60 PASS in the current baseline run. Physical power-loss, target storage and live settlement NOT_VERIFIED.
Not used: new fault tooling or destructive storage testing, because existing tests cover the authorized process/API boundary and no appropriate power-cut environment is established.
