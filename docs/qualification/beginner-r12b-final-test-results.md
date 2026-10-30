# R1.2b final verification results

Results are measured during this mission, with overlap disclosed; no inflated aggregate total. Selected safe configurations deny project environment files and external providers. The broad unit run excludes one actual DB integration stored under src; that unchanged test passed separately against the owned database, rather than being skipped to conceal its result. Default shared-database and complete hosted E2E suites were not executed.

|Group|Observed result|Command|Evidence under runtime logs unless stated|
|---|---|---|---|
|API entire src unit/contract plus static security|1160/1160 PASS;161files;0skipped|pnpm --filter @worklingo/api exec vitest run --config C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030/artifacts/api-all-safe.config.mts|api-all-safe-final.log|
|Web component regression|936/936 PASS;146files|pnpm --filter @worklingo/web exec vitest run --config C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030/artifacts/web-safe.config.mts|web-components.log|
|Shared parser/contracts|294/294 PASS;42files|pnpm --filter @worklingo/api exec vitest run --config C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030/artifacts/shared-safe.config.mjs|shared-tests.log|
|Serialized existing qualification Node|179/179 PASS;15files;0skipped|pnpm --filter @worklingo/api exec tsx --test --test-concurrency=1 test/beginner-pilot/provider-calibration.test.ts test/beginner-pilot/cost-benchmark.test.ts test/beginner-pilot/browser-simulation.test.ts test/beginner-pilot/gate-c-session.test.ts test/beginner-pilot/rehearsal-protocol.test.ts test/beginner-pilot/cost-accounting-final.test.ts test/beginner-pilot/oracle-adjudication.test.ts test/beginner-pilot/qa-evidence-closure.test.ts test/beginner-pilot/disposable-db.test.ts test/beginner-pilot/qualification-runtime.test.ts test/beginner-pilot/external-expert-intake.test.ts test/beginner-pilot/gate-c-evidence-hardening.test.ts test/beginner-pilot/gate-c-session-kit.test.ts test/beginner-pilot/bcd-cost-options.test.ts test/beginner-pilot/bcd-local-calibration.test.ts|node-regression.log|
|Root mandate/i18n/secret-scan tests|37/37 PASS|node --test .agents/skills/mandate-steward/scripts/mandate.test.mjs scripts/i18n-check.test.mjs scripts/qualification/scan-secrets.test.mjs|root-regression.log|
|Offline speech PowerShell guards|9/9 PASS|pwsh -NoProfile -File tools/qualification/beginner-r12b-offline-speech.test.ps1|audio-guards.log|
|Workbench plus unchanged importer|17/17 PASS (8 importer tests overlap179 above;9 new)|pnpm --filter @worklingo/api exec tsx --test --test-concurrency=1 test/beginner-pilot/expert-review-workbench.test.ts test/beginner-pilot/external-expert-intake.test.ts|reviewer-final-fixed.log|
|New local runner and current governance|6/6 PASS (4 runner+2governance)|pnpm --filter @worklingo/api exec tsx --test --test-concurrency=1 test/beginner-pilot/finalization-local-calibration.test.ts test/beginner-pilot/finalization-governance.test.ts|finalization-node.log|
|Final runtime/collector/current governance|7/7 PASS (5runtime/collector+2overlappinggovernance)|pnpm --filter @worklingo/api exec tsx --test --test-concurrency=1 test/beginner-pilot/finalization-browser-runtime.test.ts test/beginner-pilot/gate-c-browser-observations.test.ts test/beginner-pilot/finalization-governance.test.ts|browser-governance-final.log|
|Unchanged IELTS DB integration|1/1 PASS in owned UUID schema; schema absent afterward|node C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030/artifacts/run-isolated-ielts.cjs|isolated-ielts-integration.log|
|Real local application Playwright|5/5 PASS;24journeys192attempts24writingresults72audio checks|pnpm --filter @worklingo/web exec playwright test --config playwright.beginner-finalization.config.ts|See finalization-browser.json commands/private receipts|
|Bounded no-reload probe|1/1 PASS;3pause/resume cycles;9preserved selections|Same isolated Playwright config, --grep pause/resume|See finalization-browser.json|
|Frozen002 exact historical epoch|106/106 PASS at6c60362;overlaps60 current unit tests|pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-requalification.config.ts (epoch002 snapshot)|frozen002-requalification.log|
|Frozen005 guard|3/3 PASS at36bab10; protected bytes restored from exact snapshots|pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/bcd-governance.test.ts (epoch005 snapshot)|frozen005-governance.log|

