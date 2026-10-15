# Git integration — 2026-10-15

## Authorized scope and baseline

The human requested: “Push merge dọn dẹp git và câc file ch commit”. This authorizes
committing the existing local work, pushing it, merging reviewed changes and cleaning
integrated Git branches. It does not approve public deployment or IELTS calibration.

The primary checkout began on `codex/ui-redesign-v2` at `11d85bf`, with 35 existing
IELTS phase 6–8 commits beyond the previous main and pending UI, i18n, AI routing,
curriculum, verification and repository tooling changes.

## Integration

- [Audit PR #10](https://github.com/vanphutin/WorkLingo/pull/10) was squash-merged as
  `478e116`. Its resulting tree exactly matched the reviewed audit head `ab6d9e2`.
- Pending files were committed by responsibility: skills/mandates, API/contracts,
  Foundation duration handling, bilingual UI, and verification/browser journeys.
- Main was merged locally. The only conflict was `package.json`; the resolved gate
  retains i18n, mandate, setup, PostgreSQL-client and secret-scanner checks.
- [Integration PR #11](https://github.com/vanphutin/WorkLingo/pull/11) preserves the
  existing IELTS history together with the new commits.

An external-to-repository backup holds the original binary patch, untracked files,
the additionally discovered skill catalogs, branch inventory, and a verified complete
Git bundle. The audit worktree was archived through Codex after saving its ignored
execution ledger. Other tasks' active worktrees remain outside cleanup scope.

## Review findings resolved

Two independent reviewers inspected the pending backend and frontend scopes. The
backend review found that sequential AI fallback calls could outlive the worker's
30-second lease and trigger duplicate paid calls from another worker.

The effective lease now takes the larger of the configured lease and three provider
timeouts plus ten seconds when evaluation or STT uses a live provider. This is a
conservative budget for the bounded provider chain; existing all-fake defaults and
larger configured leases remain intact. Two regression cases failed before the fix;
all 55 focused configuration, routing and worker tests passed afterward. The reviewer
confirmed that the fix addresses the reported trigger. Arbitrary event-loop stalls
or database outages still require lease renewal/fencing if stronger guarantees are
needed; a fixed budget cannot guarantee exactly-once external billing.

Git's broad `data/` ignore rule also excluded 39 required UI skill catalog files.
A narrow exception now includes those vendor files. Validation and a catalog search
passed from a `git archive` extraction, using only committed files.

The integrated suite exposed three intermittent failures in the existing audio and
publish lifecycle tests. PostgreSQL was measured about seven milliseconds ahead of
the client clock. Those tests disabled periodic workers and depended on the immediate
enqueue nudge, which could find no job yet eligible by `availableAt`. Their existing
poll loops now explicitly drive the real `JobRunnerService`; business assertions and
timeouts are unchanged. Both suites then passed all 11 tests without background
worker teardown errors.

No other Critical/Important findings were reported in the scoped reviews. Those were
static reviews; supplied tests and screenshots are not independent manual UX or
live-provider verification. Existing IELTS changes retain their phase review reports
and are included in the repository-wide regression gate.

## Verification

- `pnpm install --frozen-lockfile`: passed with the merged dependency graph.
- i18n check: 27 namespaces, 1,642 paired keys, zero errors; 7 checker tests passed.
- Mandate register validation: valid; 22 CLI tests passed.
- Lease regression: two expected failures before the fix; 55 related tests passed
  after the fix, plus focused ESLint and API TypeScript checks.
- Committed UI skill package: all 12 domain files, 22 stack files and reasoning
  catalog validated; a targeted search returned the expected UX entry.
- Tracked environment/private-key scan: passed.
- Integrated `pnpm audit`: 0 critical, 4 high, 10 moderate, 1 low advisories, unchanged
  from the audit PR. These advisories are not claimed to be remediated here.
- Full API run: 784/787 tests passed across 157/159 files; the only three failures
  were the worker-dependent audio/publish tests above. Both corrected files passed
  all 11 tests in a focused rerun. All 787 API cases have passing evidence across
  the broad run and corrected-file rerun; this is not one green full-suite run.
- Content-format tests: 47/47; shared-contract tests: 86/86.
- Web tests: 366/366 across 81 files; workspace build passed.
- Browser journeys: all 65/65 passed in one integrated desktop/mobile run (6.1 minutes).
- In total, all 1,286 content-format, contract, API and web test cases have passing
  evidence, with the API worker-test qualification above. Lint and workspace
  TypeScript checks passed; changed test files also passed focused ESLint.

The first `pnpm verify` run retained the pre-fix configuration module while the lease regression
  was being added and failed those two cases. A fresh run passed that configuration
  suite, then exposed the three audio/publish worker-test failures described above.
  These failures and their focused passing reruns are retained as evidence. The web
  tests, build and browser checks resume the remaining gate stages separately;
  neither interrupted `pnpm verify` invocation is reported as passing.

The pinned upstream UI skill's `scripts/design_system.py` contains existing trailing
whitespace. Its vendor content is preserved; explicit staged whitespace checks
excluded that one vendor file. Application/integration diff checks passed.

## Release boundaries

Automated providers remain fake during tests. No live paid-provider check or public
deployment was performed. Human IELTS/content calibration and the existing pilot
release decisions remain separate from this Git integration.
