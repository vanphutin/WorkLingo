# Candidate qualification

Qualification is independent of historical Phase0–6 acceptance. Selected base/main7a5e383, approved audio1a53d21, beta b4933bb, LGcc09a75. Runtime checkpoint1c91938,test checkpoint168b377; final product hashes are in evidence/candidate-source.json. Qualification closed2026-10-21 Asia/Saigon as **RED**, with the exact open backend gate below. No final release acceptance is claimed.

## Source and environment

- Windows/PowerShell, existing pnpm10.34.1, Node20, Next16.3.8, Prisma6.19.1, installed Playwright engines. No dependency upgrades.
- Browser fixtures exercise actual production-built components at127.0.0.1:33300. Fixture tests are not real auth/API/provider certification.
- Real API/browser tests use postgres17-alpine containers, random owner labels/ports/secrets,127.0.0.1 binding, tmpfs storage, isolated schema and synthetic learners. Container creation/cleanup recorded per run. No original .env or production data copied.
- WORKLINGO_PHASE6_EVIDENCE_ROOT=docs/integration/evidence; Phase4 evidence root points to integration/evidence/owner. Historical Phase5/6 artifacts stay unchanged.
- Initial runs reference f172cd9 plus recorded working changes. Later source commit and exact working/product hashes must be bound by final run registry; a changed commit number alone is not a new test result.

## Observed gates so far

| Gate | Fresh candidate evidence | Result / scope |
| --- | --- | --- |
| Clean-main web baseline | main-web-baseline.log |366/366,81files; before integration|
| Candidate web initial | candidate-web-final.log |795/795,128files|
| Candidate web after review fixes | candidate-web-qualified.log |798/798,128files|
| Shared packages | candidate-packages.log; contracts-final.log |content-format135; contracts125 after optional-field regression fix|
| Lint | candidate-lint-green.log; full-lint.log |One imported unused declaration removed; recursive lint then passed. No unrelated cleanup|
| Types | candidate-web-types.log; candidate-api-types.log |Initial candidate passed; final source recheck recorded separately|
| i18n | i18n-qualified.log |38namespaces,2478paired keys,2218static uses,0errors;521candidate unused keys remain|
| Production web | candidate-build-final.log |Pass after draft/reflow fixes;48page routes, all34LGpages retained. Route existence/token inheritance does not certify14added routes as fully redesigned|
| Mandate | mandate-final.log |Active registry valid,count2; historical duplicate/stale records excluded from active indexing, approvals not rewritten|
| Cross/native initial | cross-native-console.log; evidence/cross-native |24pass/1fail: WebKit cancelled-prefetch errors during fixture navigation; four actual native200% zoom tests passed|
| WebKit replacement | webkit-settled-console.log; evidence/webkit-settled |7/7 after finishing previous page prefetch before destroying context; errors not suppressed|
| Real legacy API/browser | live/live-legacy.json/log |8/9 initial; English title checked immediately after profile locale switch retained prior server title|
| Real admin replacement | live/live-admin-locale.json/log |3/3 after explicit reload of persisted English preference; publishing/version isolation included|
| Real V3 desktop/mobile | live/live-v3.json/log |8/8: browser audio capture/playback/teacher review, strict one-play/expiry,90/120/150 topic sessions, hub/introduction/history and Intermediate isolation|

## Failed probes and remediation

1. First full API run lacked import-time application configuration in the new runner.54files failed,7tests failed,959passed,210skipped,51errors. Most HTTP hooks failed before execution; no skipped result counted as pass. Fixed runner-only DATABASE_URL/data directory setup; auth diagnostic6/6 passed. API replacement qualification is separate.
2. Two historical migration tests used current Prisma's returning projection, which referenced future Lesson.topicGroupId on an intentionally old schema. Explicit id selection preserves the historical test boundary. Current-schema deploy and real migrations succeeded independently.
3. PowerShell wraps the backup rejection text between “the” and “manifest”. Assertion now allows whitespace; protection still requires nonzero exit and the precise rejection message. Backup rehearsal repeatedly hit20s before completing its45s-bounded migration and60s-bounded PowerShell subprocess. The outer budget is corrected to120s so teardown cannot race an unfinished setup; all checksum/data/restore assertions and child timeouts remain. The old interrupted setup caused the dependent restore artifact assertion to fail. A fresh complete replacement run is required; this is test orchestration, not a backup-product fix or a bypass of safety checks.
4. Topic JSON repair incorrectly required optional spokenText/speechReview keys. New regression watched RED, minimal required-key fix, contracts125 and API repair6 GREEN. Required content and content-preserving repair validation remain mandatory; no live provider used.
5. Owner fixtures expected old JSON textareas for Band/mock, old visible weekly controls, and immediately visible transcripts. Updated to approved structured editors, actual weekly tab and six complete-listen script gate; preserve payload/revision/draft/playback assertions.
6. Earlier owner probes were stopped after repeated stale-selector failures. A same-default-outputDir probe, refused on an occupied port, also removed its own concurrent trace files and caused an ENOENT diagnostic. This was a harness mistake; subsequent browser invocations use unique output paths and run sequentially. No original/user files affected. Aborted/failed runs remain evidence, never accepted.
7. New curriculum controls caused actual566px page scroll at320px/CSS zoom2: search wrapper min-width240px and nowrap tab/toolbar constraints. Scoped shrink/wrap fixes, no overflow hiding. Existing authoring reflow and a new dedicated narrow-search/focus test verify the final state.
8. Independent reviewer confirmed two unsaved-data-loss paths. Stable Foundation editor lifetime and dedicated IELTS exit lock watched RED→GREEN;23targeted tests, followed by798full frontend tests. Ordinary save remains editable and newer-writing/lost-response test passes. Review and limitations: independent-review.md.