The serialized179 files: provider-calibration, cost-benchmark, browser-simulation, gate-c-session, rehearsal-protocol, cost-accounting-final, oracle-adjudication, qa-evidence-closure, disposable-db, qualification-runtime, external-expert-intake, gate-c-evidence-hardening, gate-c-session-kit, bcd-cost-options and bcd-local-calibration (all `.test.ts`). Concurrency1 avoids shared synthetic fixtures.

API/Web/shared lint and typechecks PASS; API `tsc -p tsconfig.build.json` PASS. Frontend production `next build --webpack` PASS in an exact 624-file snapshot without project environment files; the tracked input manifest includes required fixture dependencies. The build generated 41 static pages and built the dynamic routes. `node scripts/i18n-check.mjs`:43namespaces/2795pairedkeys,0errors. `pnpm mandate:check`:33validitems. Tracked-file environment/private-key secret scan PASS.

## Failures retained and disposition

- Actual browser four-activity plan: RED retained,007 restored eight;59 focused tests and final24 actual journeys pass.
- Actual writing jobs: prior-run-006 preserves24failed jobs.008 corrects blank fake feedback; fresh24writingresults persist. Typed speaking remains explicitly unscored.
- Broad first attempt:1149PASS/6FAIL/1hook-skipped plus1unhandled configuration error. Five failures were stale topic mocks, independently reproduced at baseline5FAIL/8PASS and fixed by009 without dropping assertions (14/14 now pass). One isolation assertion used the wrong loopback guard; exact strict guard restored. Mislocated DB integration failed before access with blank DSN; it subsequently passed in its own no-env controlled database schema. Final broad run1160PASS/0FAIL/0SKIPPED.
- Current historical post-context suite:105PASS/1FAIL because its frozen Discovery hash predates approved2c975f8 wire compaction. No current mission Discovery change. The unchanged test and47protected baseline files pass106/106 at its intended6c60362epoch; current adapter/context regressions pass in1160. This is a superseded historical expectation, not silently updated to green.
- First frontend build helper supplied duplicate preload paths; subsequent snapshot attempts omitted transitive E2E fixture dependencies used by a component test. Failed logs001..003 retained; final tracked fixture snapshot builds without weakening TypeScript or assertions.
- 008 test initially failed exact optional-property typechecking; omission of the absent optional field retains that testcase and final typecheck/8focused tests pass.
- Browser harness selector, published-audio preference and asynchronous refresh failures remain archived. Final mandatory activity-specific audio and evaluated-result assertions pass. Stable no-reload pause/resume probe did not reproduce the earlier answer-reset exposure.

## Deliberately unexecuted or pending

No remote inference (Discovery0), new model continuation, paid fallback, real participant/expert test, microphone/STT qualification, physical power-cut, production merge/push/deploy, target smoke/health or rollback execution. Manual CUA stopped by URL policy. The software browser regression remains separate. Existing default suites that read project `.env` or sharedDB were not invoked. No failing test was edited into skip; final bounded suites have zero skips.

Whole branch `git diff --check main..HEAD` retains five P3 blank-EOF diagnostics: three frozen004 files plus006authorization/scope. Baseline36bab10..HEAD retains those latter two only. New final staged diff is clean. Approval-bound bytes were preserved; the initial006commit whitespace mistake is disclosed.

Exact log paths/SHA256 and all new primary evidence hashes are in final-qualification-matrix.json. No publication-quality performance, full-WCAG, human comprehension or phonetic certification follows from these checks.
