# Verification Environment Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the complete repository verification use the configured local database and prove recovery and browser journeys without weakening assertions.

**Architecture:** Keep the existing application and test isolation. Load local database configuration before Vitest collects suites; use PostgreSQL clients that connect to the explicit URL even when only Docker is available.

**Tech Stack:** Node 20, TypeScript, Vitest, PowerShell, PostgreSQL 17, Docker Desktop, Playwright.

**Spec:** `docs/UI_REDESIGN_REPORT.md` remaining verification issues and `docs/LOCAL_DEVELOPMENT.md` recovery guarantees; user approved fixing the verification gate.

## Global Constraints

- Preserve pending UI redesign and unrelated work on `codex/ui-redesign-v2`.
- Keep automated providers fake, schemas isolated, checksums and non-empty-target rejection intact.
- No global configuration changes, new dependencies, commits, pushes or deployment.
- Execute inline, then one independent review. Keep review web/API services available where possible.

## Review Focus

- Explicit TEST_DATABASE_URL must take precedence over the local DATABASE_URL.
- Docker fallback must respect host, port, credentials and database instead of silently selecting Compose data.
- Connection failures must fail closed and clean incomplete backups.
- Restore must reject occupied targets and preserve literal values during schema translation.
- Browser journeys share published content; investigate secondary-page state instead of increasing timeouts or retries.

### Task 1: Database configuration and health isolation

**Files:** `apps/api/vitest.config.ts`, `apps/api/test/integration/health.integration.spec.ts`.
**Interfaces:** configured TEST_DATABASE_URL -> existing isolated integration harness.
- [x] Reproduce original health and backup integration failures (session 72339).
- [ ] Load root local env before suite collection, retain explicit TEST_DATABASE_URL, keep fake-provider overrides.
- [ ] Replace hardcoded health URL with the existing isolated test-app harness.
- [ ] Run health integration and confirm exact readiness response and no leaked paths/URL.

### Task 2: PostgreSQL client fallback

**Files:** `scripts/backup-local.ps1`, `scripts/restore-local.ps1`, shared `scripts/postgres-client.ps1` if needed, `apps/api/test/integration/backup-restore.integration.spec.ts`, `docs/LOCAL_DEVELOPMENT.md`.
**Interfaces:** explicit database URL -> local client or ephemeral Docker PostgreSQL client; backup manifest -> isolated restore.
- [ ] Reproduce backup failure with database configuration corrected.
- [ ] Make Docker clients connect to the explicit endpoint, using already installed PostgreSQL 17 image and environment credentials.
- [ ] Run complete recovery integration including real record/file round-trip, checksum/path safeguards and occupied-target rejection.

### Task 3: Browser reliability and final gate

**Files:** existing browser tests/config only if a reproduced cause requires it; `docs/VERIFICATION_ENVIRONMENT_REPORT.md`.
**Interfaces:** configured test DB -> fresh schema -> existing Playwright journeys.
- [ ] Run complete `pnpm verify`, record output and investigate any reproduced failure before changing code.
- [ ] Run one independent review of task-specific diff; fix actionable findings and rerun affected checks.
- [ ] Record actual counts, outcomes, remaining limits and final live-review service status.

## Execution decisions

- Work in the existing feature branch because the final gate must verify the pending redesign; a clean worktree would omit it. User approval of the concrete task and autonomy requirements govern execution without another handoff approval.
- Retain verification logs and report locally; no automatic commit, reset or cleanup of user changes.
- Reproduced a second Next dev server failing while the review server was running. Isolate E2E distDir through its existing test-mode environment; preserve the review server and fake-provider configuration.
- First full gate reproduced backup test timeout under concurrent web/API test workers (standalone recovery passed). Serialize package test execution without increasing test timeouts or removing coverage.
- API `test` already includes all integration suites (confirmed by the complete first run). Remove the duplicate integration invocation from verify; retain every suite once and the separate focused command.
