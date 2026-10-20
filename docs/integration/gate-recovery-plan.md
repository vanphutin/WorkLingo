# Final Integration Gate Recovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, with one final independent review of the recovery range. This extends the existing integration plan; it does not repeat integration.

**Goal:** Explain and resolve backend qualification failures and bind fresh qualification to the final candidate.
**Architecture:** Reuse the owned disposable PostgreSQL/API/browser harness and approved Glass UI. Instrument the test boundary before changing any scheduler. Keep historical evidence immutable and store new evidence in `evidence/gate-recovery/`.
**Tech Stack:** NestJS, Prisma/PostgreSQL, Vitest, Next.js, Playwright, PowerShell.
**Spec:** User attachment `f93d18fc-5198-4ede-914a-c56aaf570f71/Pasted text.txt`.

## Global Constraints

Only `D:/Projects/WorkLingo-Integration`, branch `integration/worklingo-release-candidate`, starting HEAD `67df2af`, may change. No main/LG/original/backup/deferred changes, production database, real provider, merge, push or deploy. Preserve failed evidence and all safety/data assertions. No arbitrary sleep, weakened assertion or unlimited retry.

## Review Focus

Clock precision/transaction visibility at immediate enqueue→claim; delayed retry/lease boundaries; worker contention and row locks; timeout child/parent/teardown ordering; delayed save/exit and curriculum draft survival on actual final-source API/browser journeys.

### Task 1: Baseline and controlled reproduction

Files: existing preservation/source verifiers; `placement-isolation.integration.spec.ts`; test-only diagnostics helper if needed.
Consumes: sealed source/evidence at `67df2af`. Produces: protected-state proof, structured queue timelines and a demonstrated root cause or explicit RED blocker.

- [ ] Verify clean source seal and protected snapshots; open optimized Glass web in Codex.
- [ ] Trace queue enqueue/claim, worker settings, reset/schema boundaries and backup timeout inheritance.
- [ ] Instrument captured claim time, database time, job IDs/status/eligibility, attempts and locks; reproduce with bounded repeats. Keep the original claim assertion.
- [ ] Identify the demonstrated cause and owner. If unproven, do not guess a production fix.

### Task 2: Minimal correction and regression

Files: confirmed owner and its test(s), determined from Task 1 evidence.
Consumes: observed root cause. Produces: committed correction with RED→GREEN evidence, unchanged business semantics.

- [ ] Write a deterministic failing regression for the confirmed boundary and observe RED.
- [ ] Apply the smallest owner fix; verify GREEN plus bounded stress and adjacent queue/retry/isolation tests.
- [ ] Verify backup/restore with actual checksum/data assertions on disposable PostgreSQL using the existing 120s outer budget.
- [ ] Review diff, lint/types and commit explicit paths only.

### Task 3: Final qualification and handoff

Files: real E2E tests only where needed to cover final draft fixes; four existing reports; new recovery evidence/manifests.
Consumes: final product/test commit. Produces: full backend verdict and final-source E2E/frontend/gate evidence plus readiness.

- [ ] Rebuild both required web artifacts from final source; real owned-DB auth/placement/learning/legacy/V3/admin/curriculum/audio journeys, including save-and-exit and unsaved drafts.
- [ ] Run one complete final backend suite; full web/contracts/content-format; lint/types/i18n/build; owner and affected critical cross-browser tests. Inspect failures, never infer broad PASS from a focused rerun.
- [ ] Independent review of recovery range, remediate important confirmed findings with RED→GREEN if any.
- [ ] Record exact source/test hashes, all runs (including failures), fresh preservation and Git whitespace checks. Update progress/QA/readiness/handoff and commit scoped evidence.
- [ ] Stop with explicit readiness and remaining human decisions. Retain branch/worktree/evidence; no merge.

## Execution rulings

The user's continuous recovery directive supplies execution approval; no redundant plan-approval pause. Existing known RED gates are the task, not grounds to ask whether to investigate. User preservation/evidence requirements override skill scratch cleanup and merge menus. New evidence must not rewrite the 582-artifact historical seal. Browser and test ports/output directories must remain separate.