## Limits retained

- Browser automation and opaque text contrast sampling are not total WCAG2.2 certification; physical screen readers/devices and live commercial providers remain manual gates.
- Firefox dynamic prefers-contrast emulator limitation is recorded by existing suite; static preference reload is not counted as a dynamic transition pass.
- Next “destination stream closed early” diagnostics appear in actual optimized E2E; retained logs distinguish them from assertions. They are not proven integration regressions or silently suppressed.
- Invalid imported jumpHighlightAnim/:has-text CSS is a deferred reviewer minor; animation/decorative targeting limitation, not data behavior. No claim of warning-free build or exhaustive visual audit.
- Complete inherited backend/security/deployment packaging was not independently audited. Scoped secret scan cannot certify all secrets. Private backup remains outside Git.

## Closing results and unresolved issue

- Full owned-DB backend run `backend-qualified`:221files =218passed,2failed,1skipped;1176tests =1172passed,3failed,1skipped;729.70s. Runner exit1,container cleanup confirmed. There were no import-time configuration errors in this replacement run.
- Failures: backup checksum/data rehearsal hit its previously loaded20sbudget; dependent restore file assertion then failed; placement isolation at `placement-isolation.integration.spec.ts:61` expected immediate speaking-job claim but `runOnce()` returnedfalse. These are retained as failures, not added to passing totals.
- Focused `backend-rehearsals`:13/13,3files,48.99s,exit0,container cleanup confirmed. Backup uses corrected120souter budget and verifies actual dump/checksum/restore data; placement2/2 and IELTS study isolation1/1 pass. This establishes a working focused path, **not** a clean full run or explained placement intermittency. No further production scheduler/clock change or relaxed assertion was made.
- The single pre-existing skipped case is `ielts-flow-v3-release.integration.spec.ts`; it checks for explicitly prepared Windows speech at `ieltsContentRoot/.prepared/mock-part-1.wav`, absent from this clean candidate. Actual-byte release qualification was not run and is not counted as passing. Preparing original media/release fixtures is a separate qualification need, not permission to use live data.
- Final production owner suite107/107; final Chromium/Firefox/WebKit/native25/25. All144representative route/theme/size cells and16native zoom cells pass; two new narrow-curriculum/Foundation tests are included in107. Artifact JSON/logs distinguish runtime SHA and test-source hashes.
- Repeated lab18observations:CLS max0.018957345971563982,LCP max536ms,event-latency sample max56ms. This is a controlled observation, not a field metric guarantee or comparison to an equivalent pre-redesign baseline.
- Recursive types and six utility groups all exit0. New API test files also pass targeted ESLint. Original1295source files,2978backup files,index/status/binary diffs/modes/main and LGHEAD/status compare PASS in the fresh final preservation run.
- User-interrupted `backend-final` and `cross-qualified` attempts lack final summaries/runner metadata. They are incomplete, not accepted passes; later complete runs above are distinct. No fixture result replaces actual API/provider/hardware qualification.

Blocker classification: **unresolved backend qualification failure, product/environment cause unproven**. Not a Git merge conflict, missing DB, demonstrated source-loss incident or established auth/scoring defect. Immediate queue availability may need investigation, but host/PostgreSQL clock sampling did not prove skew. A separate evidence-based diagnosis is required before changes to inherited scheduling or acceptance. Keep readiness RED and do not merge. Exact final-source critical real-E2E rerun also remains part of eventual acceptance; current real legacy/V3 passing records precede the final UI draft-lock fixes.

All ephemeral containers from completed owned-DB runners were stopped by their owner-checked cleanup. No production/original database, configuration or source was modified. The old failed assertions are not waived. See candidate-readiness.md and merge-handoff.md; no deployment/main merge is authorized by this document.
