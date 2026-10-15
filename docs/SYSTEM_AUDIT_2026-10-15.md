# System audit — 2026-10-15

Scope: on-demand audit/fixes explicitly authorized by the repository owner on 2026-10-15.
Inspected the NestJS/Next.js/pnpm architecture, authentication/roles, local storage, durable jobs,
recording/Admin uploads, curriculum/session/progression boundaries, existing qualification tests,
dependency graph and Git state. This is bounded engineering evidence, not a proof that every defect
has been found or a pilot/production approval.

## Baseline and isolation

- Original checkout: `codex/ui-redesign-v2`, `11d85bf`, 178 modified tracked files plus untracked
  feature work. Its 35 commits ahead of `origin/main` were excluded from this PR.
- Fix worktree: `codex/audit-job-safety`, based on remote `main` at `6d7e027`.
- Original checkout `pnpm verify`: format/i18n/mandate/setup/PostgreSQL-client/lint/typecheck passed;
  API baseline was **154 files passed / 4 failed, 756 tests passed / 15 failed**. All 15 failures
  belonged to the four fixture-dependent test files repaired below. Later verify stages did not run.
- Named human calibration/content/pilot approvals in `docs/RELEASE_CHECKLIST.md` remain pending.

## Confirmed defects and repairs

| Severity | Defect and evidence | Repair |
| --- | --- | --- |
| HIGH | A duplicate enqueue inside a PostgreSQL transaction caused `25P02`, aborting surrounding work. Concurrent transactional enqueue reproduced the same failure. | Conflict-safe `createManyAndReturn` with `skipDuplicates`; preserve original job identity and transaction writes. |
| HIGH | Two manual retries reading the same failed job were both accepted; unconditional writes could replace a newer worker state. Deterministic synchronized reads reproduced two winners. | Conditional update against failed/retryable state and observed attempt counters; only one retry wins. |
| HIGH | Installed Multer `2.0.2` parses attacker-controlled multipart fields at both audio upload boundaries. Safe bounded numeric-index cases were accepted before protection. | Pin `2.3.0`, enable `fieldArrayIndexLimit: 0` for scalar-only forms, normalize the new parser error to safe HTTP 400. |
| HIGH | The clean branch's backup/restore rehearsal failed three cases: Docker fallback ignored the requested database host/port and selected the Compose service. | Reuse the existing pending PostgreSQL client helper and script fixes; preserve the requested endpoint and scalar connection parameters. |
| MEDIUM | Enqueue key collisions across actors returned another actor's job reference. | Include actor ownership in replay identity validation; return existing 409 conflict contract. |
| MEDIUM | Seed/session/progression tests assumed exactly five activities and complete required mastery evidence from 60 minutes. Expanded fixtures caused 15 failures. | Assert exact input-to-persisted identity and fixture-sized counts; create controlled duration-boundary content; complete the longest supported session in progression setup. |
| MEDIUM | Secret qualification always failed because its broad private-key regex matched its own source. Filename-only search identified the scanner as the sole match. | Match actual PEM markers; executable temporary-Git-fixture tests preserve detection of five key header forms and tracked environment files. |
| MEDIUM | Health integration bootstrap overwrote the configured test database with hardcoded `127.0.0.1:5432`; focused reproduction failed before the readiness assertion. | Reuse the existing isolated-schema harness and env-loading test configuration, keeping provider overrides fake and credential-free. |
| MEDIUM | Browser adaptive tests assumed 90 minutes was always unavailable, while expanded seed content enables it; Admin publication test timed out after a valid stale-curriculum rejection. | Check every duration option against API availability. Explicitly publish and republish curriculum bindings around N+1 publication, asserting the intervening 422 contract. |

Application/tooling defect totals: **0 Critical / 4 High / 5 Medium / 0 Low**. The two enqueue reproductions
share one root cause. Test failures are grouped by their shared fixture-assumption cause.

## Dependency security

Registry advisories are counted separately from reproduced application defects. Vitest `3.2.4`
was patched to `3.2.6` in all four test projects; its tinypool dependency is pinned to `2.1.2`.
The repository requires Node 20, satisfying tinypool 2's Node 18 removal. The full test gate must
establish compatibility before publication. Audit after these patches: **0 Critical, 4 High,
10 Moderate, 1 Low**, compared with **3 Critical, 10 High, 10 Moderate, 2 Low** initially.

Remaining High advisory modules: `path-to-regexp`, `lodash`, `effect`, `deepmerge-ts`.
No matching vulnerable route pattern, affected Lodash function, application Effect RPC, or recursive
Prisma CLI configuration was established. These are installed-version findings, not demonstrated
application exploits. Deeper framework/tooling updates are deferred rather than hidden; deepmerge-ts
requires a major upgrade. Vitest's remaining mocker advisory requires a separate Vitest 4 migration.

