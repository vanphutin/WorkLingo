# Beginner R1.2b synthetic browser qualification

MND-20261030-003 / WL-R12B-BROWSER-COST-001. Classification: **SYNTHETIC_BROWSER_TESTING**. This report records actual browser actions on the real WorkLingo frontend with a loopback synthetic API and MOCK_PROVIDER. It does not certify production authentication, database persistence, real AI scoring, phonetics, learnability or human Gate C.

## Environment and isolation

Frontend source is the immutable a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c snapshot, equivalent to current frontend because this successor changes no frontend product files. Next16.3.8 dev/webpack runs on127.0.0.1:33310; synthetic API runs on127.0.0.1:33311. Supervisor copies only tracked frontend/package/config sources, excludes.env, uses allowlisted child environment, verifies Git blob hashes and exact dependency junction targets, and permits only the exact generated Next dev declaration transformation. All application source remains bound to that revision.

Actual8sources: MG01-L1 through MG01-L4, MG02-L1 through MG02-L4. The harness uses the existing parser, draft snapshot,45-minute planner and learner projection. Source hashes and individual persona scripts/results are in the companion JSON artifacts.24session namespaces are isolated; harmless SIMULATION_ONLY cookies represent synthetic authentication. Session/draft/attempt/progress state is memory-only; reload durability here is browser-to-test-server state, not database durability. Unknown routes fail closed; no upstream fallback exists. No real account/role, learner record, credential,.env, database or external provider was used.

## Browser method

All UI operations used CUA in the selected Edge browser: visible radio selections, Continue buttons, native audio controls, Record/Stop, consent, multipart upload, Writing textbox, autosave, reload, completion and dashboard. DOM/AX observations were captured before adaptive actions. Actual hash-bound24WAV assets were requested and playback initiated through72audio activity instances per full round;72successful WAV responses were recorded. Of69audio states stored directly in final journey rows,20hadreadyState1 and49hadreadyState4, all paused=false with no media error; the first P03 lesson's three audio states are in the raw UI observations. This checks loading/play initiation, not complete listening or human comprehension. Transcript text stayed out of the learner projection.

Speaking used the frontend's real MediaRecorder/Blob/preview/consent/upload path with a tab-local WebAudio440Hz synthetic stream. The browser's supported rawCDP Runtime.evaluate supplied this test media fixture instead of a physical microphone; Page.addScript was unsupported. No person was recorded. This browser API fixture is a deliberate test modification and disappears with the ephemeral test tab. Tone data does not contain semantic speech; STT, pronunciation and speaking assessment remain unverified. Speaking/writing feedback is clearly labelled MOCK_PROVIDER. Reading/listening mock scores use canonical answer keys; distractors in persona scripts exercise incorrect submissions but cannot prove real evaluator quality.

P01 uses guidance and deliberate distractors; P02 uses contractions and application distractors; P03 uses transfer cards, punctuation variants, keyboard submission and checkpoint reload. These are independent scripted profiles, not cognitive models or actual learners. A first complete24-journey round exposed no product UI blocker. Independent review then corrected recording retry identity, cumulative persona progress, Gate C recovery/denominators and snapshot attestation; a second complete24-journey regression against the final harness is recorded in browser-results.json.

## Verified behavior and limitations

- Empty objective responses disable Continue; valid choices submit and advance checkpoints. Deliberate wrong answers still advance, with mock objective scoring from actual keys.
- Pause disables answer controls; resume restores them. P01 draft text survived reload in all8initial-round lessons. P03 final-round checkpoint and writing draft survived reload; Enter submitted writing.
- Recorder preview appears; upload stays disabled before consent. Re-record clears consent and requires another check. Same audio/client retry returns the original result; changed audio with the same length is rejected by SHA256 identity, verified through real loopback multipart regression tests.
- Every final persona dashboard accumulates64activities,64attempts and8completed sessions. Other persona totals remain isolated. A cross-persona session URL is denied403 and renders a permission error; Retry remains denied.
- P02 final round uses390×844 override for all8lessons (375CSSpx content width due scrollbar). No horizontal overflow was observed. Continue measured244×50.875CSSpx. Desktop content widths1335/1350 were also checked. Viewport is reset after testing. The initial round lost a tab attachment and its viewport override; its measured widths are retained honestly, not labelled all-mobile.
- Four-word writing remained submittable while the page displayed a six-word goal. Current isActivityComplete checks nonempty text; minimum is a displayed writing goal. No acceptance threshold or rubric was changed, and no short response was passed off as meeting the goal. Human usability review should assess this feedback expectation.
- The native audio element's DOM fallback text says the browser does not support playback even though actual native controls/playback worked. This is fallback markup, not an observed playback failure.
- Framework server-side preference lookups do not carry synthetic namespace cookies and log expected401s; client synthetic authentication succeeds. This is an explicit simulation boundary. There is no real-login/backend-auth qualification claim.

## Evidence and verification

`beginner-r12b-synthetic-personas.json` records profiles, scenarios, exact source hashes and per-persona scripts/results. `beginner-r12b-browser-results.json` records initial and final rounds separately, actual wall timestamps, viewport measurements and checks. Times are automation wall time, include tool/environment latency, and must never be treated as35–50minute human active-learning observations.

