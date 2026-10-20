# GR-PLACEMENT-001 Investigation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve this plan/evidence after completion by explicit user instruction.

**Goal:** Establish why placement claim returned false, or report bounded uncertainty without a speculative product fix.
**Architecture:** Existing integration worktree, existing placement journey/assertions and owned tmpfs PostgreSQL. A dedicated diagnostic launcher runs independent Vitest processes against unique schemas on the same disposable server. Production queue behavior remains unchanged unless a proven cause earns a failing regression test.
**Tech Stack:** Node, Vitest, NestJS, Prisma, PostgreSQL17/Docker Desktop.
**Spec:** User's GR-PLACEMENT-001 FINAL ROOT-CAUSE INVESTIGATION message, 2026-10-21; this is the reachable conversation specification.

## Global Constraints

- Worktree D:/Projects/WorkLingo-Integration, integration/worklingo-release-candidate; baseline010f31d, previously testedef27185.
- No integration replay, merge, push, deploy, production database access, arbitrary claim sleep/retry or weakened assertions.
- Preserve historical failure/evidence, original/main/Liquid Glass/backup.
- Unknown cause after additional bounded non-reproduction is YELLOW, requiring explicit exception approval, never automatically GREEN.

## Review Focus

- Diagnostics must not confuse post-claim observations with an atomic pre-claim snapshot.
- Parallel processes must share only disposable server resources, never learner/schema state.
- Startup/import time configuration must never fall back to a developer database or paid provider.
- Bounded contention tests must release locks/transactions on failures.
- No-reproduction cannot prove the historical cause; preserve test/source provenance.

### Task 1: Diagnose and characterize

**Files:** placement-isolation.integration.spec.ts; jobs-worker.integration.spec.ts; docs/integration/evidence/placement-root-cause/run-matrix.cjs.
**Interfaces:** Existing JobsService.claimNext(workerId, now, leaseMs), runner.runOnce(now?), inspectJobClaim(database, now). Launcher consumes only generated disposable DATABASE_URL/TEST_DATABASE_URL; produces redacted per-process logs and metadata.
- [ ] Verify checkpoint and old seals before mutation.
- [ ] Characterize future availableAt and uncommitted enqueue visibility with explicit promise barriers; retain existing SKIP LOCKED/ownership/retry/lease checks. These are characterization controls, not claimed RED→GREEN fixes.
- [ ] Add opt-in post-claim diagnostics with wall and monotonic timestamps; no SQL before the actual claim in this mode. Preserve failure-only no-success-I/O mode.
- [ ] Run four bounded matrix cells: single, parallel2, single+other-integration load, parallel2+load. Same PostgreSQL server per cell, unique schemas per child. Each placement child runs30 journeys; maximum180 journeys/540 claims total. Inspect every result; if observed failure, investigate that trace before any fix.
- [ ] If cause proven, write real failing regression, minimal owner fix, verify GREEN. Otherwise record no speculative fix and uncertainty.
- [ ] Commit only reviewed explicit test/harness files after targeted lint/types and results.

### Task 2: Qualify and report

**Files:** Existing integration reports/progress/readiness; new evidence namespace and seal verifier.
**Interfaces:** Task1 source commit + per-cell logs feed final source/test provenance and readiness.
- [ ] Run related onboarding/IELTS/queue checks and one full backend suite on stable committed test source; inspect complete outcome, retaining failures.
- [ ] Run frontend/contracts and real API/browser only if affected runtime/source requires them; otherwise verify byte equality and reference prior evidence explicitly.
- [ ] Verify whitespace, historical seals and all protected original/backup bytes; review final change with a fresh reviewer.
- [ ] Record twelve requested conclusions and readiness. Commit evidence/docs separately; stop without merging/pushing/deploying.