Primary sources: [Multer field expansion](https://github.com/expressjs/multer/security/advisories/GHSA-535w-7cp7-47q4),
[Vitest UI/API advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp),
[Vitest 3.2.6](https://github.com/vitest-dev/vitest/releases/tag/v3.2.6),
[tinypool 2.1.2](https://github.com/tinylibs/tinypool/releases/tag/v2.1.2),
[tinypool 2 migration](https://github.com/tinylibs/tinypool/releases/tag/v2.0.0).

## Verification

- Job regressions: **4 RED → GREEN; 12 focused tests passed**. Removing the ownership guard made
  its regression fail; the source was restored. No live provider calls or production data mutations.
- Multipart/filter boundary: **13 passed**, including safe 400 responses; real existing speaking
  and Orientation Admin upload journeys: **3 passed** after configuring the local test database.
- Fixture regression group: **57 passed** with expanded fixtures and **57 passed** with the original
  fixture alias. Exact title/ordered slug mapping assertions were retained in final review.
- Fix branch format, setup regression script, lint and typecheck: passed.
- Recovery: three clean-gate failures reproduced before reuse; **10/10 backup/restore integration
  tests passed** afterward, plus **4/4** endpoint parser cases. These are disposable rehearsals,
  not a supervised production restore. The original pending recovery scripts were preserved.
- Secret scanner: **2 RED false positives → all 8 tests GREEN**, and the actual tracked-file scan
  passes. Synthetic fixture marker text is not private key material; test output never prints it.
- Health: original bootstrap connection failure reproduced; isolated-schema readiness/privacy test
  passed after reuse. Test configuration resolves the local `.env` while preserving explicit test settings.
- Final repository tests: **217 files / 1,045 tests passed, exit 0**: content format 47, contracts 68,
  API 670, web 260. No skipped test remains in this final run.
- Final full lint/typecheck passed; repository build passed. Security qualification **22 tests passed**
  and tracked-file secret scan passed. The verify command runs integration coverage once and serializes
  package test workers; it also includes the new parser/scanner regression commands.
- Original pending checkout: **81 web files / 366 tests passed**, repository build passed.
  Browser baseline: **55 passed / 3 failed / 7 blocked**; the three repaired cases passed on focused rerun.
  All seven blocked cases subsequently passed; the final corrected Admin test passed desktop/mobile
  serially. Every one of the original **65 E2E cases has passing evidence across these runs**.
- Clean browser baseline: **32 passed / 1 Admin failure / 7 blocked**; focused adaptive desktop/mobile
  passed, and final serial Admin/qualification run **10/10 passed** after resolving the initial-binding
  seed-slug assumption. Every one of the clean branch's **40 E2E cases has passing evidence**.
  These staged results do not claim a new single full E2E run or a single invocation of `pnpm verify`.

## Limits and stewardship

The repository has no checked-in CI workflow; GitHub reports `main` is not protected. No merge or
release approval is inferred from that setting. API tests include existing integration and security/recovery qualification
files; the duplicate standalone integration invocation from the old verify script is intentionally
not run a second time. Performance qualification and a new supervised backup/restore drill are not
claimed. Existing release reports remain historical evidence.

Mandate search for queue/retry scope found no existing candidate; no speculative proposals or new
sprint board were created. The original register validated successfully (one item); register content
was preserved. Canonical execution reference: `docs/superpowers/plans/2026-10-15-system-audit-fixes.md`.
Independent review found no Critical/Important issue in queue/upload/toolchain/test/recovery/health/scanner
or final browser test changes. Deferred nonblocking coverage: independently
changed enqueue `type`, `resourceType`, and `resourceId` lack individual collision tests, and occupied-schema
restore rejection lacks a dedicated empty-directory test. Both source guards remain present.

Review rulings: preserve existing replay identity semantics for payload/retry-limit/content-import
differences; no stronger transaction isolation or empty optional resource strings were found in callers.
No exploitability is inferred for remaining advisories. Existing native-client IPv6, encoded username/database
and TLS URL limitations, broader schema translation, cross-system restore atomicity and remote Docker daemons
remain outside this local recovery patch. Secret formats outside PEM, Git history/untracked files and Git-command
failure behavior are unchanged. These limits require separate evidence before expanding scope.

Git handoff: all repairs are isolated on `codex/audit-job-safety`; original feature changes remain
in their checkout. The feature branch's 35 unrelated commits were neither published nor merged.
Human pilot approvals remain required. The fix branch is pushed for [PR #10](https://github.com/vanphutin/WorkLingo/pull/10), without auto-merge.
