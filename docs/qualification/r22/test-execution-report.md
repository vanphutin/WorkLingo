# R2.2 test execution report

Execution date: 2026-11-07, Windows local engineering environment. Baseline fetched origin/main: 66af136c9227482dd72c1d17490afdcd19bfe72f. The final source revisions and integration receipt are identified in commit-inventory.md; documentation-only receipt commits follow source verification. IMPLEMENTED / TESTED / VERIFIED applies to the engineering assertions below. All four skills AI_QUALIFIED: BLOCKED. HUMAN_VALIDATED: NOT_RUN.

## Complete suite receipts

Commands run from the repository root unless marked API cwd. Database URLs were read from private temporary files into process environment, never printed or committed. R22 config requires the exact owned 127.0.0.1:55452/worklingo_r22 endpoint; the tests independently guard that identity. Default shared-env Vitest excludes these files, which remain a separate required gate. Unit-only config intentionally separates the actual-DB IELTS admin suite and strict network-denied Beginner context suite; both are run separately below.

| Gate | Actual command | Result | Raw local receipt |
|---|---|---|---|
| Complete API source unit suites | `pnpm --filter @worklingo/api exec vitest run -c vitest.r22.unit.config.ts` | 187 files / 1,272 tests PASS, 285.94s | `%TEMP%/r22-api-unit-release2.log` |
| Strict Beginner evaluator context | `pnpm --filter @worklingo/api exec vitest run -c vitest.beginner-evaluator-context.config.ts` | 2 files / 60 tests PASS; network denied | `%TEMP%/r22-beginner-context-release.log` |
| R22 actual DB/API/HTTP serializers | `pnpm --filter @worklingo/api exec vitest run -c vitest.r22.config.ts` | 6 files / 15 tests PASS, 122.89s; repeated after adding per-file DB guard | `%TEMP%/r22-integration-release.log`; `r22-integration-guarded-final.log` |
| Legacy placement/audio/IELTS admin DB seams | `pnpm --filter @worklingo/api exec vitest run -c vitest.r22.legacy.config.ts` | 5 files / 17 tests PASS | `%TEMP%/r22-legacy-db-final.log` |
| Existing R2 legacy integration | `pnpm --filter @worklingo/api exec vitest run -c vitest.r2-legacy.config.ts` | 6 files / 30 tests PASS, 62.62s; owned 55447 | `%TEMP%/r22-r2-legacy-six.log` |
| Original R2 integration suites | Safe `vitest.r2.config.ts` with the nine original non-browser `r2-*.spec.ts` filenames | 9 files / 43 tests PASS, 141.60s; owned 55447 | `%TEMP%/r22-r2-original-nine.log` |
| Unchanged restored Beginner journey | Original guarded `r21-beginner-journey.integration.spec.ts`, no-env restored clone config | 1 file / 1 test PASS, 46.09s; exact published Beta, 24 audio / 64 attempts / 8 lessons, productive practice unscored | `%TEMP%/r22-r21-journey.log` |
| Complete web units/components | `pnpm --filter @worklingo/web exec vitest run --maxWorkers=2` | 164 files / 1,007 tests PASS, 434.78s | `%TEMP%/r22-web-release.log` |
| Contracts | `pnpm --filter @worklingo/contracts test` | 36 files / 182 tests PASS | `%TEMP%/r22-contract-release.log` |
| Content authoring formats | `pnpm --filter @worklingo/content-format test` | 13 files / 158 tests PASS | `%TEMP%/r22-content-release-fixed.log` |
| All workspace typechecks | `pnpm -r --if-present typecheck` | All five packages PASS | `%TEMP%/r22-typecheck-frozen.log` |
| All workspace lint | `pnpm -r --if-present lint` | All five packages PASS | `%TEMP%/r22-lint-frozen.log` |
| All workspace builds | `pnpm -r --if-present build` | API and production Next routes plus shared packages PASS | `%TEMP%/r22-build-release.log` |
| Actual Next/Nest/Postgres browser | `pnpm --filter @worklingo/web exec playwright test -c playwright.r22.config.ts` | 3 tests PASS; desktop/mobile/tablet; 30 screenshots | browser-verification.md |
| Benchmark analyzer CLI | `pnpm --filter @worklingo/api exec tsx scripts/assessment-benchmark.ts --self-test` | SYNTHETIC_SELF_TEST; no live providers; qualification NOT_RUN | `%TEMP%/r22-benchmark-release.log` |
| i18n | `node scripts/i18n-check.mjs` | 46 namespaces, 3,107 paired keys, zero errors | Console receipt |
| Governance | `node .agents/skills/mandate-steward/scripts/mandate.mjs validate` | valid=true, 35 entries; no register mutation | Console receipt |
| Whitespace/secret hygiene | `git diff --check`; staged check; `scripts/qualification/scan-secrets.ps1` | PASS; scanner covers tracked env files/private-key blocks only | Final commit audit |

