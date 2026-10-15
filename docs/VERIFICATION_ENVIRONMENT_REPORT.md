# Verification environment — 2026-10-14

## Scope

Stabilize the complete repository gate on the existing local review environment. Application business logic, permissions, published curriculum and UI redesign are outside this change. Work remains uncommitted on `codex/ui-redesign-v2`.

## Changes and evidence

- Vitest loads root local env before collection and supplies `TEST_DATABASE_URL` to existing isolated-schema suites. Explicit test configuration takes precedence. A configuration probe passed for precedence and forced fake language/STT/TTS providers with blank live credentials.
- Health integration reuses the established isolated Nest/Prisma harness instead of overwriting the database endpoint with port 5432. Exact readiness response and configuration-redaction assertions remain.
- PostgreSQL backup/restore fallback uses an ephemeral client connected to the explicit URL. It no longer silently selects the Compose service. Loopback addresses are mapped to the Docker host; custom ports and credentials are forwarded. The already installed PostgreSQL 17 image is used with `--pull=never`.
- PostgreSQL URI parsing preserves default port 5432 and explicit port 80; bracketed IPv6 loopback is normalized. Four offline regression cases were added to the repository gate.
- Playwright web server uses `.next-e2e` so the existing review dev server can retain `.next`. Both retain their own API rewrites and server locks.
- Root package tests run sequentially to avoid recovery clients competing with concurrent web unit workers. Assertions, timeout limits, test coverage and Playwright retries were not relaxed.

## Red/green verification

1. Original health/recovery reproducer: two failing files; health could not reach 5432 and backup called stopped Compose service (session 72339).
2. Configuration/health fix: health passed; three recovery tests still failed on stopped Compose service (session 74362).
3. Explicit endpoint fallback: **2 files / 11 tests passed**, including real record/file round-trip and path/checksum/failure cleanup checks (session 80327).
4. Second Next dev server on port 33100 failed because the review server on 3000 owned the shared development directory; E2E directory isolation added.
5. First complete gate (session 92467, exit 1) reproduced a recovery test timeout under simultaneous API/web package workers. Web **69 files / 277 tests passed**; API **149 files passed / 1 failed, 704 tests passed / 1 failed**. Sequential scheduling added for the rerun.
6. Independent reviewer identified omitted-port and IPv6 cases. Regression script first failed, then passed **4/4** after fixes. A copy with inverted loopback mapping failed **2/4**; production source remained intact and passed **4/4** again.

## Review and scope rulings

Read-only independent review by Faraday covered the new configuration and scripts, with no additional workers or expensive duplicate test run. Both actionable parser findings were reproduced and fixed through regression tests.

- Existing encoded username/database and TLS query handling are unchanged limitations of these local recovery scripts; this work targets the documented local PostgreSQL environment.
- Existing schema translation, occupied-target checks and cross-system restore atomicity remain under their existing integration assertions. This is not a new atomic restore implementation.
- Existing UI changes were already separately reviewed and are preserved; the verification environment review does not claim to re-review their whole diff.
- Generated Next type references can change when a dev/build process runs; any generated changes will be inspected separately from source edits.
- Execute in the current feature branch to test the pending redesign; creating a clean checkout would omit the exact application being verified. No global configuration changes, commits, push, merge or deployment.
- Remove the duplicate API integration invocation from verify: its API test command already runs every integration file. Retain all test coverage once plus build/E2E and the separate focused integration command.

## Final gate

Pending: rerun `pnpm verify` after all configuration and parser fixes; record the final exit code and complete test/build/E2E counts here. A focused green run does not replace this release gate.