Raw UI observations, API events, manifest, service logs and screenshots remain in the named synthetic temp namespace: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/`. No cookie/token/header data is exported. A screenshot attempt sometimes timed out; only successfully saved and visually checked artifacts are cited. The completion and mobile screenshots show the real rendered UI and explicit mock feedback.

Technical checks: final combined Node106/106; safe API375/375; Web936/936; API typecheck/lint/build exit0. Independent review found fourP2s, all corrected with regressions; final review has no outstanding Critical/Important/P2. No frontend source changed, so the previously successful sanitized webpack/Turbopack production builds remain historical evidence; this mission ran actual Next dev frontend. Rootverify/defaultAPIintegration/DBE2E were not run because they load unauthorized env/DB paths.

## Release status

Synthetic browser workflow is engineering evidence only. Real provider starts0; human oracle0/128; professional QA0/82; actual Gate C0/24 with0adults; exact endpoint retention/logging/training/deletion, authenticated pricing/reservation, actual power-loss/currentDBintegration/deploytarget/rehearsedrollback remain unresolved. Provider is BLOCKED_BY_BUDGET; Gate C NEEDS_HUMAN_EVIDENCE; release NOT_READY. No merge,push,deploy or readiness promotion.

## Closure ledger

Final counts, hashes, screenshot paths, commit inventory and register closure are reconciled below after the final browser round. The initial round and rerun are not added as distinct learners or independent Gate C evidence.

Final reconciliation: **24/24 unique final journeys PASS**, P01/P02/P03 each8/8; **192 submitted activities** =168 normal attempts +24recordings;72WAV reads;425recorded UI/AX observations;0captured console errors. All8finalP02journeys measured375CSSpx withscrollWidth375. Final API event statuses:1133×200,25×302,54×401(preference lookup boundary),3×403(deliberate cross-persona denial). Initial round24/24is retained separately. Median automation wall time is about19seconds per lesson; this has no human learning-time meaning.

|Persona|Lesson|Final UI|Wall seconds|Content width|
|---|---|---|---:|---:|
|P01|MG01-L1|PASS|30.535|1335|
|P01|MG01-L2|PASS|20.100|1335|
|P01|MG01-L3|PASS|20.309|1335|
|P01|MG01-L4|PASS|20.787|1335|
|P01|MG02-L1|PASS|18.955|1335|
|P01|MG02-L2|PASS|17.860|1335|
|P01|MG02-L3|PASS|18.080|1335|
|P01|MG02-L4|PASS|18.975|1335|
|P02|MG01-L1|PASS|19.554|375|
|P02|MG01-L2|PASS|19.341|375|
|P02|MG01-L3|PASS|22.034|375|
|P02|MG01-L4|PASS|18.967|375|
|P02|MG02-L1|PASS|18.824|375|
|P02|MG02-L2|PASS|18.765|375|
|P02|MG02-L3|PASS|18.923|375|
|P02|MG02-L4|PASS|18.792|375|
|P03|MG01-L1|PASS|37.735|1350|
|P03|MG01-L2|PASS|18.208|1350|
|P03|MG01-L3|PASS|19.003|1350|
|P03|MG01-L4|PASS|17.817|1350|
|P03|MG02-L1|PASS|18.906|1350|
|P03|MG02-L2|PASS|18.712|1350|
|P03|MG02-L3|PASS|19.084|1350|
|P03|MG02-L4|PASS|18.826|1350|

Artifacts (raw evidence outside Git, exact SHA256 bound in browser-results.json):

- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/harness/final-events.json — af38599464bbba3e641685231104c50d1435911d8368bd1d580728c2e68f59b3
- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/harness/ui-observations.json — ca8525255d01c9185293514535704f53d812e8cd828c465cfe6c5dcfcdae7121
- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/screenshots/completed.png — 6e8441fda81181d96d551278bbe3ee10afa3ec6b6a300cdc00a7cf37a3ee2519
- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/screenshots/P02-mobile.png — a064e573e739cf84ab354af24925a2509358b9457d1125e146e7a12a29ce0dab
- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/screenshots/P01-desktop.png — c098c92424eb90602bf6422bc4147aefa1a749460054fa3fe51a09a0375545d4
- C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/screenshots/P03-transfer.png — 2a838387a9bc18c1f3e6f61f46226d8f1ac034402c5c15c86d3d5f041e47a091

Local commit inventory:6b4ec54 authority/plan;2c975f8 Discovery compaction/benchmark;da703ac Gate C tooling;7188c8b browser simulation/supervisor/governance/review. Final evidence/format cleanup and CLI verification closure are recorded by subsequent local commits (self-relative row: this report commit). No history rewrite or remote action.

SKILL AUDIT
Used: mandate-steward -> finite successor/history/CLI; brainstorming and writing-plans -> explicit method and concrete scoped plan under owner autonomy; dispatching-parallel-agents -> disjoint code tasks; TDD/systematic-debugging -> reproduced behavior and RED/GREEN fixes; computer-use -> actual browser; ui-ux-pro-max -> targeted mobile/touch search and measurements; code-review-and-quality/requesting-code-review -> independent five-axis review and killed mutation; Git/verification-before-completion -> exact staging/fresh checks.
Verification:1417distinct safe tests (106Node+375API+936Web), finalAPIlint/typecheck/buildPASS,24/24finalbrowserjourneys,mandate27valid and scopepreservationPASS.
Not used: frontend redesign/React optimization/NestJS/database skills because no productUI,Nestmodule,query/schema or dependency changes; quota optimizer concerns Codex usage, not the Discovery billing optimization. Default fullverify/DBE2E excluded by explicit noenv/noDB scope.

Runtime closure: final test tab closed, temporary viewport reset, and owned loopback services stopped. Neither33310nor33311had a listening process in the final check. Synthetic source/log/screenshot artifacts are retained for inspection; no human data or live-provider reservation was created. CLI successor verification applies only to this bounded engineering scope; historical qualification mandates and release status remain unchanged.
