# Final investigation review

One independent read-only reviewer (Planck) reviewed010f31d..4577379, the plan, actual RED/GREEN logs, matrix traces and source hashes. No sub-review or implementation agent was used. Findings: no Critical, two Important and one Minor. The author verified and graded them before changing anything.

## Important fixes

1. **Rejected namespace could overwrite evidence.** The old launcher threw on existing result.json but unconditionally wrote its new BLOCKED result in finally. A synthetic manifest fixture proved byte corruption (RED). Exclusive atomic directory reservation and conditional publication preserve the sentinel exactly (GREEN). Real matrix/matrix-fixed evidence was not used as the destructive test fixture. Child creation is never reached on rejection.
2. **Unbounded child/Docker waits.** The old child lifecycle awaited close without a deadline. A finite self-terminating real Node child demonstrated missed deadline (RED). The bounded lifecycle now uses180s per Vitest child, owner-PID tree termination (taskkill /T /F on Windows), awaits close, and reports failure if closure cannot be confirmed within10s. Docker calls have30s deadlines, Git metadata10s, DB connect/pool10s and clock transaction15s. Cleanup checks exact generated container ownership, including ambiguous docker-run failure. The same child test observes timely termination/close (GREEN). A new full four-cell matrix exercises the corrected orchestration; its outcome is in matrix-reviewed/result.json.

No apps/packages bytes changed during these launcher fixes. Full backend uses the unchanged run-phase6-live.cjs harness and source4577379. Two launcher tests fail before remediation and pass afterwards; raw/normalized logs and failing helper source are retained separately.

## Minor deferred

Legacy diagnostics mode `true` records returnedAt/claimDurationNs before its actual claim, and `hostNow` is ambiguously named when the supplied instant is persisted eligibility. The investigation uses only boundary/failure modes: their measured claim duration is correct; documentation identifies hostNow as supplied runner time and enteredAt/returnedAt as wall time. `true` mode durations must not be used. This is deferred diagnostic cleanup, with no product/runtime or acceptance verdict effect.

## Evidence correction

The reviewer counted18 gaps of1ms and one of2ms, correcting the author's initial simplified commentary. All19 are future-eligibility observations after a natural failed claim, not atomic old-database snapshots. Summary and investigation documentation use the corrected count.

## Declined-to-judge rulings

The reviewer left full backend qualification, final report conclusions and preservation seals for the author's remaining gates. **Ruling:** independently execute/read the complete final run, verify all protected hashes/refs and evidence manifests, and derive readiness only after those checks. Cost if wrong: a false release assessment; focused tests cannot substitute. No second reviewer loop; fresh executable evidence verifies the fixes.

**Ruling:** retain plan, scratch, branch/worktree and evidence under the user's preservation/stop directive; no finishing merge menu, cleanup, merge/push/deploy or extra approval pause. Cost: retained local disk usage. Only synthetic test fixture files are removed by their own tests.