The raw logs are local temporary evidence, not an immutable public archive. Required outcomes and limitations are retained in these committed reports. Counts overlap across dedicated regression suites; do not sum them as distinct tests.

The R22 guarded rerun passed all 15 tests in 57.61s. The original R21 guard remained unchanged: owned 55450/worklingo_r21, public schema, and its previously published synthetic Beginner release/audio root. Only the additive R22 migration was applied there before the journey. No primary database was used. All 16 separately executed original R2/R21 regression files passed (74 tests), in addition to the five extra legacy seam files (17 tests).

## What actual integration proves

The six R22 suites exercise real Nest routes, dependency graph, serializers and PostgreSQL persistence: four submitted skills; exact lesson/context binding; owner/admin/no-probe operations; changed-key rejection; concurrent idempotency; linked re-evaluation; terminal update/delete rejection; expired-lease recovery; cancellation/controller ownership; latest-run mastery selection; audio deletion/expiry races; retained owner/range playback; multipart PCM and actual speech-response decoding. Real Admin source authoring publishes open-ended Reading and short-answer Listening through validation/audio generation/publication, then real learner projection/submission/assessment. Structured evaluator outputs come from a labelled localhost fixture, not an external AI.

Migration evidence includes all 51 migrations applied to the owned database and an isolated empty-schema DDL reversal/reapply. It does not prove lossless rollback of populated assessment history or production recovery.

Speaking upload without a transcript has all eight dimensions NEEDS_EVIDENCE, no provider calls and null total. Actual acoustic adapter evidence is preserved when present; unsupported intelligibility/stress/prosody cannot be inferred. PCM energy checks are not a speech classifier. Browser fake microphone and seeded tone validate media/application plumbing only.

## Failures preserved and investigated

- Early full API invocation lacked required disposable DB/context isolation; no shared database was substituted. Dedicated guarded configs split those required suites.
- Review regressions reproduced invalid evidence, private-ID leakage, long objective quote failure, mixed objective override and stale-worker controller loss before fixes. See independent-review-report.md.
- Initial controller barrier variants timed out; only the deterministic 3-versus-6 call regression is valid RED evidence.
- The first final API sweep had one localhost refusal test return PROVIDER_UPSTREAM instead of PROVIDER_REFUSED (1 failed / 1,271 passed). A separate 12-test adapter run and the complete 1,272-test rerun passed without a runtime change. The transport cause was not reproduced; this historical failure remains recorded, not relabelled PASS.
- The content-format sweep timed out during its first dynamic API-schema import under concurrent test/build load (157 passed / 1 timed out). Moving the import to module setup preserved assertions; all 158 subsequently passed.
- Source publication fixture corrections supplied valid bounded evidence, explicit listening source refs and direct owned job execution. An initial teardown double-disconnect was removed because app.close owns Prisma lifecycle. Final suite passed cleanly.
- Original scoring tests preceded implementation but their first execution occurred afterward. No observed initial RED is claimed for that subsection; later targeted regression failures were observed.

## External and unexecuted gates

Live-model accuracy/calibration, cross-model empirical comparison, measured inference cost/latency, real listening benchmark speech, representative speaking audio/accents, human calibration and production deployment are NOT_RUN/BLOCKED. No purchases, participant data or production learner data were used. The unchanged proposed AI thresholds are not satisfied by fixture agreement. Default external-assessment/privacy flags remain false and qualified policies empty. A single all-environment `pnpm verify` was not run because its default DB/browser infrastructure differs; the applicable guarded gates and their explicit commands are reported individually instead.
