# Gate Recovery investigation

Starting HEAD `67df2afa226f0d53c7b4f6c1bf206ca35beaac02`. Historical evidence remains immutable. New runs live in `evidence/gate-recovery/`.

## Backup/restore

The previous full run loaded the old20s test budget before its correction; that outer budget contradicted the bounded45s migration plus60s PowerShell subprocess. Observed facts: backup timed out; the later restore returned status0 but the restored sample-audio file did not exist. Vitest timeout marks the test failed without automatically cancelling its underlying async continuation. An incomplete/shared fixture or continuation overlap is an inference, not a separately demonstrated causal chain; the evidence does not establish that the entire backup artifact was missing. The already-committed outer budget is120s. No backup-product or data assertion change is needed.

The fresh test now records `task.timeout` from the running Vitest task, alongside the unchanged child budgets. `backend-focused-current` records loaded timeout120000 and passes all10 backup/restore tests, including path/manifest protections, actual dump checksums and restored data. Setup40s and sequential teardown remain independent hook budgets; child processes are synchronous and bounded. No `.concurrent`, retries or assertion relaxation was added. A complete final backend result is still required.

## Placement: no demonstrated root cause yet

Observed historical failure: the first speaking `runOnce()` returned false after successful recording202. The old disposable database has been destroyed, so that job's state/locks cannot be reconstructed retrospectively. The new instrumentation preserves the exact caller-supplied `now`, delegates to the original claim implementation with identical arguments, and logs IDs/type/status/attempt limits/availableAt/database time/due predicate/lease owner/waiting relation locks. No payload, credentials or learner content is logged.

- `placement-diagnostics-before`:40 complete four-skill journeys plus ordinary-learning test,120 successful claims.
- `placement-diagnostics-stress-before`:100 complete journeys plus ordinary test,300 successful claims.
- `placement-hotpath-before`:100 complete journeys plus ordinary test,300 successful claims. Failure-only instrumentation performs no diagnostic SQL/logging on successful claims; it calls the original claim exactly once.
- `queue-immediate-before`:300 real immediate enqueues/claims without HTTP latency. One diagnostic test passed; two unrelated tests were excluded by the explicit name filter, not release qualification. Temporary probe source is archived separately for reproduction, removed from normal test registration afterwards.
- Focused backup/placement/queue/runner tests are qualified separately. These passes do not erase the historical failure or prove an unknown cause fixed.

Investigation boundaries:

| Candidate cause | Evidence / conclusion |
| --- | --- |
| Transaction visibility | Recording awaits the transaction containing attempt/recording/enqueue and session advancement before returning202. Transcription similarly awaits child evaluation enqueue before completing. Diagnostics use the same schema/client and observe committed queue rows. No visibility defect reproduced. |
| Queue eligibility | Claim requires PENDING/RETRY_WAIT, availableAt≤captured now, attemptCount<maxAttempts; RUNNING requires expired lease. Structured snapshots retain these inputs. All observed pending jobs were due; no future-dated failing row captured. |
| Time sources / precision | Enqueue uses PostgreSQL default now; manual runner uses JavaScript Date. PostgreSQL timestamps/Node Date have finite precision and clocks can differ, but neither the old three samples nor the new successful timelines prove that this caused the historical false claim. Do not label a clock defect confirmed. |
| Concurrent workers / locks | Vitest forces JOB_WORKER_ENABLED=false, files are not parallel, runner boot starts a timer only when enabled. Each context overrides Prisma with a UUID schema. Captured timelines show one worker, no prior claims and zero waiting relation locks. This cannot rule out every historical row lock; none was captured. Existing two-client worker tests exercise SKIP LOCKED, leases, stale completion and retry boundaries. |
| Setup / cleanup / order | resetLearners awaits job deletion before user deletion before each case. Independent unique schemas and owner-labeled tmpfs databases isolate invocations. Placement calls transcribe, evaluation, then writing evaluation in order; all completed recommendations retain zero ordinary mastery/progression effects. |

No production scheduler, clock, availableAt, polling interval or assertion has changed. No arbitrary sleep or retry was introduced. If the final full run is green without a demonstrated cause, the intermittency remains an unresolved qualification issue; a passing rerun alone is insufficient to declare it fixed.

## Additional real-browser failure

The expanded real API run exposed a stale curriculum journey: it searched Today for roadmap articles that the approved dashboard places under Progress. Error context shows the actual Today tab selected; source confirms CurriculumRoadmap is in the progress panel. The test now explicitly opens Progress for available/locked/completed assertions and returns to Today to launch learning. No product UI or roadmap assertion changed. First run11/12; replacement curriculum/mock4/4. Both logs are retained. New actual-API tests independently exercise unsaved Foundation draft lifetime and delayed IELTS save-and-exit persistence/locking.

## Evidence and execution rules

New optimized E2E build uses `.next-e2e` targeting owned API34106; public preview `.next` remains at33300. Per-run live test output now uses the runner's unique evidence directory, preventing deletion/collision with another run's artifacts. Generated next-env imports are restored only to their verified starting bytes after builds. Original/main/LG/backup remain read-only. The initial preservation-before report verifies1295 original protected files and2978 backup files, all52 dirty dispositions plus index/status/ref fingerprints.
