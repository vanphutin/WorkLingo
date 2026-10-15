# System audit fixes implementation plan

> **For agentic workers:** Use superpowers:executing-plans for implementation and a fresh final reviewer.

**Goal:** Repair reproduced job queue defects and confirmed verification regressions without including pending feature work.
**Architecture:** Preserve NestJS/Prisma module boundaries and PostgreSQL job identity. Keep changes independent of the pending UI, locale and AI routing features.
**Tech Stack:** TypeScript, NestJS, Prisma, PostgreSQL, Vitest, pnpm.
**Spec:** `docs/ARCHITECTURE.md` sections 7–9; user's system-wide audit/fix/Git request dated 2026-10-15.

## Global constraints

- Preserve business logic, API contracts and database integrity; no schema changes.
- Never disable tests, reduce validation or hide failures.
- Commit explicit files only; preserve preexisting dirty changes.
- The user explicitly authorized continuous ordinary fixes/tests/commit/push/PR without another approval handoff. Merge remains subject to repository policy.

## Review focus

- Replayed enqueue must preserve the surrounding transaction's writes.
- Concurrent identical enqueue must persist exactly one job.
- A different actor/resource/type must receive a conflict on key reuse.
- Manual retry must not overwrite a newer worker claim.
- Expanded curriculum fixtures must not invalidate tests of session feasibility.

### Task 1: Atomic job enqueue and retry

**Files:** `apps/api/src/jobs/application/jobs.service.ts`, its unit test, `apps/api/test/integration/jobs-worker.integration.spec.ts`.
**Interfaces:** Preserve `enqueue(input, transaction?)`, `retryJob(jobId, actorId)` and existing 409/404 contracts.

- [x] Reproduce transaction replay failure (`25P02`) and cross-actor key collision using real isolated PostgreSQL tests.
- [x] Add concurrent enqueue/retry coverage; require one persisted job and one retry winner, with no overwritten live lease.
- [x] Replace exception-driven duplicate insertion with conflict-safe insertion and validate job ownership/identity. Use a conditional retry update.
- [x] Run job unit/integration tests, API lint/typecheck, then repository tests/build/E2E.
- [x] Review the diff and commit as `fix: make job enqueue and retry concurrency safe`.

### Task 2: Verification regressions and dependency findings

**Files:** Only evidenced test setup/assertion defects and narrowly justified dependency manifests/lockfile.
**Interfaces:** No product behavior changes; tests remain compatible with the committed and pending fixture versions.

- [x] Diagnose baseline failures in `%TEMP%/worklingo-audit-20261015/verify.log`; preserve intended business assertions.
- [x] Verify each minimal fix with focused tests before the final gate.
- [x] Triage registry advisories using actual versions, reachability and primary sources; apply only compatible, verifiable remediations.
- [x] Record actual remaining blockers and separate commits by responsibility.

### Task 3: Preserve requested PostgreSQL endpoints in recovery

**Files:** Existing pending `scripts/backup-local.ps1`, `scripts/restore-local.ps1`,
`scripts/postgres-client.ps1`, `scripts/postgres-client.test.ps1`; root test script.
**Interfaces:** Retain existing script parameters, path checks and restore admission rules.

- [x] Clean full gate reproduced three backup/restore failures with the actual local endpoint.
- [x] Review and reuse the existing pending endpoint parser/Docker client fix, preserving source checkout contents.
- [x] Parser regressions pass for IPv6, default PostgreSQL port, explicit ports and remote endpoints.
- [x] Rerun all ten backup/restore integration tests against disposable schemas/directories.
- [x] Include this newly evidenced scope in independent review and a separate commit.

### Task 4: Remove secret scanner self-match

**Files:** `scripts/qualification/scan-secrets.ps1`, new executable `scan-secrets.test.mjs`.
**Interfaces:** Preserve failure on tracked environment files and private-key markers without printing secrets.

- [x] Reproduce the false positive: the existing regex matches only the scanner source itself.
- [x] Write temporary-Git-fixture tests; observe two clean-repository cases fail while six secret cases pass.
- [x] Match actual PEM headers; all eight tests and the real tracked-file scan pass.
- [x] Complete lint/review and commit separately.

### Task 5: Keep browser journeys aligned with published curriculum

**Files:** `apps/web/e2e/adaptive-learning.spec.ts`, `apps/web/e2e/admin-content-authoring.spec.ts`.
**Interfaces:** Preserve server-owned duration eligibility and explicit curriculum version publication.

- [x] Reproduce fixed-duration assumptions against expanded fixtures and Admin timeout after lesson publication.
- [x] Assert all browser duration choices against API availability; retain controlled API duration-boundary tests.
- [x] Explicitly publish the old binding, assert it becomes unavailable after N+1, then republish the binding before starting the new session.
- [x] Focused pending-checkout adaptive desktop/mobile and Admin desktop: 3/3 passed.
- [x] Verify the clean branch and run previously blocked Admin/qualification projects.
- [x] Review and commit this test-only change separately.

### Final gate

- [x] Fresh independent five-axis review, targeted mutation check, final diff/secret check.
- [ ] Commit, push the fix branch and open a PR against the remote default branch.
- [x] Preserve all original checkout changes and report verification limits; no pilot/release approval inferred.

## Execution rulings

- Use an isolated native worktree based on `origin/main`: the original feature branch contains 35 unrelated unpushed commits. The fix PR must not publish those commits.
- Run the pending checkout's baseline separately from the clean fix branch's gate; neither proves the other's exact state.
