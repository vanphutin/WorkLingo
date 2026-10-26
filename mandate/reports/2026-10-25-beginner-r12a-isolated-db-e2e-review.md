# R1.2a isolated DB and E2E preapproval review

2026-10-25. Planning/capture only. Baseline520acdc on codex/foundation-basic-readiness, clean existing linked worktree. No source, DB, server or test execution authority granted now.

## New findings

1. [Dedicated integration config](../../apps/api/vitest.beginner.integration.config.ts) collects two specs, currently3 tests. [Harness](../../apps/api/test/integration/beginner-test-harness.ts) deliberately does no provisioning/migration/cleanup and expects existing descriptor/fixtures. Full PG locks/rollback/negative ownership/preview state/history-service/legacy qualification is missing.
2. [Playwright config](../../apps/web/playwright.beginner-admin.config.ts) requires API47771/Web47772 and existing auth state without starting servers. Two scenarios x two projects do not cover requested editor/review/auth journeys. History currently selects first multi-version binding; new tests need descriptor’s explicit actual IDs.
3. [Default Prisma config](../../apps/api/prisma.config.ts) and ordinary API/Web wrappers load .env. AppConfig already has isolated-test ignoreEnvFile, so no AppConfig edit is proposed. Dedicated Prisma config and clean mirrored Web build/start avoid default env fallback and shared .next output.
4. [Current preflight](../../apps/api/src/beginner/domain/beginner-environment-preflight.ts) uses accessSync(W_OK) for operator root. Installed primary Node documentation at apps/api/node_modules/@types/node/fs.d.ts:3824 states fs.access does not check Windows ACL. Existing preflight spec uses virtual FS. Propose non-mutating OS effective-access proof and tests, with no writable-root exemption or weakened guard.
5. Node network guard and E2E routing currently accept any loopback port. Proposed runner/browser exact endpoint allowlist isolates another local app; no product route/controller change.
6. Permission schema binds003/software hash1170d5... literally. Retain contract; actual new environment approval belongs in trusted operator envelope/authorizationSource with child hash. Software approval alone cannot authorize data. Exclude approve-release.
7. P1 source24756b3 and verification520acdc present. [Previous verification](2026-10-25-beginner-r12a-p1-verification.md) has final101/203 passing suites and one transient unchanged HTTP test failure; historical evidence only, not fresh test runs in this capture.

## Read-only observations

Local Docker desktop-linux uses npipe:////./pipe/dockerDesktopLinuxEngine. Existing postgres17 image RepoDigest matches scope; only image/context metadata inspected, no container started/executed.
No listeners observed on55432/47771/47772; proposed run/approval roots absent. Future identity/ownership/ACL proofs remain pending.
Migration scan found pgcrypto and existing data/backfill steps. Migration20261012000100_learning_programs inserts four catalog Programs, including Beginner10000000-0000-4000-8000-000000000001/COMING_SOON. The plan was corrected to verify/reuse that isolated migration row instead of creating a duplicate Program. Empty-user enrollment backfill must remain zero. All48 migration files are locked read-only; no migration/seed executed.
Only WORKLINGO_DATA_DIR path values were extracted for protected-root exclusion; no env file loaded into process env and no DSN/credential printed or stored.
Mandates001 captured/null,002 verified,003 implementing,20261025-001 verified; proposal approvals match current frozen records.

## Scope/self-review

[Plan](../../docs/superpowers/plans/2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md) and [scope lock](2026-10-25-beginner-r12a-isolated-db-e2e-scope.json) define eight modify/eight create paths, exact resources/role rights/actions/commands/cleanup and M01-M12.
Old parent scope is frozen. This is a distinct local environment/data qualification follow-up, not duplicate software implementation. Publisher/curriculum/learner resolver/registry contract/service and verified P1 files remain read-only.
Tracked capture artifacts are only plan/review/scope, CLI child item and generated INDEX; an ignored hashing helper/input remains in the bookkeeping scratch root. No runtime permission, fake human grant, container, isolated environment root/ACL, product implementation, DB query, fixture or test was created/run.
Self-review checked requirement coverage, phase dependencies/interfaces, no fallback/default config, rollback/junction cleanup and separation from actual release approval. No independent subagent review claimed now; future harness code requires review before provisioning.

## Risks and blockers

- Full DB concurrency/history/authorization/rollback/cleanup and E2E are unproven; current3 integration tests cannot qualify003.
- Real Windows ACL/non-elevated operator boundary and clean Web mirror/dependency resolution require observed checks after approval. Mock proof cannot waive these gates.
- Exact database/privilege/server/descriptor/candidate identity is proposed, not existing. Any failed preflight stays BLOCKED.
- Prior HTTP failure root cause remains unproven; recurrence needs diagnostics, no hidden retry/timeout increase. Extra source fix needs renewed scope.
- No actual APPROVED_RELEASE, production/shared DB/storage, provider or learner authority requested. Later candidate-specific human approval remains separate.

Hashes for plan/review/allowlist/source baseline/environment/migrations are in scope JSON; Mandate CLI proposalHash binds their values. New child remains captured/triaged with approval=null pending matching human decision. Originals remain unchanged.
